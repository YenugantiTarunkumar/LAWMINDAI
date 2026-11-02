export type LegalDomain =
  | 'contract'
  | 'consumer'
  | 'information-technology'
  | 'criminal-offences'
  | 'criminal-procedure'
  | 'evidence'
  | 'constitution';

export type LegalCoverage =
  | 'supported'
  | 'limited'
  | 'not_covered';

export interface LegalSource {
  id: string;
  actName: string;
  enactedYear: number;
  domain: LegalDomain;
  sourceUrl: string;
  sourceType: 'official-government-portal';
  sourceStatus: 'not-live-verified';
  effectiveDate: null;
  lastVerificationDate: null;
  verificationNote: string;
}

export interface LegalPassage {
  id: string;
  sourceId: string;
  section: string | null;
  sectionTitle: string | null;
  topics: string[];
  retrievalHint: string;
}

export interface RetrievedLegalPassage extends LegalPassage {
  source: LegalSource;
  score: number;
}

export interface LegalClassification {
  domains: LegalDomain[];
  coverage: LegalCoverage;
  label: string;
}

export const LEGAL_VERIFICATION_NOTE =
  'Official portal is identified as a discovery link only. The source content, section text, amendments, and current status could not be fetched and verified in this environment.';

export const LEGAL_SOURCES: LegalSource[] = [
  source('indian-contract-act', 'Indian Contract Act, 1872', 1872, 'contract'),
  source('consumer-protection-act', 'Consumer Protection Act, 2019', 2019, 'consumer'),
  source('information-technology-act', 'Information Technology Act, 2000', 2000, 'information-technology'),
  source('bharatiya-nyaya-sanhita', 'Bharatiya Nyaya Sanhita, 2023', 2023, 'criminal-offences'),
  source('bharatiya-nagarik-suraksha-sanhita', 'Bharatiya Nagarik Suraksha Sanhita, 2023', 2023, 'criminal-procedure'),
  source('bharatiya-sakshya-adhiniyam', 'Bharatiya Sakshya Adhiniyam, 2023', 2023, 'evidence'),
  source('constitution-of-india', 'Constitution of India', 1950, 'constitution'),
];

function source(
  id: string,
  actName: string,
  enactedYear: number,
  domain: LegalDomain,
): LegalSource {
  const isConstitution = domain === 'constitution';
  return {
    id,
    actName,
    enactedYear,
    domain,
    sourceUrl: isConstitution
      ? 'https://legislative.gov.in/'
      : 'https://www.indiacode.nic.in/',
    sourceType: 'official-government-portal',
    sourceStatus: 'not-live-verified',
    effectiveDate: null,
    lastVerificationDate: null,
    verificationNote: LEGAL_VERIFICATION_NOTE,
  };
}

function passage(
  id: string,
  sourceId: string,
  section: string | null,
  sectionTitle: string | null,
  topics: string[],
  retrievalHint: string,
): LegalPassage {
  return { id, sourceId, section, sectionTitle, topics, retrievalHint };
}

export const LEGAL_PASSAGES: LegalPassage[] = [
  passage('ica-73', 'indian-contract-act', '73', 'Compensation for loss or damage caused by breach of contract', ['breach', 'damages', 'compensation', 'loss'], 'Candidate topic: compensation for loss or damage caused by breach of contract. Section heading and current text not verified.'),
  passage('ica-74', 'indian-contract-act', '74', 'Compensation for breach of contract where penalty stipulated', ['breach', 'damages', 'penalty', 'liquidated damages'], 'Candidate topic: compensation for breach where a sum is named or a penalty is stipulated. Section heading and current text not verified.'),
  passage('ica-124', 'indian-contract-act', '124', 'Contract of indemnity defined', ['indemnity', 'indemnification', 'loss', 'protection'], 'Candidate topic: definition of a contract of indemnity. Section heading and current text not verified.'),
  passage('ica-125', 'indian-contract-act', '125', 'Rights of indemnity-holder when sued', ['indemnity', 'indemnification', 'claim', 'costs'], 'Candidate topic: rights of an indemnity-holder when sued. Section heading and current text not verified.'),
  passage('ica-10', 'indian-contract-act', '10', 'What agreements are contracts', ['agreement', 'valid contract', 'consent', 'capacity', 'lawful consideration'], 'Candidate topic: agreements treated as contracts and related conditions. Section heading and current text not verified.'),
  passage('ica-11', 'indian-contract-act', '11', 'Who are competent to contract', ['capacity', 'competence', 'age', 'sound mind'], 'Candidate topic: contractual competence. Section heading and current text not verified.'),
  passage('ica-14', 'indian-contract-act', '14', 'Free consent defined', ['consent', 'coercion', 'undue influence', 'fraud', 'misrepresentation'], 'Candidate topic: free consent and related vitiating factors. Section heading and current text not verified.'),
  passage('ica-73-breach', 'indian-contract-act', null, null, ['breach', 'contract', 'damages'], 'Candidate domain: Indian Contract Act, 1872. Specific section text is unavailable and has not been verified.'),

  passage('cpa-2-7', 'consumer-protection-act', '2(7)', 'Consumer', ['consumer', 'goods', 'services', 'buyer', 'purchaser'], 'Candidate topic: definition of consumer. Section heading and current text not verified.'),
  passage('cpa-2-11', 'consumer-protection-act', '2(11)', 'Deficiency', ['deficiency', 'service', 'unfair service', 'consumer'], 'Candidate topic: deficiency in service. Section heading and current text not verified.'),
  passage('cpa-2-47', 'consumer-protection-act', '2(47)', 'Unfair trade practice', ['unfair trade practice', 'misleading', 'consumer', 'advertising'], 'Candidate topic: unfair trade practice. Section heading and current text not verified.'),
  passage('cpa-35', 'consumer-protection-act', '35', 'Manner in which complaint shall be made', ['consumer complaint', 'complaint', 'consumer commission', 'redressal'], 'Candidate topic: filing a consumer complaint. Section heading and current text not verified.'),
  passage('cpa-complaint', 'consumer-protection-act', null, null, ['consumer', 'deficiency', 'complaint', 'redressal'], 'Candidate domain: Consumer Protection Act, 2019. Specific forum, limitation, procedure, and section text are unavailable and unverified.'),

  passage('ita-43', 'information-technology-act', '43', 'Penalty and compensation for damage to computer, computer system, etc.', ['unauthorised access', 'computer', 'data', 'damage', 'compensation'], 'Candidate topic: certain unauthorised acts involving computer resources and compensation. Section heading and current text not verified.'),
  passage('ita-66', 'information-technology-act', '66', 'Computer related offences', ['computer offence', 'unauthorised access', 'hacking', 'cybercrime'], 'Candidate topic: specified computer-related acts done dishonestly or fraudulently. Section heading and current text not verified.'),
  passage('ita-66c', 'information-technology-act', '66C', 'Punishment for identity theft', ['identity theft', 'password', 'electronic signature', 'cybercrime'], 'Candidate topic: identity theft involving specified electronic identifiers. Section heading and current text not verified.'),
  passage('ita-66d', 'information-technology-act', '66D', 'Punishment for cheating by personation by using computer resource', ['online fraud', 'personation', 'cheating', 'cybercrime'], 'Candidate topic: cheating by personation using a computer resource. Section heading and current text not verified.'),
  passage('ita-cyber', 'information-technology-act', null, null, ['cybercrime', 'electronic record', 'computer resource'], 'Candidate domain: Information Technology Act, 2000. Current applicability and amendments are unavailable and unverified.'),

  passage('bns-303', 'bharatiya-nyaya-sanhita', '303', 'Theft', ['theft', 'dishonestly', 'movable property', 'criminal offence'], 'Candidate topic: theft. Section heading and current text not verified.'),
  passage('bns-316', 'bharatiya-nyaya-sanhita', '316', 'Criminal breach of trust', ['criminal breach of trust', 'entrustment', 'misappropriation'], 'Candidate topic: criminal breach of trust. Section heading and current text not verified.'),
  passage('bns-318', 'bharatiya-nyaya-sanhita', '318', 'Cheating', ['cheating', 'fraud', 'dishonest inducement'], 'Candidate topic: cheating. Section heading and current text not verified.'),
  passage('bns-351', 'bharatiya-nyaya-sanhita', '351', 'Criminal intimidation', ['criminal intimidation', 'threat', 'threatening'], 'Candidate topic: criminal intimidation. Section heading and current text not verified.'),
  passage('bns-criminal', 'bharatiya-nyaya-sanhita', null, null, ['criminal offence', 'crime', 'punishment'], 'Candidate domain: Bharatiya Nyaya Sanhita, 2023. Offence elements, exceptions, penalties, and current text are unavailable and unverified.'),

  passage('bnss-173', 'bharatiya-nagarik-suraksha-sanhita', '173', 'Information in cognizable cases', ['FIR', 'first information report', 'cognizable offence', 'police complaint'], 'Candidate topic: information relating to cognizable cases and FIR procedure. Section heading and current text not verified.'),
  passage('bnss-arrest', 'bharatiya-nagarik-suraksha-sanhita', null, null, ['arrest', 'bail', 'investigation', 'criminal procedure', 'FIR'], 'Candidate domain: Bharatiya Nagarik Suraksha Sanhita, 2023. Procedural requirements, timelines, exceptions, and current text are unavailable and unverified.'),

  passage('bsa-61', 'bharatiya-sakshya-adhiniyam', '61', 'Electronic or digital record', ['electronic evidence', 'digital record', 'electronic record'], 'Candidate topic: electronic or digital records. Section heading and current text not verified.'),
  passage('bsa-63', 'bharatiya-sakshya-adhiniyam', '63', 'Admissibility of electronic records', ['electronic evidence', 'admissibility', 'certificate', 'digital record'], 'Candidate topic: admissibility of electronic records and related requirements. Section heading and current text not verified.'),
  passage('bsa-evidence', 'bharatiya-sakshya-adhiniyam', null, null, ['evidence', 'proof', 'electronic evidence', 'digital evidence'], 'Candidate domain: Bharatiya Sakshya Adhiniyam, 2023. Evidence requirements and current text are unavailable and unverified.'),

  passage('constitution-14', 'constitution-of-india', '14', 'Equality before law', ['equality', 'fundamental rights', 'discrimination', 'state'], 'Candidate topic: equality before law and equal protection of laws. Article text and current interpretation not verified.'),
  passage('constitution-19', 'constitution-of-india', '19', 'Protection of certain rights regarding freedom of speech, etc.', ['freedom', 'speech', 'expression', 'fundamental rights'], 'Candidate topic: specified freedoms and their constitutional limitations. Article text and current interpretation not verified.'),
  passage('constitution-21', 'constitution-of-india', '21', 'Protection of life and personal liberty', ['life', 'personal liberty', 'fundamental rights', 'privacy'], 'Candidate topic: protection of life and personal liberty. Article text and current interpretation not verified.'),
  passage('constitution-32', 'constitution-of-india', '32', 'Remedies for enforcement of rights conferred by this Part', ['constitutional remedy', 'writ', 'fundamental rights', 'supreme court'], 'Candidate topic: constitutional remedies for enforcement of specified fundamental rights. Article text and current interpretation not verified.'),
  passage('constitution-rights', 'constitution-of-india', null, null, ['fundamental rights', 'constitution', 'writ', 'remedy'], 'Candidate domain: Constitution of India. Constitutional text and current judicial interpretation are unavailable and unverified.'),
];

const DOMAIN_KEYWORDS: Record<LegalDomain, string[]> = {
  contract: ['contract', 'agreement', 'breach', 'indemnity', 'indemnification', 'damages', 'consideration', 'consent', 'valid contract'],
  consumer: ['consumer', 'deficiency in service', 'unfair trade', 'consumer complaint', 'consumer rights', 'consumer protection'],
  'information-technology': ['information technology act', 'it act', 'cyber', 'identity theft', 'online fraud', 'electronic signature', 'computer resource'],
  'criminal-offences': ['bharatiya nyaya sanhita', 'bns', 'criminal offence', 'criminal law', 'theft', 'cheating', 'criminal intimidation', 'criminal breach of trust'],
  'criminal-procedure': ['bharatiya nagarik suraksha sanhita', 'bnss', 'fir', 'first information report', 'police complaint', 'arrest', 'bail', 'investigation'],
  evidence: ['bharatiya sakshya adhiniyam', 'bsa', 'evidence', 'electronic evidence', 'digital evidence', 'admissibility'],
  constitution: ['constitution', 'fundamental rights', 'article 14', 'article 19', 'article 21', 'article 32', 'writ', 'equality before law'],
};

const DOMAIN_LABELS: Record<LegalDomain, string> = {
  contract: 'Indian Contract Act, 1872',
  consumer: 'Consumer Protection Act, 2019',
  'information-technology': 'Information Technology Act, 2000',
  'criminal-offences': 'Bharatiya Nyaya Sanhita, 2023',
  'criminal-procedure': 'Bharatiya Nagarik Suraksha Sanhita, 2023',
  evidence: 'Bharatiya Sakshya Adhiniyam, 2023',
  constitution: 'Constitution of India',
};

export function classifyLegalQuestion(
  question: string,
  history: string[] = [],
): LegalClassification {
  const text = `${question} ${history.slice(-3).join(' ')}`.toLowerCase();
  const domains = (Object.entries(DOMAIN_KEYWORDS) as [LegalDomain, string[]][])
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([domain]) => domain);

  const uniqueDomains = [...new Set(domains)];
  return {
    domains: uniqueDomains,
    coverage: uniqueDomains.length === 0 ? 'not_covered' : 'limited',
    label:
      uniqueDomains.length === 0
        ? 'Outside current indexed topics'
        : uniqueDomains.map((domain) => DOMAIN_LABELS[domain]).join(', '),
  };
}

export function retrieveLegalPassages(
  question: string,
  domains: LegalDomain[],
  history: string[] = [],
  limit = 8,
): RetrievedLegalPassage[] {
  const query = [question, ...history.slice(-3)].join(' ').toLowerCase();
  const queryTerms = new Set(tokenize(query));
  const candidatePassages = LEGAL_PASSAGES.filter((item) => {
    const source = LEGAL_SOURCES.find(({ id }) => id === item.sourceId);
    return source && domains.includes(source.domain);
  });

  const scored = candidatePassages.map((item) => {
    const searchable = [
      item.section ?? '',
      item.sectionTitle ?? '',
      item.topics.join(' '),
      item.retrievalHint,
    ].join(' ');
    const terms = tokenize(searchable);
    let score = 0;
    for (const term of queryTerms) {
      if (terms.includes(term)) score += term.length >= 7 ? 2 : 1;
    }

    for (const topic of item.topics) {
      if (query.includes(topic.toLowerCase())) score += 4;
    }
    if (item.section && new RegExp(`\\b(?:section|article)\\s+${escapeRegExp(item.section)}\\b`, 'i').test(query)) {
      score += 10;
    }

    return { item, score };
  });

  const retrieved: RetrievedLegalPassage[] = [];
  for (const { item, score } of scored
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)) {
    const source = LEGAL_SOURCES.find(({ id }) => id === item.sourceId);
    if (source) retrieved.push({ ...item, source, score });
  }
  return retrieved;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
