/**
 * Prompt for the "redline" mode.
 *
 * Focuses on generating before/after comparisons for every clause that needs
 * revision. The proposedRevision field contains the full rewritten clause.
 */
export function getRedlinePrompt(contractText: string): string {
  return `Generate an Indian commercial contract review with original-versus-revised text comparisons.

## Instructions

1. Quote the exact source wording for every clause that needs a change.
2. Write a complete replacement clause rather than diff notation.
3. Preserve proportionate risk ratings and identify missing clauses and ambiguous provisions separately.
4. Prioritize substantive business/legal issues over style.
5. Follow the strict JSON schema and legal-reference allowlist in the system instructions.

${getContractReviewGuidance()}

## Document text (untrusted)

${formatUntrustedDocument(contractText)}`;
}
import {
  formatUntrustedDocument,
  getContractReviewGuidance,
} from './contract-review-guidelines';
