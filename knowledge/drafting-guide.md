# Contract Drafting Guide

> **Purpose**: This guide defines the drafting philosophy and rules that ground terms-ai's contract analysis and rewriting capabilities. Every suggestion the tool makes traces back to a principle documented here.

---

## 1. Philosophy

Contracts are business documents first and legal instruments second. A contract that only a lawyer can read is a contract that the people who must *perform* it cannot follow. Clarity is not a luxury — it is risk management. Ambiguity breeds disputes; plain language prevents them.

**Core beliefs:**

- **Readable contracts are enforceable contracts.** Courts routinely enforce plain-language agreements. No court has ever refused to enforce a contract because it was *too clear*.
- **Both parties should understand every obligation without legal counsel.** If a product manager, engineer, or procurement lead cannot read the agreement and know what they must do, the contract has failed.
- **Precision and simplicity are not opposites.** You can be precise — specifying exact dollar amounts, deadlines, and conditions — while still using everyday English.
- **Shorter is better, all else being equal.** Every unnecessary word is a hiding place for ambiguity.

---

## 2. Drafting Rules

### Rule 1: No Legalese

**Banned terms and their replacements:**

| Banned Term | Replacement |
|---|---|
| hereinafter | *(delete — just use the defined term)* |
| notwithstanding | despite / even if / regardless of |
| whereas | *(delete — use a "Background" section instead)* |
| hereby | *(delete — it adds nothing)* |
| aforementioned | *(delete — use the specific term or reference)* |
| witnesseth | *(delete entirely)* |
| shall | will / must |
| party of the first part | *(use the party's name or defined role)* |
| in the event that | if |
| prior to | before |
| subsequent to | after |
| in accordance with | under / following |
| for the avoidance of doubt | *(delete — if the meaning is clear, this is unnecessary; if it's not, fix the underlying text)* |
| including but not limited to | including (already non-exhaustive at law) |
| mutatis mutandis | with necessary changes |
| inter alia | among other things |
| pari passu | equally / on equal footing |
| ipso facto | by that fact / automatically |
| force and effect | *(delete — "in effect" is sufficient)* |
| null and void | void |
| terms and conditions | terms |
| due and payable | due |
| any and all | all / any |
| each and every | each / every |
| made and entered into | entered into / signed |

**Anti-pattern:**

> ❌ **Before:** "Whereas, the Party of the First Part (hereinafter referred to as 'Licensor') hereby grants to the Party of the Second Part (hereinafter referred to as 'Licensee'), notwithstanding any provision to the contrary, a non-exclusive license..."
>
> ✅ **After:** "Licensor grants Licensee a non-exclusive license..."

---

### Rule 2: Active Voice Always

Use subject-verb-object order. The reader should always know *who* does *what*.

**Anti-pattern:**

> ❌ **Before:** "Payment shall be made by Customer within thirty (30) days of receipt of invoice."
>
> ✅ **After:** "Customer will pay each invoice within 30 days after receiving it."

> ❌ **Before:** "Written notice must be provided to the non-breaching party."
>
> ✅ **After:** "The breaching party must send written notice to the other party."

> ❌ **Before:** "The Services are warranted to be free from material defects."
>
> ✅ **After:** "Provider warrants that the Services will be free from material defects."

**Why it matters:** Passive voice hides the actor. In a contract, every obligation must have an identifiable obligor. If you cannot name who must act, the obligation is unenforceable in practice.

---

### Rule 3: One Idea Per Sentence

If a sentence contains more than one semicolon, it covers too many ideas. Break it up. Long sentences hide conditions and create parsing ambiguity — both for humans and for AI analysis.

**Anti-pattern:**

> ❌ **Before:** "Customer will pay all invoices within 30 days; provided, however, that if Customer disputes an invoice in good faith, Customer may withhold the disputed amount; and further provided that Customer will pay all undisputed amounts by the original due date; and in no event will Customer withhold more than 15% of any single invoice."
>
> ✅ **After:**
>
> 1. Customer will pay each invoice within 30 days after receiving it.
> 2. If Customer disputes an invoice in good faith, Customer may withhold only the disputed amount.
> 3. Customer will pay all undisputed amounts by the original due date.
> 4. Customer may not withhold more than 15% of any single invoice.

**Test:** Read the sentence aloud. If you need to take a breath in the middle, it is too long.

---

### Rule 4: Define Terms Only When Used More Than Once

Every defined term adds cognitive load. If a term appears only once in the agreement, do not define it — just write it in plain language where it appears.

**Anti-pattern:**

> ❌ **Before:** "'Delivery Date' means the date on which Provider delivers the final Deliverables to Customer. Provider will deliver the final Deliverables on the Delivery Date."
>
> ✅ **After:** "Provider will deliver the final Deliverables by [date]."

**Corollary:** If your definitions section is longer than two pages, you probably have too many defined terms.

---

### Rule 5: Use "means" Not "shall mean" in Definitions

Definitions describe what a term *is*. They do not impose obligations. "Shall" implies duty; definitions have no duty — they are declarative.

**Anti-pattern:**

> ❌ **Before:** "'Confidential Information' shall mean and include any and all information, whether written or oral, that is designated as confidential..."
>
> ✅ **After:** "'Confidential Information' means any information, whether written or oral, that either party designates as confidential..."

---

### Rule 6: Use Numbered Lists for Obligations, Conditions, and Procedures

Prose paragraphs that embed multiple obligations are harder to track, audit, and comply with. Numbered lists make each obligation discrete and auditable.

**Anti-pattern:**

> ❌ **Before:** "Upon termination of this Agreement, Customer will return all Confidential Information, destroy all copies thereof, certify in writing that it has done so, and cooperate with Provider to transition any ongoing services."
>
> ✅ **After:** "When this Agreement ends, Customer will:
>
> 1. Return all Confidential Information to Provider.
> 2. Destroy all copies of Confidential Information in its possession.
> 3. Send Provider a written certification confirming destruction.
> 4. Cooperate with Provider to transition any ongoing services."

---

### Rule 7: Use Headers and Sub-headers to Organize

Every section should have a descriptive header. A reader should be able to skim the table of contents and find any topic in under 10 seconds.

**Good header structure:**

```
1. Services
   1.1 Scope of Services
   1.2 Service Levels
   1.3 Support
2. Fees and Payment
   2.1 Fees
   2.2 Payment Terms
   2.3 Taxes
3. Data Protection
   3.1 Processing of Customer Data
   3.2 Security Measures
   3.3 Breach Notification
```

**Anti-pattern:** Contracts titled "MISCELLANEOUS" that pack unrelated provisions (governing law, assignment, notices, force majeure, entire agreement) into a single section. Break each into its own headed section.

---

### Rule 8: Risk Allocation Must Be Explicit

Every risk-bearing clause must answer three questions:

1. **Who** bears the risk?
2. **Under what conditions** does the risk arise?
3. **Up to what amount** (cap, carve-out, or unlimited)?

**Anti-pattern:**

> ❌ **Before:** "Neither party will be liable for any indirect, consequential, or incidental damages arising out of or related to this Agreement."
>
> ✅ **After:** "Neither party will be liable to the other for indirect, consequential, or incidental damages arising from this Agreement, except that this limitation does not apply to:
>
> 1. A party's breach of its confidentiality obligations (Section 5).
> 2. A party's indemnification obligations (Section 8).
> 3. A party's willful misconduct or fraud.
>
> Each party's total liability under this Agreement will not exceed the fees Customer paid in the 12 months before the claim arose."

---

### Rule 9: Prefer Mutual Obligations

If both parties should bear a similar obligation, draft it mutually unless there is a documented business reason for asymmetry.

**Anti-pattern:**

> ❌ **Before:** "Customer will indemnify and hold harmless Provider against all claims arising from Customer's use of the Services." *(one-sided with no reciprocal obligation)*
>
> ✅ **After:** "Each party (the 'Indemnifying Party') will defend, indemnify, and hold harmless the other party from claims arising from:
>
> 1. The Indemnifying Party's breach of this Agreement.
> 2. The Indemnifying Party's negligence or willful misconduct.
> 3. The Indemnifying Party's violation of applicable law."

**When asymmetry is justified:** Document the reason. For example, if only one party handles personal data, only that party needs a data processing obligation.

---

### Rule 10: Avoid Double Negatives

Double negatives force the reader to invert twice. Rewrite them as direct affirmative statements.

**Anti-pattern:**

> ❌ **Before:** "Customer may not fail to provide notice within 30 days."
>
> ✅ **After:** "Customer must provide notice within 30 days."

> ❌ **Before:** "Provider will not unreasonably withhold consent."
>
> ✅ **After:** "Provider will grant consent unless it has a reasonable basis to refuse." *(Note: this version is more precise — it shifts the burden of justification.)*

> ❌ **Before:** "This license is non-revocable and non-transferable."
>
> ✅ **After:** "This license is irrevocable. Customer may not transfer it."

---

### Rule 11: Time Periods — Use Clear, Concrete Language

Spell out numbers as digits, not words. Anchor deadlines to specific events. Remove redundant parenthetical number-word pairs.

**Anti-pattern:**

> ❌ **Before:** "Within thirty (30) calendar days following the occurrence of the event giving rise to such claim..."
>
> ✅ **After:** "Within 30 days after the event that caused the claim..."

**Rules for time periods:**

- Use "days" (calendar days are the default; specify "business days" only when intended).
- Use "after [event]" not "following the occurrence of [event]."
- Use "before [event]" not "prior to [event]."
- Use digits: "30 days" not "thirty (30) days."
- Always anchor to a triggering event: "within 30 days after Customer sends notice" — not "within 30 days."

---

### Rule 12: Minimize Cross-References

Cross-references make contracts harder to read and create maintenance risks when sections are renumbered. If a concept needs a cross-reference, consider whether you can:

1. **Repeat** the concept briefly inline.
2. **Restructure** so the related provisions are adjacent.
3. **Consolidate** into a single section.

**Anti-pattern:**

> ❌ **Before:** "Subject to Section 4.2(b)(iii) and the limitations set forth in Section 7.1 (as modified by Section 12.4), Provider's obligations under Section 3.1 will terminate..."
>
> ✅ **After:** "Provider's obligation to provide Support Services ends when this Agreement ends, except that Provider will continue to provide support for any open tickets at the time of termination until those tickets are resolved (up to 30 days)."

---

## 3. Structural Guidance

### Recommended Agreement Structure

1. **Parties and Effective Date** — Who is entering the agreement and when does it start?
2. **Background** (optional) — Brief context. Replace "WHEREAS" recitals.
3. **Definitions** — Only terms used more than once.
4. **Services / Scope** — What is being provided.
5. **Fees and Payment** — How much and when.
6. **Term and Termination** — How long and how to end it.
7. **Intellectual Property** — Who owns what.
8. **Confidentiality** — What must be kept secret and for how long.
9. **Data Protection** — If personal data is involved.
10. **Representations and Warranties** — What each party promises is true.
11. **Indemnification** — Who covers whom for what losses.
12. **Limitation of Liability** — Caps and exclusions.
13. **General Provisions** — Assignment, notices, governing law, dispute resolution, amendments, entire agreement.
14. **Signatures**

### Drafting Checklist

Before finalizing any contract, verify:

- [ ] Every obligation has a clear obligor (who must act).
- [ ] Every deadline is anchored to a specific event.
- [ ] Every defined term is used more than once.
- [ ] No banned legalese terms remain.
- [ ] Risk allocation answers who, what conditions, and what cap.
- [ ] All lists use numbered format.
- [ ] Sentences pass the "read aloud" test.
- [ ] Cross-references are minimized and all reference correct section numbers.
- [ ] Mutual obligations are used unless asymmetry is justified and documented.
- [ ] No double negatives remain.

---

## 4. Tone and Register

The goal is **professional clarity** — not casual, not archaic.

| Register | Example | Appropriate? |
|---|---|---|
| Too casual | "If you mess up, you gotta pay us back." | ❌ |
| Too archaic | "In the event of a material breach by the Licensee hereunder, the Licensee shall indemnify and hold harmless the Licensor..." | ❌ |
| Professional clarity | "If Customer materially breaches this Agreement, Customer will indemnify Provider for resulting losses." | ✅ |

---

## 5. AI-Specific Drafting Considerations

When reviewing or drafting provisions related to AI and machine learning:

- **Be specific about data usage.** "Provider will not use Customer Data to train AI models" is clear. "Provider will use Customer Data only as necessary to provide the Services" is ambiguous when the "Services" include AI features.
- **Distinguish model inputs from model outputs.** Who owns the input prompts? Who owns the generated output? These are separate questions requiring separate answers.
- **Address accuracy.** AI outputs may be inaccurate. The contract should allocate the risk of acting on AI-generated content.
- **Human oversight.** If regulatory frameworks require human-in-the-loop (e.g., EU AI Act for high-risk systems), the contract should reflect that requirement.

---

*This guide is open-source and intended to be customized. Fork this repository and adapt these rules to your organization's preferences, jurisdiction, and risk tolerance.*
