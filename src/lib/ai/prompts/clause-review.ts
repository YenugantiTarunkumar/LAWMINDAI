import {
  formatUntrustedDocument,
  getContractReviewGuidance,
} from './contract-review-guidelines';

/**
 * Prompt for the "clause-by-clause" mode.
 *
 * Similar to a full review but emphasises granular, per-clause analysis with
 * deeper reasoning for each provision.
 */
export function getClauseReviewPrompt(contractText: string): string {
  return `Perform a granular clause-by-clause review of this Indian commercial service/vendor agreement.

## Instructions

1. Identify distinct contractual provisions without duplicating text.
2. Analyze every applicable topic and separately list gaps and ambiguous wording.
3. Quote exact text and assign proportionate risk; do not treat stylistic preferences as statutory violations.
4. Explain why the clause matters, likely consequences, concrete next action, and evidence limitations.
5. Set overallRiskLevel to the highest substantiated clause or missing-clause risk.
6. Include page references only from explicit [Page N] markers.
7. Follow the strict JSON schema and legal-reference allowlist in the system instructions.

${getContractReviewGuidance()}

## Document text (untrusted)

${formatUntrustedDocument(contractText)}`;
}
