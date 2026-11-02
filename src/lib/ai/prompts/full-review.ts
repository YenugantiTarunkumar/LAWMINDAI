import {
  formatUntrustedDocument,
  getContractReviewGuidance,
} from './contract-review-guidelines';

/**
 * Prompt for the "full-review" mode.
 *
 * Instructs the LLM to perform a comprehensive review of the entire contract
 * and return structured JSON.
 */
export function getFullReviewPrompt(contractText: string): string {
  return `Perform a comprehensive Indian-law-oriented commercial review of this service/vendor agreement.

## Instructions

1. Review the complete supplied text. Do not infer text that was not extracted.
2. Analyze all applicable topics and separately identify present clauses, missing clauses, and ambiguous provisions.
3. Give proportionate risk ratings. Keep existing clause risks, missing provisions, ambiguous provisions, and informational observations distinct. A drafting gap alone is not proof of illegality.
4. Quote existing clauses exactly; do not duplicate a quote across finding categories. Include a replacement only when it does not invent a location, interest benchmark, rate, amount, time period, or other unsupported fact.
5. Provide a concise executive summary, practical recommendations, and evidence limitations.
6. Follow all required JSON fields, evidence rules, drafting-quality criteria, and citation caveats in the system instructions.

${getContractReviewGuidance()}

## Document text (untrusted)

${formatUntrustedDocument(contractText)}`;
}
