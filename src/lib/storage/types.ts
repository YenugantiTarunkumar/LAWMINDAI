export interface ReviewMetadata {
  id: string;
  timestamp: string;
  mode: string;
  inputFileName?: string;
  overallRiskLevel: string;
  executiveSummary: string;
}
