export type RiskLevel = 'high' | 'medium' | 'low';
export type ReviewMode =
  | 'full-review'
  | 'clause-by-clause'
  | 'redline'
  | 'provision-drafter';
export interface ReviewRequest {
  content: string;
  mode: ReviewMode;
  /** Additional instructions or context for the review. */
  context?: string;
  /** Whether this review is in demo mode. */
  isDemo?: boolean;
}

export interface ClauseAnalysis {
  clauseTitle: string;
  originalText: string;
  riskLevel: RiskLevel;
  findingType?: 'risk' | 'informational' | 'insufficient-evidence';
  evidenceStatus?: 'supported' | 'insufficient' | 'not-applicable';
  issue: string;
  proposedRevision: string;
  reasoning: string;
  whyItMatters?: string;
  potentialConsequences?: string;
  recommendedAction?: string;
  ambiguity?: string;
  possibleInterpretations?: string[];
  legalReferences?: LegalReference[];
  evidenceLimitations?: string;
  confidence?: number;
  pageNumbers?: number[];
}

export interface LegalReference {
  actName: string;
  section: string;
  relevance: string;
  sourceUrl: string;
  sourceStatus: 'official-portal-allowlisted-not-live-verified';
}

export interface MissingClauseAnalysis {
  clauseTitle: string;
  riskLevel: RiskLevel;
  whyItMatters: string;
  potentialConsequences: string;
  recommendedAction: string;
  proposedWording: string;
  legalReferences: LegalReference[];
  evidenceLimitations: string;
}

export interface AmbiguousProvision {
  clauseTitle: string;
  originalText: string;
  evidenceStatus?: 'supported' | 'insufficient';
  ambiguity: string;
  possibleInterpretations: string[];
  riskLevel: RiskLevel;
  pageNumbers: number[];
}

export interface ReviewResult {
  executiveSummary: string;
  overallRiskLevel: RiskLevel;
  clauses: ClauseAnalysis[];
  /** Drafting quality on a 1–10 scale. */
  draftingQualityScore: number;
  draftingQualityBreakdown?: {
    clarity: number;
    completeness: number;
    consistency: number;
    riskAllocation: number;
    operationalPrecision: number;
    disputeResolution: number;
    draftingStructure: number;
  };
  draftingQualityNotes: string;
  recommendations: string[];
  contractStrengths?: string[];
  missingClauses?: MissingClauseAnalysis[];
  ambiguousProvisions?: AmbiguousProvision[];
  legalReferences?: LegalReference[];
  limitations?: string[];
  documentInfo?: {
    format: 'pdf' | 'docx' | 'txt' | 'md' | 'pasted';
    pageCount: number | null;
    characterCount: number;
    warnings: string[];
  };
  /** Flag indicating whether the result is an illustrative demo output */
  isDemo?: boolean;
}

export interface StoredReview {
  id: string;
  timestamp: string;
  mode: ReviewMode;
  inputFileName?: string;
  result: ReviewResult;
  originalContent: string;
}
