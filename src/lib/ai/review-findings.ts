import type {
  ClauseAnalysis,
  MissingClauseAnalysis,
  ReviewResult,
} from '@/lib/types';

export interface ReviewFindingsSummary {
  clauses: ClauseAnalysis[];
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  riskyClauseCount: number;
  analyzedClauseCount: number;
  insufficientEvidenceCount: number;
  missingClauseCount: number;
  ambiguousProvisionCount: number;
  insufficientAmbiguousProvisionCount: number;
}

export function getCanonicalClauses(
  clauses: ClauseAnalysis[],
): ClauseAnalysis[] {
  const unique = new Map<string, ClauseAnalysis>();

  for (const clause of clauses) {
    const source = normalize(clause.originalText);
    const key = source
      ? `source:${source}`
      : `unsupported:${normalize(clause.clauseTitle)}:${normalize(clause.issue)}`;
    const previous = unique.get(key);

    if (!previous || riskRank(clause.riskLevel) > riskRank(previous.riskLevel)) {
      unique.set(key, clause);
    }
  }

  return [...unique.values()];
}

export function getCanonicalMissingClauses(
  clauses: MissingClauseAnalysis[],
): MissingClauseAnalysis[] {
  const unique = new Map<string, MissingClauseAnalysis>();
  for (const clause of clauses) {
    const key = normalize(clause.clauseTitle);
    const previous = unique.get(key);
    if (!previous || riskRank(clause.riskLevel) > riskRank(previous.riskLevel)) {
      unique.set(key, clause);
    }
  }
  return [...unique.values()];
}

export function summarizeReviewFindings(
  result: ReviewResult,
): ReviewFindingsSummary {
  const clauses = getCanonicalClauses(result.clauses);
  const missingClauses = getCanonicalMissingClauses(
    result.missingClauses ?? [],
  );
  const supportedClauses = clauses.filter(
    (clause) =>
      clause.evidenceStatus !== 'insufficient' &&
      clause.findingType !== 'insufficient-evidence',
  );
  const highRisk = supportedClauses.filter(
    (clause) => clause.riskLevel === 'high',
  ).length;
  const mediumRisk = supportedClauses.filter(
    (clause) => clause.riskLevel === 'medium',
  ).length;
  const lowRisk = supportedClauses.filter(
    (clause) => clause.riskLevel === 'low',
  ).length;
  const ambiguousClauses = clauses.filter((clause) => clause.ambiguity);
  const standaloneAmbiguousProvisions = result.ambiguousProvisions ?? [];
  const supportedStandaloneAmbiguousCount =
    standaloneAmbiguousProvisions.filter(
      (provision) => provision.evidenceStatus !== 'insufficient',
    ).length;
  const insufficientAmbiguousProvisionCount =
    standaloneAmbiguousProvisions.filter(
      (provision) => provision.evidenceStatus === 'insufficient',
    ).length;
  const ambiguousProvisionCount =
    ambiguousClauses.filter(
      (clause) =>
        clause.evidenceStatus !== 'insufficient' &&
        clause.findingType !== 'insufficient-evidence',
    ).length + supportedStandaloneAmbiguousCount;

  return {
    clauses,
    highRisk,
    mediumRisk,
    lowRisk,
    riskyClauseCount: highRisk + mediumRisk,
    analyzedClauseCount: supportedClauses.length,
    insufficientEvidenceCount:
      clauses.length -
      supportedClauses.length +
      insufficientAmbiguousProvisionCount,
    missingClauseCount: missingClauses.length,
    ambiguousProvisionCount,
    insufficientAmbiguousProvisionCount,
  };
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function riskRank(risk: ClauseAnalysis['riskLevel']): number {
  switch (risk) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
  }
}
