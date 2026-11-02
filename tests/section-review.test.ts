import { describe, expect, it, vi } from 'vitest';
import {
  splitAgreementIntoSections,
  SECTION_SPLIT_THRESHOLD,
} from '../src/lib/ai/section-splitter';
import { SectionReviewError } from '../src/lib/ai/section-review';
import {
  logSafeDiagnostic,
  extractValidationDetails,
} from '../src/lib/ai/diagnostic-logger';
import { reviewOutputSchema } from '../src/lib/ai/review-output-schema';
import { parseReviewOutput } from '../src/lib/ai/parser';

describe('Section Splitter', () => {
  it('returns a single section for documents below the threshold', () => {
    const text = 'Short contract. The customer will pay within 30 days.';
    const sections = splitAgreementIntoSections(text, SECTION_SPLIT_THRESHOLD);

    expect(sections).toHaveLength(1);
    expect(sections[0].index).toBe(0);
    expect(sections[0].total).toBe(1);
    expect(sections[0].text).toBe(text);
  });

  it('splits long documents along clause/section boundaries', () => {
    const clauses: string[] = [];
    for (let i = 1; i <= 35; i++) {
      clauses.push(
        `Clause ${i}. Payment and Obligations for Tier ${i}\n` +
          `The customer shall pay ${i * 1000} INR within 30 days of invoice date. ` +
          `Late payments accrue interest at 1.5% per month. ` +
          `Provider liability is capped at fees paid in the prior month. ` +
          `Customer shall indemnify Provider against all third party claims.`,
      );
    }
    const fullText = clauses.join('\n\n');
    expect(fullText.length).toBeGreaterThan(SECTION_SPLIT_THRESHOLD);

    const sections = splitAgreementIntoSections(fullText, 3_000);

    expect(sections.length).toBeGreaterThan(1);
    // Every section has correct indexing and total
    for (const section of sections) {
      expect(section.total).toBe(sections.length);
      expect(section.characterCount).toBe(section.text.length);
      expect(section.text.length).toBeGreaterThan(0);
      expect(section.title).toBeTruthy();
    }

    // Verify no content was lost: all clause titles must appear in the section texts
    for (let i = 1; i <= 35; i++) {
      const title = `Clause ${i}. Payment and Obligations for Tier ${i}`;
      const found = sections.some((s) => s.text.includes(title));
      expect(found).toBe(true);
    }
  });

  it('handles documents with PDF page markers', () => {
    const pages = [
      '[Page 1]\nMASTER SERVICES AGREEMENT\n1. SCOPE: Vendor will provide services.\n'.repeat(40),
      '[Page 2]\n2. PAYMENT: Customer will pay invoices within 45 days.\n'.repeat(40),
      '[Page 3]\n3. LIABILITY: Vendor liability is capped at 100 USD.\n'.repeat(40),
    ];
    const fullText = pages.join('\n\n');
    const sections = splitAgreementIntoSections(fullText, 3_000);

    expect(sections.length).toBeGreaterThan(1);
    expect(sections.some((s) => s.text.includes('[Page 1]'))).toBe(true);
    expect(sections.some((s) => s.text.includes('[Page 2]'))).toBe(true);
    expect(sections.some((s) => s.text.includes('[Page 3]'))).toBe(true);
  });

  it('formats SectionReviewError with clear section progress and reason', () => {
    const error = new SectionReviewError(1, 4, 'Output cut off by token limit');
    expect(error.message).toContain('section 2 of 4 failed to process');
    expect(error.message).toContain('Output cut off by token limit');
    expect(error.sectionIndex).toBe(1);
    expect(error.totalSections).toBe(4);
  });
});

describe('Diagnostic Logger', () => {
  it('strips API keys and raw contract text from diagnostic logs', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logSafeDiagnostic({
      event: 'test_event',
      errorType: 'TestError',
      errorMessage: 'Something went wrong',
      tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      // Intentional sensitive fields that must be scrubbed:
      ...({
        apiKey: 'secret-api-key-12345',
        cookie: 'session=supersecret',
        content: 'Entire untrusted contract text',
      } as Record<string, unknown>),
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const loggedJson = consoleSpy.mock.calls[0][1];
    const parsed = JSON.parse(loggedJson);

    expect(parsed.event).toBe('test_event');
    expect(parsed.tokenUsage.totalTokens).toBe(150);
    expect(parsed.apiKey).toBeUndefined();
    expect(parsed.cookie).toBeUndefined();
    expect(parsed.content).toBeUndefined();

    consoleSpy.mockRestore();
  });

  it('extracts validation issue paths from errors', () => {
    const mockZodError = {
      issues: [
        { path: ['clauses', 0, 'confidence'], message: 'Expected number', code: 'invalid_type' },
      ],
    };

    const details = extractValidationDetails(mockZodError);
    expect(details).toEqual([
      { path: 'clauses.0.confidence', message: 'Expected number', code: 'invalid_type' },
    ]);
  });
});

describe('Zod Schema & Parser Safeguards for DOCX / Long agreements', () => {
  it('normalizes percentage confidence (e.g. 85 -> 0.85)', () => {
    const baseOutput = {
      executiveSummary: 'Review summary',
      overallRiskLevel: 'high',
      clauses: [
        {
          clauseTitle: 'Payment',
          originalText: 'Pay in 30 days',
          riskLevel: 'medium',
          issue: 'Late fee issue',
          whyItMatters: 'Cash flow impact',
          potentialConsequences: 'Disputes',
          recommendedAction: 'Clarify terms',
          proposedRevision: '',
          reasoning: 'Standard commercial practice',
          legalReferences: [],
          evidenceLimitations: '',
          confidence: 85, // LLM output 85 instead of 0.85
          pageNumbers: [],
        },
      ],
      draftingQualityScore: 8,
      draftingQualityBreakdown: {
        clarity: 8,
        completeness: 8,
        consistency: 8,
        riskAllocation: 8,
        operationalPrecision: 8,
        disputeResolution: 8,
        draftingStructure: 8,
      },
      draftingQualityNotes: 'Good drafting',
      recommendations: ['Clarify payment'],
      contractStrengths: ['Clear timeline'],
      missingClauses: [],
      ambiguousProvisions: [],
      legalReferences: [],
      limitations: ['General review'],
    };

    const parsed = reviewOutputSchema.parse(baseOutput);
    expect(parsed.clauses[0].confidence).toBe(0.85);
  });

  it('handles empty originalText in ambiguous provisions without failing schema', () => {
    const baseOutput = {
      executiveSummary: 'Review summary',
      overallRiskLevel: 'low',
      clauses: [],
      draftingQualityScore: 7,
      draftingQualityBreakdown: {
        clarity: 7,
        completeness: 7,
        consistency: 7,
        riskAllocation: 7,
        operationalPrecision: 7,
        disputeResolution: 7,
        draftingStructure: 7,
      },
      draftingQualityNotes: 'Notes',
      recommendations: [],
      contractStrengths: [],
      missingClauses: [],
      ambiguousProvisions: [
        {
          clauseTitle: 'General Ambiguity',
          originalText: '', // Empty original text
          ambiguity: 'Scope of deliverables is not clearly bounded.',
          possibleInterpretations: ['Interpretation A', 'Interpretation B'],
          riskLevel: 'medium',
          pageNumbers: [],
        },
      ],
      legalReferences: [],
      limitations: [],
    };

    expect(reviewOutputSchema.safeParse(baseOutput).success).toBe(true);
  });

  it('normalizes page numbers for DOCX files (pageCount == null) without throwing error', () => {
    const output = {
      executiveSummary: 'DOCX agreement review',
      overallRiskLevel: 'medium',
      clauses: [
        {
          clauseTitle: 'Termination',
          originalText: 'Provider may terminate with 30 days notice.',
          riskLevel: 'medium',
          issue: 'Notice period',
          whyItMatters: 'Operational risk',
          potentialConsequences: 'Disruption',
          recommendedAction: 'Extend notice to 60 days',
          proposedRevision: '',
          reasoning: 'Standard industry notice',
          legalReferences: [],
          evidenceLimitations: '',
          confidence: 0.9,
          pageNumbers: [1], // Model returned [1] despite DOCX having no page markers
        },
      ],
      draftingQualityScore: 7,
      draftingQualityBreakdown: {
        clarity: 7,
        completeness: 7,
        consistency: 7,
        riskAllocation: 7,
        operationalPrecision: 7,
        disputeResolution: 7,
        draftingStructure: 7,
      },
      draftingQualityNotes: 'Notes',
      recommendations: [],
      contractStrengths: [],
      missingClauses: [],
      ambiguousProvisions: [],
      legalReferences: [],
      limitations: [],
    };

    // For DOCX (pageCount: null), pageNumbers should be normalized to [] rather than failing validation
    const result = parseReviewOutput(JSON.stringify(output), {
      sourceText: 'Provider may terminate with 30 days notice.',
      pageCount: null,
      mode: 'full-review',
    });

    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].pageNumbers).toEqual([]);
    expect(result.clauses[0].evidenceStatus).toBe('supported');
  });
});
