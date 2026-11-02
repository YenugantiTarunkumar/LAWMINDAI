import { generateText, NoObjectGeneratedError, Output } from 'ai';
import type { LanguageModel } from 'ai';
import { reviewOutputSchema } from './review-output-schema';
import { parseReviewOutput } from './parser';
import {
  getCanonicalClauses,
  getCanonicalMissingClauses,
} from './review-findings';
import {
  replaceUnsupportedRecommendation,
} from './review-recommendations';
import { getFullReviewPrompt } from './prompts/full-review';
import { getClauseReviewPrompt } from './prompts/clause-review';
import { getRedlinePrompt } from './prompts/redline';
import { getProvisionDrafterPrompt } from './prompts/provision-drafter';
import {
  formatUntrustedDocument,
  getContractReviewGuidance,
  INDIAN_CONTRACT_TOPICS,
} from './prompts/contract-review-guidelines';
import {
  logSafeDiagnostic,
  extractValidationDetails,
} from './diagnostic-logger';
import {
  splitAgreementIntoSections,
  type AgreementSection,
  SECTION_SPLIT_THRESHOLD,
} from './section-splitter';
import type {
  AmbiguousProvision,
  ClauseAnalysis,
  LegalReference,
  MissingClauseAnalysis,
  ReviewMode,
  ReviewResult,
  RiskLevel,
} from '@/lib/types';

export class SectionReviewError extends Error {
  constructor(
    public readonly sectionIndex: number,
    public readonly totalSections: number,
    public readonly reason: string,
    public readonly originalErrorName?: string,
  ) {
    super(
      `Review could not be completed because section ${sectionIndex + 1} of ${totalSections} failed to process: ${reason}`,
    );
    this.name = 'SectionReviewError';
  }
}

interface ReviewAgreementOptions {
  content: string;
  model: LanguageModel;
  systemPrompt: string;
  mode: ReviewMode;
  documentInfo?: ReviewResult['documentInfo'];
}

function getPromptForMode(mode: ReviewMode, content: string): string {
  switch (mode) {
    case 'full-review':
      return getFullReviewPrompt(content);
    case 'clause-by-clause':
      return getClauseReviewPrompt(content);
    case 'redline':
      return getRedlinePrompt(content);
    case 'provision-drafter':
      return getProvisionDrafterPrompt(content);
  }
}

function getSectionPrompt(section: AgreementSection, fullTextLength: number): string {
  return `You are conducting a detailed, evidence-grounded Indian commercial law review of Section ${section.index + 1} of ${section.total} of an agreement (${section.title}).

## Section Context
- Section ${section.index + 1} of ${section.total}
- Section character length: ${section.characterCount}
- Overall agreement character length: ${fullTextLength}

## Instructions
1. Review the supplied section text strictly and extract existing clauses, ambiguous provisions, and drafting strengths present in this section.
2. Quote text exactly as it appears in this section. Do not infer text that was not extracted.
3. If this section is missing vital terms that belong in this section's subject matter, list them under missingClauses.
4. Assess drafting quality for this section across the seven dimensions (1 to 10 each).
5. Follow all JSON formatting and citation constraints.

${getContractReviewGuidance()}

## Section text (untrusted)
${formatUntrustedDocument(section.text)}`;
}

/**
 * Reviews a single section with safe diagnostic logging and error handling.
 */
async function reviewSingleSection(
  section: AgreementSection,
  fullTextLength: number,
  model: LanguageModel,
  systemPrompt: string,
  mode: ReviewMode,
  pageCount?: number | null,
): Promise<ReviewResult> {
  const startTime = Date.now();
  const prompt =
    section.total === 1
      ? getPromptForMode(mode, section.text)
      : getSectionPrompt(section, fullTextLength);

  logSafeDiagnostic({
    event: 'section_review_start',
    sectionIndex: section.index,
    totalSections: section.total,
    characterCount: section.characterCount,
  });

  let rawOutput: string;
  try {
    const generation = await generateText({
      model,
      system: systemPrompt,
      prompt,
      maxOutputTokens: 16_384,
      output: Output.object({
        schema: reviewOutputSchema,
        name: 'section_contract_review',
        description: 'Evidence-grounded contract review for this section.',
      }),
      providerOptions: {
        google: { structuredOutputs: true },
      },
    });

    const durationMs = Date.now() - startTime;
    logSafeDiagnostic({
      event: 'section_review_success',
      sectionIndex: section.index,
      totalSections: section.total,
      characterCount: section.characterCount,
      finishReason: generation.finishReason,
      tokenUsage: {
        promptTokens: generation.usage.inputTokens,
        completionTokens: generation.usage.outputTokens,
        totalTokens: generation.usage.totalTokens,
      },
      durationMs,
    });

    if (generation.finishReason === 'length') {
      throw new SectionReviewError(
        section.index,
        section.total,
        'The section output reached token limits and was cut off.',
        'LengthLimitExceeded',
      );
    }

    rawOutput = JSON.stringify(generation.output);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    if (error instanceof SectionReviewError) {
      throw error;
    }

    const isIncomplete = NoObjectGeneratedError.isInstance(error);
    const finishReason = isIncomplete ? error.finishReason : undefined;
    const validationDetails = extractValidationDetails(error);
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logSafeDiagnostic({
      event: 'section_review_failure',
      sectionIndex: section.index,
      totalSections: section.total,
      characterCount: section.characterCount,
      finishReason,
      errorType,
      errorMessage,
      validationDetails,
      durationMs,
    });

    let failureReason = 'The AI service could not generate a complete structured response for this section.';
    if (isIncomplete && finishReason === 'length') {
      failureReason = 'The section was too long for one response.';
    } else if (validationDetails && validationDetails.length > 0) {
      failureReason = `Output did not match schema: ${validationDetails[0].path} (${validationDetails[0].message})`;
    } else if (error instanceof Error && error.message.includes('fetch')) {
      failureReason = 'Network connection to the AI provider failed.';
    }

    throw new SectionReviewError(section.index, section.total, failureReason, errorType);
  }

  return parseReviewOutput(rawOutput, {
    sourceText: section.text,
    pageCount,
    mode,
  });
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const norm = item.trim().toLowerCase();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      result.push(item.trim());
    }
  }
  return result;
}

function highestRisk(risks: RiskLevel[]): RiskLevel {
  if (risks.includes('high')) return 'high';
  if (risks.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Combines results from multiple sections into an integrated, evidence-backed ReviewResult.
 * Recalculates risk counts and drafting quality metrics cleanly.
 */
function combineSectionResults(
  sectionResults: ReviewResult[],
  fullContent: string,
  sections: AgreementSection[],
  documentInfo?: ReviewResult['documentInfo'],
): ReviewResult {
  const totalSections = sectionResults.length;

  // 1. Combine clauses and verify evidence against the full document
  const rawClauses: ClauseAnalysis[] = sectionResults.flatMap((r) => r.clauses);
  const canonicalClauses = getCanonicalClauses(rawClauses);

  // 2. Combine ambiguous provisions
  const rawAmbiguous: AmbiguousProvision[] = sectionResults.flatMap(
    (r) => r.ambiguousProvisions ?? [],
  );
  const uniqueAmbiguousMap = new Map<string, AmbiguousProvision>();
  for (const p of rawAmbiguous) {
    const key = p.originalText.trim()
      ? p.originalText.trim().toLowerCase()
      : `${p.clauseTitle.trim().toLowerCase()}:${p.ambiguity.trim().toLowerCase()}`;
    if (!uniqueAmbiguousMap.has(key)) {
      uniqueAmbiguousMap.set(key, p);
    }
  }
  const uniqueAmbiguous = [...uniqueAmbiguousMap.values()];

  // 3. Combine missing clauses
  const rawMissing: MissingClauseAnalysis[] = sectionResults.flatMap(
    (r) => r.missingClauses ?? [],
  );
  const canonicalMissing = getCanonicalMissingClauses(rawMissing);

  // Check if fundamental contract topics are completely missing across all sections
  const coveredTopicsLower = new Set(
    canonicalClauses.map((c) => c.clauseTitle.toLowerCase()),
  );
  for (const topic of INDIAN_CONTRACT_TOPICS) {
    const topicLower = topic.toLowerCase();
    const isCovered = [...coveredTopicsLower].some(
      (c) => c.includes(topicLower) || topicLower.includes(c),
    );
    if (!isCovered && !canonicalMissing.some((m) => m.clauseTitle.toLowerCase().includes(topicLower))) {
      // Add topic if neither present nor already flagged
      canonicalMissing.push({
        clauseTitle: topic,
        riskLevel: 'medium',
        whyItMatters: `Standard commercial agreements typically include provisions for ${topic.toLowerCase()}.`,
        potentialConsequences: `Uncertainty regarding ${topic.toLowerCase()} may lead to operational ambiguity or commercial disputes.`,
        recommendedAction: `Consider whether terms governing ${topic.toLowerCase()} should be incorporated.`,
        proposedWording: `[Draft mutually agreed terms for ${topic.toLowerCase()}]`,
        legalReferences: [],
        evidenceLimitations:
          'This provision was not identified in the extracted document; its absence is not, by itself, a conclusion that the agreement is invalid or unlawful.',
      });
    }
  }

  // 4. Combine strengths & recommendations
  const contractStrengths = dedupeStrings(
    sectionResults.flatMap((r) => r.contractStrengths ?? []),
  );
  const rawRecommendations = sectionResults.flatMap((r) => r.recommendations);
  const recommendations = dedupeStrings(
    rawRecommendations.map((rec) =>
      replaceUnsupportedRecommendation(rec, fullContent),
    ),
  );

  // 5. Combine and deduplicate legal references
  const legalRefMap = new Map<string, LegalReference>();
  for (const r of sectionResults) {
    for (const ref of r.legalReferences ?? []) {
      const key = `${ref.actName}:${ref.section}`;
      if (!legalRefMap.has(key)) {
        legalRefMap.set(key, ref);
      }
    }
  }
  const legalReferences = [...legalRefMap.values()];

  // 6. Aggregate drafting quality breakdown across sections
  const dimensions = [
    'clarity',
    'completeness',
    'consistency',
    'riskAllocation',
    'operationalPrecision',
    'disputeResolution',
    'draftingStructure',
  ] as const;

  const breakdown: NonNullable<ReviewResult['draftingQualityBreakdown']> = {
    clarity: 7,
    completeness: 7,
    consistency: 7,
    riskAllocation: 7,
    operationalPrecision: 7,
    disputeResolution: 7,
    draftingStructure: 7,
  };

  for (const dim of dimensions) {
    let sum = 0;
    let count = 0;
    for (const res of sectionResults) {
      if (res.draftingQualityBreakdown && typeof res.draftingQualityBreakdown[dim] === 'number') {
        sum += res.draftingQualityBreakdown[dim];
        count++;
      }
    }
    breakdown[dim] = count > 0 ? Math.max(1, Math.min(10, Math.round(sum / count))) : 7;
  }

  const draftingQualityScore = Math.round(
    dimensions.reduce((acc, dim) => acc + breakdown[dim], 0) / dimensions.length,
  );

  const draftingQualityNotes =
    `Composite evaluation synthesized across ${totalSections} contract sections (${sections.map((s) => s.title).join('; ')}). ` +
    'The drafting-quality score is a heuristic based on seven equally weighted drafting dimensions, not an objective legal-validity or enforceability score.';

  // 7. Executive summary
  const sectionSummaries = sectionResults
    .map((r, i) => `Section ${i + 1} (${sections[i].title}): ${r.executiveSummary.trim()}`)
    .join(' ');
  const executiveSummary =
    `Comprehensive multi-section review of ${totalSections} contract sections. ` +
    sectionSummaries;

  // 8. Overall risk level
  const confirmedRisks: RiskLevel[] = [
    ...canonicalClauses
      .filter((c) => c.evidenceStatus !== 'insufficient')
      .map((c) => c.riskLevel),
    ...canonicalMissing.map((m) => m.riskLevel),
    ...uniqueAmbiguous
      .filter((a) => a.evidenceStatus !== 'insufficient')
      .map((a) => a.riskLevel),
  ];
  const overallRiskLevel = confirmedRisks.length > 0 ? highestRisk(confirmedRisks) : 'low';

  // 9. Limitations
  const limitations = dedupeStrings([
    `The agreement was reviewed across ${totalSections} manageable sections to ensure comprehensive coverage without truncation or lost findings.`,
    'This review is not legal advice and does not guarantee enforceability in Indian courts.',
    'Indian Contract Act section references are allowlisted but were not checked against the current official text or amendments during this review.',
    'The drafting-quality score is a heuristic based on seven equally weighted drafting dimensions, not an objective legal-validity or enforceability score.',
    ...sectionResults.flatMap((r) => r.limitations ?? []),
  ]);

  return {
    executiveSummary,
    overallRiskLevel,
    clauses: canonicalClauses,
    draftingQualityScore,
    draftingQualityBreakdown: breakdown,
    draftingQualityNotes,
    recommendations,
    contractStrengths,
    missingClauses: canonicalMissing,
    ambiguousProvisions: uniqueAmbiguous,
    legalReferences,
    limitations,
    documentInfo,
  };
}

/**
 * Reviews a commercial contract using an adaptive strategy:
 * - Single-pass review for compact agreements (<= threshold)
 * - Section-based review for longer agreements (> threshold) or agreements that hit token limits
 *
 * Guarantees:
 * - Never returns a fake successful response if any section fails.
 * - Deduplicates findings while preserving original quoted evidence.
 * - Recalculates risk counts strictly from unique confirmed findings.
 */
export async function reviewAgreement(
  options: ReviewAgreementOptions,
): Promise<ReviewResult> {
  const { content, model, systemPrompt, mode, documentInfo } = options;
  const sections = splitAgreementIntoSections(content, SECTION_SPLIT_THRESHOLD);

  // If contract is short, attempt single review first
  if (sections.length <= 1) {
    const singleSection = sections[0] ?? {
      index: 0,
      total: 1,
      title: 'Full Document',
      text: content,
      characterCount: content.length,
    };

    try {
      const result = await reviewSingleSection(
        singleSection,
        content.length,
        model,
        systemPrompt,
        mode,
        documentInfo?.pageCount,
      );
      return { ...result, documentInfo };
    } catch (error) {
      // If single section review failed with length/token limit, attempt splitting into smaller sections
      if (
        (error instanceof SectionReviewError && error.reason.includes('too long')) ||
        (NoObjectGeneratedError.isInstance(error) && error.finishReason === 'length')
      ) {
        const smallerSections = splitAgreementIntoSections(content, 4_000);
        if (smallerSections.length > 1) {
          logSafeDiagnostic({
            event: 'fallback_to_multi_section',
            totalSections: smallerSections.length,
            characterCount: content.length,
          });
          return reviewSectionsSequentially(
            smallerSections,
            content,
            model,
            systemPrompt,
            mode,
            documentInfo,
          );
        }
      }
      throw error;
    }
  }

  // Multi-section review for longer agreements
  logSafeDiagnostic({
    event: 'multi_section_review_start',
    totalSections: sections.length,
    characterCount: content.length,
  });

  return reviewSectionsSequentially(
    sections,
    content,
    model,
    systemPrompt,
    mode,
    documentInfo,
  );
}

async function reviewSectionsSequentially(
  sections: AgreementSection[],
  content: string,
  model: LanguageModel,
  systemPrompt: string,
  mode: ReviewMode,
  documentInfo?: ReviewResult['documentInfo'],
): Promise<ReviewResult> {
  const sectionResults: ReviewResult[] = [];

  for (const section of sections) {
    const sectionResult = await reviewSingleSection(
      section,
      content.length,
      model,
      systemPrompt,
      mode,
      documentInfo?.pageCount,
    );
    sectionResults.push(sectionResult);
  }

  return combineSectionResults(sectionResults, content, sections, documentInfo);
}
