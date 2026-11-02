export const CASE_CATEGORIES = [
  'contract',
  'consumer',
  'employment',
  'payment-recovery',
  'property',
  'cybercrime',
  'civil',
  'criminal-law',
  'not-sure',
] as const;

export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export interface CaseGuidanceReference {
  id: string;
  actName: string;
  section: string | null;
  sectionTitle: string | null;
  sourceUrl: string;
  sourceStatus: 'not-live-verified';
  verificationNote: string;
}

export interface CaseGuidanceReport {
  situationSummary: string;
  confirmedFacts: string[];
  assumptions: string[];
  missingInformation: { question: string; why: string }[];
  possibleLegalAreas: { area: string; explanation: string }[];
  rightsResponsibilities: string[];
  possibleApproaches: { title: string; description: string; considerations: string[] }[];
  evidenceChecklist: { item: string; why: string }[];
  procedureAuthorities: {
    description: string;
    status: 'general-information' | 'unverified-candidate' | 'not-established';
  }[];
  challengesRisks: string[];
  nextSteps: string[];
  advocateQuestions: string[];
  followUpQuestions: string[];
  limitations: string[];
  referenceIds: string[];
}

export interface CaseGuidanceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  report?: CaseGuidanceReport;
}

export interface CaseConversation {
  id: string;
  title: string;
  updatedAt: number;
  category: CaseCategory;
  situation: string;
  messages: CaseGuidanceMessage[];
  references: CaseGuidanceReference[];
}

export const CASE_CATEGORY_LABELS: Record<CaseCategory, string> = {
  contract: 'Contract disputes',
  consumer: 'Consumer complaints',
  employment: 'Employment disputes',
  'payment-recovery': 'Payment and recovery disputes',
  property: 'Property disputes',
  cybercrime: 'Cybercrime and online fraud',
  civil: 'Civil disputes',
  'criminal-law': 'Criminal-law information requests',
  'not-sure': 'Not sure / another legal area',
};
