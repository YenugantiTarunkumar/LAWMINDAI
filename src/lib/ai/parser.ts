import type {
  AmbiguousProvision,
  ClauseAnalysis,
  LegalReference,
  MissingClauseAnalysis,
  ReviewMode,
  ReviewResult,
  RiskLevel,
} from '@/lib/types';
import {
  getCanonicalClauses,
  getCanonicalMissingClauses,
} from './review-findings';
import {
  hasUnsupportedRecommendationTerm,
  removeUnsupportedProposedWording,
  replaceUnsupportedRecommendation,
} from './review-recommendations';

const INVALID_OUTPUT_MESSAGE =
  'The AI service generated a review that could not be validated against the agreement. Please retry; for longer agreements, review smaller sections.';
const SOURCE_CHECK_LIMITATION =
  'Indian Contract Act section references are allowlisted but were not checked against the current official text or amendments during this review.';
const MISSING_CLAUSE_LIMITATION =
  'This provision was not identified in the extracted document; its absence is not, by itself, a conclusion that the agreement is invalid or unlawful.';
const UNSUPPORTED_DRAFTING_LIMITATION =
  'One or more generated drafting suggestions containing unsupported values, interest benchmarks, or forum locations were replaced with a request for the parties to confirm those terms.';
const INSUFFICIENT_EVIDENCE_LIMITATION =
  'One or more findings could not be matched to an exact excerpt in the extracted document and are marked insufficiently supported.';
const DRAFTING_SCORE_LIMITATION =
  'The drafting-quality score is a heuristic based on seven equally weighted drafting dimensions, not an objective legal-validity or enforceability score.';
const DRAFTING_QUALITY_DIMENSIONS = [
  'clarity',
  'completeness',
  'consistency',
  'riskAllocation',
  'operationalPrecision',
  'disputeResolution',
  'draftingStructure',
];
const INDIA_CODE_URL = 'https://www.indiacode.nic.in/';
const ALLOWLISTED_SECTIONS = new Set(['73', '74', '124', '125']);

export class InvalidReviewOutputError extends Error {
  constructor() {
    super(INVALID_OUTPUT_MESSAGE);
    this.name = 'InvalidReviewOutputError';
  }
}

interface ParseOptions {
  sourceText?: string;
  pageCount?: number | null;
  mode?: ReviewMode;
}

/**
 * Validate model output strictly and discard legal references outside the
 * application's curated Indian Contract Act allowlist.
 */
export function parseReviewOutput(
  rawOutput: string,
  options: ParseOptions = {},
): ReviewResult {
  const trimmed = rawOutput.trim();
  const candidates = [
    trimmed,
    extractCodeFence(trimmed),
    extractJsonObject(trimmed),
  ].filter((candidate): candidate is string => candidate !== null);

  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (parsed) {
      return validateReviewResult(parsed, options);
    }
  }

  throw new InvalidReviewOutputError();
}

function extractCodeFence(text: string): string | null {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  return match?.[1].trim() ?? null;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start !== -1 && end > start ? text.slice(start, end + 1) : null;
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validateReviewResult(
  raw: Record<string, unknown>,
  options: ParseOptions,
): ReviewResult {
  if (
    !hasExactKeys(raw, [
      'executiveSummary',
      'overallRiskLevel',
      'clauses',
      'draftingQualityScore',
      'draftingQualityBreakdown',
      'draftingQualityNotes',
      'recommendations',
      'contractStrengths',
      'missingClauses',
      'ambiguousProvisions',
      'legalReferences',
      'limitations',
    ]) ||
    typeof raw.executiveSummary !== 'string' ||
    raw.executiveSummary.trim().length === 0 ||
    !isRiskLevel(raw.overallRiskLevel) ||
    !Array.isArray(raw.clauses) ||
    raw.clauses.length > 100 ||
    !raw.clauses.every((clause) =>
      isClauseAnalysis(clause, options),
    ) ||
    typeof raw.draftingQualityScore !== 'number' ||
    !Number.isFinite(raw.draftingQualityScore) ||
    raw.draftingQualityScore < 1 ||
    raw.draftingQualityScore > 10 ||
    !isDraftingQualityBreakdown(raw.draftingQualityBreakdown) ||
    typeof raw.draftingQualityNotes !== 'string' ||
    !isStringArray(raw.recommendations) ||
    !isStringArray(raw.contractStrengths) ||
    !Array.isArray(raw.missingClauses) ||
    raw.missingClauses.length > 30 ||
    !raw.missingClauses.every(isMissingClause) ||
    !Array.isArray(raw.ambiguousProvisions) ||
    raw.ambiguousProvisions.length > 100 ||
    !raw.ambiguousProvisions.every((provision) =>
      isAmbiguousProvision(
        provision,
        options.pageCount,
      ),
    ) ||
    !Array.isArray(raw.legalReferences) ||
    !raw.legalReferences.every(isModelLegalReference) ||
    !isStringArray(raw.limitations)
  ) {
    throw new InvalidReviewOutputError();
  }

  const unsupportedReferenceFound =
    hasUnsupportedReference(raw.legalReferences) ||
    raw.clauses.some(
      (clause) =>
        isRecord(clause) && hasUnsupportedReference(clause.legalReferences),
    ) ||
    raw.missingClauses.some(
      (clause) =>
        isRecord(clause) && hasUnsupportedReference(clause.legalReferences),
    );
  const limitations = [...raw.limitations];
  if (!limitations.includes(DRAFTING_SCORE_LIMITATION)) {
    limitations.push(DRAFTING_SCORE_LIMITATION);
  }
  if (!limitations.includes(SOURCE_CHECK_LIMITATION)) {
    limitations.push(SOURCE_CHECK_LIMITATION);
  }
  if (
    unsupportedReferenceFound &&
    !limitations.some((item) => item.includes('could not be verified'))
  ) {
    limitations.push(
      'One or more model-suggested legal references were not on the allowlist and were omitted because they could not be verified.',
    );
  }

  const clauses = raw.clauses.map((clause) =>
    normalizeClause(
      clause as Record<string, unknown>,
      options.sourceText,
      options.mode,
      options.pageCount,
    ),
  );
  const canonicalClauses = getCanonicalClauses(clauses);
  const missingClauses = getCanonicalMissingClauses(
    raw.missingClauses.map((clause) =>
      normalizeMissingClause(
        clause as Record<string, unknown>,
        options.sourceText,
        limitations,
      ),
    ),
  );
  const normalizedAmbiguousProvisions = dedupeAmbiguousProvisions(
    raw.ambiguousProvisions.map((provision) =>
      normalizeAmbiguousProvision(
        provision,
        options.sourceText,
        options.pageCount,
      ),
    ),
  );
  const mergedFindings = mergeDuplicateAmbiguousFindings(
    canonicalClauses,
    normalizedAmbiguousProvisions,
  );
  const clausesWithAmbiguity = mergedFindings.clauses;
  const ambiguousProvisions = mergedFindings.ambiguousProvisions;
  if (
    clausesWithAmbiguity.some(
      (clause) => clause.evidenceStatus === 'insufficient',
    ) ||
    ambiguousProvisions.some(
      (provision) => provision.evidenceStatus === 'insufficient',
    )
  ) {
    limitations.push(INSUFFICIENT_EVIDENCE_LIMITATION);
  }
  const recommendations = raw.recommendations.map((recommendation) =>
    options.sourceText === undefined
      ? recommendation
      : replaceUnsupportedRecommendation(recommendation, options.sourceText),
  );
  const generatedRecommendations = [
    ...raw.clauses.flatMap((clause) =>
      isRecord(clause)
        ? [clause.recommendedAction, clause.proposedRevision]
        : [],
    ),
    ...raw.missingClauses.flatMap((clause) =>
      isRecord(clause)
        ? [clause.recommendedAction, clause.proposedWording]
        : [],
    ),
    ...raw.recommendations,
  ];
  if (
    options.sourceText !== undefined &&
    generatedRecommendations.some(
      (value) =>
        typeof value === 'string' &&
        hasUnsupportedRecommendationTerm(value, options.sourceText!),
    )
  ) {
    limitations.push(UNSUPPORTED_DRAFTING_LIMITATION);
  }
  const allRisks = [
    ...clausesWithAmbiguity
      .filter((clause) => clause.evidenceStatus !== 'insufficient')
      .map((clause) => clause.riskLevel),
    ...missingClauses.map((clause) => clause.riskLevel),
    ...ambiguousProvisions
      .filter(
        (provision) =>
          provision.evidenceStatus !== 'insufficient' &&
          !clausesWithAmbiguity.some(
            (clause) =>
              clause.evidenceStatus !== 'insufficient' &&
              normalizeEvidence(clause.originalText) ===
                normalizeEvidence(provision.originalText),
          ),
      )
      .map((provision) => provision.riskLevel),
  ];

  return {
    executiveSummary: raw.executiveSummary,
    overallRiskLevel: allRisks.length
      ? highestRisk(allRisks)
      : raw.overallRiskLevel,
    clauses: clausesWithAmbiguity,
    draftingQualityScore: calculateDraftingQualityScore(
      raw.draftingQualityBreakdown,
    ),
    draftingQualityBreakdown: raw.draftingQualityBreakdown,
    draftingQualityNotes: appendLimitation(
      raw.draftingQualityNotes,
      DRAFTING_SCORE_LIMITATION,
    ),
    recommendations,
    contractStrengths: raw.contractStrengths,
    missingClauses,
    ambiguousProvisions,
    legalReferences: normalizeLegalReferences(raw.legalReferences),
    limitations,
  };
}

function isDraftingQualityBreakdown(
  value: unknown,
): value is NonNullable<ReviewResult['draftingQualityBreakdown']> {
  return (
    isRecord(value) &&
    hasExactKeys(value, DRAFTING_QUALITY_DIMENSIONS) &&
    DRAFTING_QUALITY_DIMENSIONS.every(
      (dimension) =>
        typeof value[dimension] === 'number' &&
        Number.isFinite(value[dimension]) &&
        (value[dimension] as number) >= 1 &&
        (value[dimension] as number) <= 10,
    )
  );
}

function calculateDraftingQualityScore(
  breakdown: NonNullable<ReviewResult['draftingQualityBreakdown']>,
): number {
  const total = DRAFTING_QUALITY_DIMENSIONS.reduce(
    (sum, dimension) => sum + breakdown[dimension as keyof typeof breakdown],
    0,
  );
  return Math.round(total / DRAFTING_QUALITY_DIMENSIONS.length);
}

function isClauseAnalysis(
  value: unknown,
  options: ParseOptions,
): value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'clauseTitle',
      'originalText',
      'riskLevel',
      'issue',
      'whyItMatters',
      'potentialConsequences',
      'recommendedAction',
      'proposedRevision',
      'reasoning',
      'legalReferences',
      'evidenceLimitations',
      'confidence',
      'pageNumbers',
    ])
  ) {
    return false;
  }

  if (
    typeof value.clauseTitle !== 'string' ||
    !value.clauseTitle.trim() ||
    typeof value.originalText !== 'string' ||
    !isRiskLevel(value.riskLevel) ||
    typeof value.issue !== 'string' ||
    typeof value.whyItMatters !== 'string' ||
    typeof value.potentialConsequences !== 'string' ||
    typeof value.recommendedAction !== 'string' ||
    typeof value.proposedRevision !== 'string' ||
    typeof value.reasoning !== 'string' ||
    !Array.isArray(value.legalReferences) ||
    !value.legalReferences.every(isModelLegalReference) ||
    typeof value.evidenceLimitations !== 'string' ||
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !isPageNumberArray(value.pageNumbers, options.pageCount)
  ) {
    return false;
  }

  return true;
}

function isMissingClause(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'clauseTitle',
      'riskLevel',
      'whyItMatters',
      'potentialConsequences',
      'recommendedAction',
      'proposedWording',
      'legalReferences',
      'evidenceLimitations',
    ]) &&
    typeof value.clauseTitle === 'string' &&
    value.clauseTitle.trim().length > 0 &&
    isRiskLevel(value.riskLevel) &&
    typeof value.whyItMatters === 'string' &&
    typeof value.potentialConsequences === 'string' &&
    typeof value.recommendedAction === 'string' &&
    typeof value.proposedWording === 'string' &&
    Array.isArray(value.legalReferences) &&
    value.legalReferences.every(isModelLegalReference) &&
    typeof value.evidenceLimitations === 'string'
  );
}

function isAmbiguousProvision(
  value: unknown,
  pageCount?: number | null,
): value is AmbiguousProvision {
  if (!(
    isRecord(value) &&
    hasExactKeys(value, [
      'clauseTitle',
      'originalText',
      'ambiguity',
      'possibleInterpretations',
      'riskLevel',
      'pageNumbers',
    ]) &&
    typeof value.clauseTitle === 'string' &&
    typeof value.originalText === 'string' &&
    typeof value.ambiguity === 'string' &&
    isStringArray(value.possibleInterpretations) &&
    isRiskLevel(value.riskLevel) &&
    isPageNumberArray(value.pageNumbers, pageCount)
  )) {
    return false;
  }

  return true;
}

function isModelLegalReference(
  value: unknown,
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['actName', 'section', 'relevance']) &&
    typeof value.actName === 'string' &&
    typeof value.section === 'string' &&
    typeof value.relevance === 'string'
  );
}

function hasUnsupportedReference(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      (reference) =>
        !isRecord(reference) ||
        reference.actName !== 'Indian Contract Act, 1872' ||
        !ALLOWLISTED_SECTIONS.has(reference.section as string),
    )
  );
}

function normalizeClause(
  raw: Record<string, unknown>,
  sourceText?: string,
  mode?: ReviewMode,
  pageCount?: number | null,
): ClauseAnalysis {
  const originalText = raw.originalText as string;
  const notApplicable = mode === 'provision-drafter';
  const evidenceStatus = notApplicable
    ? 'not-applicable'
    : sourceText === undefined ||
        (originalText.trim().length > 0 &&
          containsVerbatimText(sourceText, originalText))
      ? 'supported'
      : 'insufficient';
  const limitations = [raw.evidenceLimitations as string];
  if (evidenceStatus === 'insufficient') {
    limitations.push(
      'No exact supporting excerpt could be located in the extracted document; this observation is not confirmed.',
    );
  }
  const proposedRevision =
    sourceText === undefined
      ? (raw.proposedRevision as string)
      : removeUnsupportedProposedWording(
          raw.proposedRevision as string,
          sourceText,
        );
  const recommendedAction =
    sourceText === undefined
      ? (raw.recommendedAction as string)
      : replaceUnsupportedRecommendation(
          raw.recommendedAction as string,
          sourceText,
        );

  return {
    clauseTitle: raw.clauseTitle as string,
    originalText: evidenceStatus === 'supported' ? originalText : '',
    riskLevel: raw.riskLevel as RiskLevel,
    findingType:
      evidenceStatus === 'insufficient'
        ? 'insufficient-evidence'
        : raw.riskLevel === 'low'
          ? 'informational'
          : 'risk',
    evidenceStatus,
    issue: raw.issue as string,
    whyItMatters: raw.whyItMatters as string,
    potentialConsequences: raw.potentialConsequences as string,
    recommendedAction,
    proposedRevision,
    reasoning: raw.reasoning as string,
    legalReferences: normalizeLegalReferences(raw.legalReferences),
    evidenceLimitations: [...new Set(limitations.filter(Boolean))].join(' '),
    confidence:
      typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
        ? raw.confidence > 1 && raw.confidence <= 100
          ? raw.confidence / 100
          : Math.max(0, Math.min(1, raw.confidence))
        : 0.8,
    pageNumbers:
      Array.isArray(raw.pageNumbers)
        ? pageCount == null
          ? []
          : (raw.pageNumbers as number[]).filter(
              (p) => Number.isInteger(p) && p > 0 && p <= pageCount,
            )
        : [],
  };
}

function normalizeMissingClause(
  raw: Record<string, unknown>,
  sourceText: string | undefined,
  limitations: string[],
): MissingClauseAnalysis {
  const recommendedAction =
    sourceText === undefined
      ? (raw.recommendedAction as string)
      : replaceUnsupportedRecommendation(
          raw.recommendedAction as string,
          sourceText,
        );
  const proposedWording =
    sourceText === undefined
      ? (raw.proposedWording as string)
      : removeUnsupportedProposedWording(
          raw.proposedWording as string,
          sourceText,
        );
  if (
    sourceText !== undefined &&
    (recommendedAction !== raw.recommendedAction ||
      proposedWording !== raw.proposedWording)
  ) {
    limitations.push(UNSUPPORTED_DRAFTING_LIMITATION);
  }

  return {
    clauseTitle: raw.clauseTitle as string,
    riskLevel: raw.riskLevel as RiskLevel,
    whyItMatters: raw.whyItMatters as string,
    potentialConsequences: raw.potentialConsequences as string,
    recommendedAction,
    proposedWording,
    legalReferences: normalizeLegalReferences(raw.legalReferences),
    evidenceLimitations: appendLimitation(
      raw.evidenceLimitations as string,
      MISSING_CLAUSE_LIMITATION,
    ),
  };
}

function normalizeAmbiguousProvision(
  raw: AmbiguousProvision,
  sourceText?: string,
  pageCount?: number | null,
): AmbiguousProvision {
  const originalText = raw.originalText as string;
  const supported =
    sourceText === undefined ||
    (originalText.trim().length > 0 &&
      containsVerbatimText(sourceText, originalText));
  const pageNumbers = raw.pageNumbers as number[];

  return {
    clauseTitle: raw.clauseTitle as string,
    originalText: supported ? originalText : '',
    evidenceStatus: supported ? 'supported' : 'insufficient',
    ambiguity: raw.ambiguity as string,
    possibleInterpretations: raw.possibleInterpretations as string[],
    riskLevel: raw.riskLevel as RiskLevel,
    pageNumbers:
      pageCount == null
        ? []
        : pageNumbers.filter((pageNumber) => pageNumber <= pageCount),
  };
}

function dedupeAmbiguousProvisions(
  provisions: AmbiguousProvision[],
): AmbiguousProvision[] {
  const seen = new Set<string>();
  return provisions.filter((provision) => {
    const key = provision.originalText.trim()
      ? normalizeEvidence(provision.originalText)
      : `${provision.clauseTitle.trim().toLowerCase()}:${provision.ambiguity.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeDuplicateAmbiguousFindings(
  clauses: ClauseAnalysis[],
  provisions: AmbiguousProvision[],
): {
  clauses: ClauseAnalysis[];
  ambiguousProvisions: AmbiguousProvision[];
} {
  const clauseByEvidence = new Map(
    clauses
      .filter(
        (clause) =>
          clause.evidenceStatus !== 'insufficient' && clause.originalText,
      )
      .map((clause) => [normalizeEvidence(clause.originalText), clause]),
  );
  const standalone: AmbiguousProvision[] = [];

  for (const provision of provisions) {
    const clause = provision.originalText
      ? clauseByEvidence.get(normalizeEvidence(provision.originalText))
      : undefined;
    if (
      !clause ||
      provision.evidenceStatus === 'insufficient'
    ) {
      standalone.push(provision);
      continue;
    }

    clause.ambiguity = provision.ambiguity;
    clause.possibleInterpretations = provision.possibleInterpretations;
  }

  return { clauses, ambiguousProvisions: standalone };
}

function appendLimitation(value: string, limitation: string): string {
  return value.includes(limitation) ? value : `${value} ${limitation}`.trim();
}

function normalizeEvidence(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeLegalReferences(value: unknown): LegalReference[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((reference) => {
    if (
      !isRecord(reference) ||
      reference.actName !== 'Indian Contract Act, 1872' ||
      !ALLOWLISTED_SECTIONS.has(reference.section as string)
    ) {
      return [];
    }

    return [{
      actName: 'Indian Contract Act, 1872',
      section: reference.section as string,
      relevance: reference.relevance as string,
      sourceUrl: INDIA_CODE_URL,
      sourceStatus: 'official-portal-allowlisted-not-live-verified' as const,
    }];
  });
}

function isPageNumberArray(
  value: unknown,
  pageCount?: number | null,
): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (page) =>
        Number.isInteger(page) &&
        page > 0 &&
        (pageCount == null || page <= pageCount),
    )
  );
}

function containsVerbatimText(source: string, excerpt: string): boolean {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  return normalize(source).includes(normalize(excerpt));
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === [...expectedKeys].sort()[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === 'high' || value === 'medium' || value === 'low';
}

function highestRisk(risks: RiskLevel[]): RiskLevel {
  if (risks.includes('high')) return 'high';
  if (risks.includes('medium')) return 'medium';
  return 'low';
}
