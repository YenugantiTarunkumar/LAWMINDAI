import { afterEach, describe, expect, it } from 'vitest';
import {
  InvalidReviewOutputError,
  parseReviewOutput,
} from '../src/lib/ai/parser';
import { reviewOutputSchema } from '../src/lib/ai/review-output-schema';
import { summarizeReviewFindings } from '../src/lib/ai/review-findings';
import { hasUnsupportedRecommendationTerm } from '../src/lib/ai/review-recommendations';
import { parseChatResponse } from '../src/lib/chat/response-parser';
import type { DocumentPassage } from '../src/lib/chat/retrieval';
import {
  classifyLegalQuestion,
  retrieveLegalPassages,
} from '../src/lib/legal-assistant/knowledge-base';
import { GEMINI_MODEL, getModel, isGeminiConfigured } from '../src/lib/ai/provider';

const passages: DocumentPassage[] = [
  {
    id: 'passage-1',
    text: '[Page 2]\nThe customer shall pay the invoice within 30 days.',
    clause: 'Payment',
    pageNumber: 2,
  },
];

function makeReviewOutput() {
  return {
    executiveSummary: 'A contract with one high-risk payment clause.',
    overallRiskLevel: 'low',
    clauses: [
      {
        clauseTitle: 'Payment',
        originalText: 'The customer shall pay the invoice within 30 days.',
        riskLevel: 'high',
        issue: 'The payment condition is unclear.',
        whyItMatters: 'The parties may disagree about when payment is due.',
        potentialConsequences: 'Payment disputes may arise.',
        recommendedAction: 'Clarify the payment trigger.',
        proposedRevision: 'The customer shall pay within 30 days of invoice receipt.',
        reasoning: 'The trigger should be explicit.',
        legalReferences: [
          {
            actName: 'Unverified Model Act',
            section: '999',
            relevance: 'Candidate reference only.',
          },
        ],
        evidenceLimitations: '',
        confidence: 0.8,
        pageNumbers: [],
      },
    ],
    draftingQualityScore: 7,
    draftingQualityBreakdown: {
      clarity: 8,
      completeness: 6,
      consistency: 7,
      riskAllocation: 7,
      operationalPrecision: 6,
      disputeResolution: 7,
      draftingStructure: 8,
    },
    draftingQualityNotes: '',
    recommendations: [],
    contractStrengths: [],
    missingClauses: [],
    ambiguousProvisions: [],
    legalReferences: [],
    limitations: [],
  };
}

describe('AI response and legal reference validation', () => {
  it('accepts the exact contract review response schema and rejects missing or extra fields', () => {
    const output = makeReviewOutput();

    expect(reviewOutputSchema.safeParse(output).success).toBe(true);
    expect(
      reviewOutputSchema.safeParse({
        ...output,
        unexpectedField: 'not part of the review schema',
      }).success,
    ).toBe(false);
    expect(
      reviewOutputSchema.safeParse({
        ...output,
        clauses: [{ ...output.clauses[0], riskLevel: 'critical' }],
      }).success,
    ).toBe(false);
  });

  it('reports malformed review output as a validation error, not a generic exception', () => {
    expect(() => parseReviewOutput('{"clauses":[]}')).toThrow(
      InvalidReviewOutputError,
    );
    expect(() => parseReviewOutput('{"clauses":[]}')).toThrow(
      /could not be validated against the agreement/,
    );
  });

  it('derives overall risk from clause risks and removes unsupported authorities', () => {
    const output = makeReviewOutput();
    output.draftingQualityScore = 10;
    const result = parseReviewOutput(JSON.stringify(output), {
      sourceText: 'The customer shall pay the invoice within 30 days.',
    });

    expect(result.overallRiskLevel).toBe('high');
    expect(result.clauses[0].legalReferences).toEqual([]);
    expect(
      (result.limitations ?? []).some((limitation) =>
        limitation.includes('not on the allowlist'),
      ),
    ).toBe(true);
    expect(result.draftingQualityScore).toBe(7);
    expect(result.limitations).toContain(
      'The drafting-quality score is a heuristic based on seven equally weighted drafting dimensions, not an objective legal-validity or enforceability score.',
    );
  });

  it('deduplicates evidence and derives risk counts from the canonical findings', () => {
    const output = makeReviewOutput();
    const duplicate = {
      ...output.clauses[0],
      clauseTitle: 'Invoice payment',
      riskLevel: 'medium',
    };
    const lowRisk = {
      ...output.clauses[0],
      clauseTitle: 'Invoice timing',
      originalText: 'Invoices are delivered by email.',
      riskLevel: 'low',
      legalReferences: [],
    };
    const result = parseReviewOutput(
      JSON.stringify({
        ...output,
        clauses: [...output.clauses, duplicate, lowRisk],
      }),
      {
        sourceText:
          'The customer shall pay the invoice within 30 days. Invoices are delivered by email.',
      },
    );
    const summary = summarizeReviewFindings(result);

    expect(result.clauses).toHaveLength(2);
    expect(summary.analyzedClauseCount).toBe(2);
    expect(summary.riskyClauseCount).toBe(1);
    expect(summary.highRisk).toBe(1);
    expect(summary.mediumRisk).toBe(0);
    expect(summary.lowRisk).toBe(1);
    expect(result.clauses[0].riskLevel).toBe('high');
    expect(result.clauses[1].findingType).toBe('informational');
  });

  it('keeps missing provisions separate and documents that they were not identified', () => {
    const output = makeReviewOutput();
    const result = parseReviewOutput(
      JSON.stringify({
        ...output,
        missingClauses: [
          {
            clauseTitle: 'Intellectual property',
            riskLevel: 'medium',
            whyItMatters: 'Ownership and licence scope can affect reuse.',
            potentialConsequences: 'The parties may disagree about usage rights.',
            recommendedAction: 'Ask which party owns each deliverable.',
            proposedWording: '[Specify ownership and licence terms].',
            legalReferences: [],
            evidenceLimitations: 'Not identified in the document.',
          },
          {
            clauseTitle: 'Intellectual property',
            riskLevel: 'low',
            whyItMatters: 'Duplicate finding.',
            potentialConsequences: 'Duplicate finding.',
            recommendedAction: 'Ask the parties.',
            proposedWording: '[Specify ownership and licence terms].',
            legalReferences: [],
            evidenceLimitations: '',
          },
        ],
      }),
      { sourceText: 'The customer shall pay the invoice within 30 days.' },
    );
    const summary = summarizeReviewFindings(result);

    expect(result.clauses).toHaveLength(1);
    expect(result.missingClauses).toHaveLength(1);
    expect(summary.riskyClauseCount).toBe(1);
    expect(summary.missingClauseCount).toBe(1);
    expect(result.missingClauses?.[0].evidenceLimitations).toContain(
      'not, by itself, a conclusion that the agreement is invalid or unlawful',
    );
  });

  it('keeps ambiguous provisions separate and checks their exact supporting text', () => {
    const output = makeReviewOutput();
    const result = parseReviewOutput(
      JSON.stringify({
        ...output,
        ambiguousProvisions: [
          {
            clauseTitle: 'Payment',
            originalText: 'The customer shall pay the invoice within 30 days.',
            ambiguity: 'The event starting the 30-day period is unclear.',
            possibleInterpretations: ['Invoice date', 'Invoice receipt'],
            riskLevel: 'medium',
            pageNumbers: [],
          },
        ],
      }),
      { sourceText: 'The customer shall pay the invoice within 30 days.' },
    );
    const summary = summarizeReviewFindings(result);

    expect(result.ambiguousProvisions).toHaveLength(0);
    expect(result.clauses[0].ambiguity).toContain(
      'event starting the 30-day period is unclear',
    );
    expect(summary.ambiguousProvisionCount).toBe(1);
    expect(summary.insufficientAmbiguousProvisionCount).toBe(0);
    expect(summary.insufficientEvidenceCount).toBe(0);
    expect(summary.mediumRisk).toBe(0);
  });

  it('does not count unsupported ambiguous evidence as confirmed or duplicate an observation', () => {
    const output = makeReviewOutput();
    const result = parseReviewOutput(
      JSON.stringify({
        ...output,
        ambiguousProvisions: [
          {
            clauseTitle: 'Payment',
            originalText: 'The client must pay within 10 days.',
            ambiguity: 'The start of the period is unclear.',
            possibleInterpretations: ['Invoice date', 'Invoice receipt'],
            riskLevel: 'medium',
            pageNumbers: [],
          },
        ],
      }),
      { sourceText: 'The customer shall pay the invoice within 30 days.' },
    );
    const summary = summarizeReviewFindings(result);

    expect(summary.ambiguousProvisionCount).toBe(0);
    expect(summary.insufficientAmbiguousProvisionCount).toBe(1);
    expect(summary.insufficientEvidenceCount).toBe(1);
  });

  it('marks fabricated quotations insufficiently supported instead of confirming the finding', () => {
    const output = makeReviewOutput();
    const unsupported = {
      ...output.clauses[0],
      originalText: 'The client owns all source code and deliverables.',
      riskLevel: 'high',
    };
    const result = parseReviewOutput(
      JSON.stringify({ ...output, clauses: [unsupported] }),
      { sourceText: 'The customer shall pay the invoice within 30 days.' },
    );
    const summary = summarizeReviewFindings(result);

    expect(result.clauses[0].findingType).toBe('insufficient-evidence');
    expect(result.clauses[0].originalText).toBe('');
    expect(summary.riskyClauseCount).toBe(0);
    expect(summary.insufficientEvidenceCount).toBe(1);
  });

  it('replaces unsupported forum locations, interest benchmarks, rates, and periods', () => {
    expect(
      hasUnsupportedRecommendationTerm(
        'Customer shall pay 18% interest and disputes shall be heard in Chennai.',
        'The customer shall pay the invoice within 30 days.',
      ),
    ).toBe(true);
    const output = makeReviewOutput();
    const clause = {
      ...output.clauses[0],
      recommendedAction:
        'Use exclusive jurisdiction of courts located in Chennai and 18% interest for 30 days.',
      proposedRevision:
        'Customer shall pay 18% interest and disputes shall be heard in Chennai.',
    };
    const result = parseReviewOutput(
      JSON.stringify({
        ...output,
        clauses: [clause],
        recommendations: [
          'Set the RBI base rate plus margin and choose Chennai as exclusive jurisdiction.',
        ],
      }),
      { sourceText: 'The customer shall pay the invoice within 30 days.' },
    );

    expect(result.clauses[0].recommendedAction).not.toMatch(
      /Chennai|18%|30 days/i,
    );
    expect(result.clauses[0].proposedRevision).toBe('');
    expect(result.recommendations[0]).not.toMatch(
      /Chennai|base rate|margin/i,
    );
    expect(result.limitations).toContain(
      'One or more generated drafting suggestions containing unsupported values, interest benchmarks, or forum locations were replaced with a request for the parties to confirm those terms.',
    );
  });

  it('accepts only exact evidence quotations from retrieved document passages', () => {
    const response = parseChatResponse(
      JSON.stringify({
        answer: 'Payment is due within 30 days.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'The customer shall pay the invoice within 30 days.',
          },
        ],
      }),
      passages,
    );

    expect(response?.evidence[0]).toMatchObject({
      clause: 'Payment',
      pageNumber: 2,
    });
    expect(
      parseChatResponse(
        JSON.stringify({
          answer: 'Payment is due within 30 days.',
          answerType: 'document',
          documentCoverage: 'supported',
          evidence: [
            { passageId: 'passage-1', quote: 'Payment is due within 10 days.' },
          ],
        }),
        passages,
      ),
    ).toBeNull();
  });

  it('marks Indian-law candidate references as unverified', () => {
    const classification = classifyLegalQuestion('breach of contract damages');
    const references = retrieveLegalPassages(
      'breach of contract damages',
      classification.domains,
    );

    expect(classification.coverage).toBe('limited');
    expect(references.length).toBeGreaterThan(0);
    expect(references.every(({ source }) => source.sourceStatus === 'not-live-verified')).toBe(true);
  });
});

describe('Gemini configuration', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalGeminiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
  });

  it('reports unavailable Gemini configuration without making a network request', () => {
    delete process.env.GEMINI_API_KEY;

    expect(isGeminiConfigured()).toBe(false);
    expect(() => getModel()).toThrow('GEMINI_API_KEY is not configured');
  });

  it('uses the single centrally configured Gemini model', () => {
    process.env.GEMINI_API_KEY = 'unit-test-key';

    expect(isGeminiConfigured()).toBe(true);
    expect(getModel().modelId).toBe(GEMINI_MODEL);
    expect(GEMINI_MODEL).toBe('gemini-3.1-flash-lite');
  });
});
