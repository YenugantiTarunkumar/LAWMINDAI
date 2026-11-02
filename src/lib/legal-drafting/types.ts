export const DRAFT_DOCUMENT_TYPES = [
  'service-agreement',
  'vendor-agreement',
  'nda',
  'payment-demand-notice',
  'general-legal-notice',
  'termination-notice',
] as const;

export type DraftDocumentType = (typeof DRAFT_DOCUMENT_TYPES)[number];

export interface DraftTemplate {
  id: DraftDocumentType;
  title: string;
  description: string;
  support: 'limited-template' | 'limited-draft-only';
  fields: DraftField[];
}

export interface DraftField {
  key: string;
  label: string;
  help: string;
  placeholder: string;
  required: boolean;
  multiline?: boolean;
}

export interface DraftClause {
  id: string;
  heading: string;
  draftText: string;
  plainLanguage: string;
  verify: string[];
  riskPoints: string[];
  highImpact: boolean;
}

export interface DraftAnalysis {
  missingFields: { key: string; label: string }[];
  contradictions: string[];
  followUpQuestions: string[];
  riskFlags: string[];
}

export interface LegalDraft {
  id: string;
  title: string;
  type: DraftDocumentType;
  values: Record<string, string>;
  additionalInformation: string;
  analysis?: DraftAnalysis;
  clauses: DraftClause[];
  finalChecklist: string[];
  createdAt: number;
  updatedAt: number;
}

const draftTemplates: DraftTemplate[] = [
  {
    id: 'service-agreement',
    title: 'Service Agreement',
    description: 'A starting draft for defining services, deliverables, fees, and responsibilities.',
    support: 'limited-template',
    fields: [
      field('placeDate', 'Place and date', 'Place and date for the draft, if known.', 'Enter place and date or leave blank.', false),
      field('client', 'Client / customer', 'Full legal name and address, if known.', 'Client legal name and address', true),
      field('provider', 'Service provider', 'Full legal name and address, if known.', 'Provider legal name and address', true),
      field('services', 'Services and deliverables', 'Describe the work and expected deliverables.', 'Describe services and deliverables', true, true),
      field('timeline', 'Start date and timeline', 'Dates, milestones, or delivery schedule supplied by you.', 'Enter dates or milestones, if agreed', false),
      field('fees', 'Fees and payment terms', 'Amount, currency, invoicing, and payment timing, if agreed.', 'Enter amount, currency and payment timing', true, true),
      field('confidentiality', 'Confidentiality requirements', 'Any specific confidential information or handling requirements.', 'Describe requirements or leave blank', false, true),
      field('intellectualProperty', 'Intellectual property', 'Who should own or license work product, if agreed.', 'Describe the agreed ownership or license', false, true),
      field('termination', 'Termination arrangement', 'Agreed notice or termination conditions, if known.', 'Enter agreed terms or leave blank', false, true),
      field('liability', 'Liability arrangement', 'Any agreed limits or exclusions, if known.', 'Describe agreed terms or leave blank', false, true),
      field('disputes', 'Dispute location / governing law', 'State a jurisdiction only if agreed or known.', 'Enter jurisdiction or leave blank', false),
    ],
  },
  {
    id: 'vendor-agreement',
    title: 'Vendor Agreement',
    description: 'A limited starting draft for supply, delivery, payment, and vendor responsibilities.',
    support: 'limited-template',
    fields: [
      field('placeDate', 'Place and date', 'Place and date for the draft, if known.', 'Enter place and date or leave blank.', false),
      field('customer', 'Customer / purchaser', 'Full legal name and address, if known.', 'Customer legal name and address', true),
      field('vendor', 'Vendor / supplier', 'Full legal name and address, if known.', 'Vendor legal name and address', true),
      field('goodsServices', 'Goods or services', 'Describe the items or services to be supplied.', 'Describe goods, quantities or services', true, true),
      field('delivery', 'Delivery and acceptance', 'Location, schedule, inspection, or acceptance terms actually agreed.', 'Enter agreed delivery details or leave blank', false, true),
      field('fees', 'Price and payment terms', 'Amount, currency, invoice timing, and payment timing.', 'Enter price and payment terms', true, true),
      field('quality', 'Quality / specifications', 'Specifications, standards, or warranty terms actually agreed.', 'Enter agreed specifications or leave blank', false, true),
      field('confidentiality', 'Confidentiality requirements', 'Any agreed information-handling requirements.', 'Enter requirements or leave blank', false, true),
      field('durationTermination', 'Duration and termination', 'Agreed duration and termination arrangement.', 'Enter agreed terms or leave blank', false, true),
      field('disputes', 'Dispute location / governing law', 'State a jurisdiction only if agreed or known.', 'Enter jurisdiction or leave blank', false),
    ],
  },
  {
    id: 'nda',
    title: 'Non-Disclosure Agreement (NDA)',
    description: 'A limited starting draft for describing a disclosure purpose and handling information.',
    support: 'limited-template',
    fields: [
      field('placeDate', 'Place and date', 'Place and date for the draft, if known.', 'Enter place and date or leave blank.', false),
      field('disclosingParty', 'Disclosing party', 'Full legal name and address, if known.', 'Disclosing party legal name and address', true),
      field('receivingParty', 'Receiving party', 'Full legal name and address, if known.', 'Receiving party legal name and address', true),
      field('purpose', 'Purpose of disclosure', 'Why information will be shared.', 'Describe the specific purpose', true, true),
      field('information', 'Information to be protected', 'Describe the information in practical terms; avoid credentials.', 'Describe information categories', true, true),
      field('handling', 'Permitted use and handling', 'Any agreed restrictions, recipients, or safeguards.', 'Enter agreed handling requirements', false, true),
      field('duration', 'Confidentiality period', 'Period only if agreed; do not assume one.', 'Enter agreed period or leave blank', false),
      field('returnDestroy', 'Return or deletion', 'Any agreed return/deletion arrangement.', 'Enter agreed arrangement or leave blank', false, true),
      field('disputes', 'Dispute location / governing law', 'State a jurisdiction only if agreed or known.', 'Enter jurisdiction or leave blank', false),
    ],
  },
  {
    id: 'payment-demand-notice',
    title: 'Payment Demand Notice',
    description: 'Draft only. Limited template; dates, amounts, deadlines, and legal claims must be supplied and reviewed.',
    support: 'limited-draft-only',
    fields: [
      field('sender', 'Sender', 'Name and contact details supplied by you.', 'Sender name and contact details', true),
      field('recipient', 'Recipient', 'Name and contact details supplied by you.', 'Recipient name and contact details', true),
      field('basis', 'Basis for the claimed payment', 'Describe the transaction or obligation without assuming legal entitlement.', 'Describe the transaction, invoice or agreement', true, true),
      field('amount', 'Claimed amount and currency', 'Enter the amount as you calculate it; do not include bank credentials.', 'Enter amount and currency', true),
      field('dueDate', 'Relevant due date', 'Enter a date only if known from your records.', 'Enter date or leave blank', false),
      field('paymentHistory', 'Payment history and prior contact', 'Record what was paid and what communications occurred.', 'Describe payments and prior contact', false, true),
      field('requestedAction', 'Action requested', 'State what you are asking the recipient to do.', 'Describe the action requested', true, true),
      field('responseDate', 'Response date requested', 'Enter only a date you choose; no legal deadline is implied.', 'Enter your requested response date or leave blank', false),
      field('placeDate', 'Place and date of draft', 'Place and date, if known.', 'Enter place and date or leave blank', false),
    ],
  },
  {
    id: 'general-legal-notice',
    title: 'General Legal Notice',
    description: 'Draft only. Limited correspondence template; not a verified statutory or court notice.',
    support: 'limited-draft-only',
    fields: [
      field('sender', 'Sender', 'Name and contact details supplied by you.', 'Sender name and contact details', true),
      field('recipient', 'Recipient', 'Name and contact details supplied by you.', 'Recipient name and contact details', true),
      field('events', 'Events and dates', 'Describe events factually and identify uncertain dates.', 'Describe events and dates', true, true),
      field('concern', 'Concern or issue', 'Describe the issue without stating unsupported legal conclusions.', 'Describe the issue', true, true),
      field('requestedAction', 'Action requested', 'State the action you want the recipient to consider.', 'Describe the requested action', true, true),
      field('responseDate', 'Response date requested', 'Enter a date you choose; no legal deadline is implied.', 'Enter your requested response date or leave blank', false),
      field('placeDate', 'Place and date of draft', 'Place and date, if known.', 'Enter place and date or leave blank', false),
    ],
  },
  {
    id: 'termination-notice',
    title: 'Agreement Termination Notice',
    description: 'Draft only. Limited template; the agreement and termination rights require advocate review.',
    support: 'limited-draft-only',
    fields: [
      field('sender', 'Sender', 'Name and contact details supplied by you.', 'Sender name and contact details', true),
      field('recipient', 'Recipient', 'Name and contact details supplied by you.', 'Recipient name and contact details', true),
      field('agreement', 'Agreement details', 'Title, parties, and date exactly as available.', 'Identify the agreement', true, true),
      field('terminationBasis', 'Reason / contractual basis', 'Describe the reason or clause only if known; do not infer a right to terminate.', 'Enter the stated reason or basis', true, true),
      field('noticePeriod', 'Notice period', 'Enter only the period stated in the agreement or supplied by you.', 'Enter period or leave blank', false),
      field('effectiveDate', 'Proposed effective date', 'Enter only a date supplied by you.', 'Enter date or leave blank', false),
      field('wrapUp', 'Payments, property, and transition', 'Describe agreed outstanding items or transition arrangements.', 'Enter agreed details or leave blank', false, true),
      field('placeDate', 'Place and date of draft', 'Place and date, if known.', 'Enter place and date or leave blank', false),
    ],
  },
];

export const DRAFT_TEMPLATES: DraftTemplate[] = draftTemplates.map((template) => ({
  ...template,
  fields: [
    ...template.fields,
    field(
      'jurisdiction',
      'Jurisdiction / governing law, if known',
      'Identify the relevant place only if supplied or agreed. Leave blank if unclear.',
      'Enter the relevant jurisdiction or leave blank',
      false,
    ),
  ],
}));

function field(
  key: string,
  label: string,
  help: string,
  placeholder: string,
  required: boolean,
  multiline = false,
): DraftField {
  return { key, label, help, placeholder, required, multiline };
}

export function getDraftTemplate(type: DraftDocumentType): DraftTemplate {
  const template = DRAFT_TEMPLATES.find((item) => item.id === type);
  if (!template) throw new Error(`Unknown legal draft template: ${type}`);
  return template;
}

export function getMissingRequiredFields(
  type: DraftDocumentType,
  values: Record<string, string>,
): { key: string; label: string }[] {
  return getDraftTemplate(type).fields
    .filter(({ key, required }) => required && !values[key]?.trim())
    .map(({ key, label }) => ({ key, label }));
}
