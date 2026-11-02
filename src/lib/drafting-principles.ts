/**
 * Concise drafting principles for embedding in AI prompts.
 * These are the actionable rules that guide contract analysis and rewriting.
 */
export const DRAFTING_PRINCIPLES = `
CONTRACT DRAFTING PRINCIPLES
============================

1. NO LEGALESE — Use plain English. Replace "shall" with "will" or "must." Delete
   "hereinafter," "whereas," "hereby," "witnesseth," and "aforementioned."

2. ACTIVE VOICE — Always use subject-verb-object. "Customer will pay" not "Payment
   shall be made." Every obligation must name who must act.

3. ONE IDEA PER SENTENCE — If a sentence has more than one semicolon, break it up.
   Use numbered lists for multiple obligations, conditions, or procedures.

4. DEFINE TERMS SPARINGLY — Only define terms used more than once. If a term appears
   once, write it in plain language where it appears.

5. DEFINITIONS USE "MEANS" — Write "'Term' means..." not "'Term' shall mean..."

6. NUMBERED LISTS — Use numbered lists for obligations, conditions, and procedures.
   Lists are easier to track, audit, and comply with than prose paragraphs.

7. USE HEADERS — Every section gets a descriptive header. A reader should find any
   topic by skimming the table of contents.

8. EXPLICIT RISK ALLOCATION — Every risk clause must answer: Who bears the risk?
   Under what conditions? Up to what amount?

9. PREFER MUTUAL OBLIGATIONS — Draft obligations mutually unless there is a documented
   business reason for asymmetry.

10. NO DOUBLE NEGATIVES — "Customer may not fail to..." becomes "Customer must..."

11. CLEAR TIME PERIODS — Use digits ("30 days" not "thirty (30) days"). Anchor to
    events ("within 30 days after [event]"). Use "before" and "after," not "prior to"
    and "following the occurrence of."

12. MINIMIZE CROSS-REFERENCES — If a concept needs a cross-reference, consider
    repeating it inline, restructuring so related provisions are adjacent, or
    consolidating into a single section.

TONE: Professional clarity — not casual, not archaic. A product manager should be
able to read every obligation and know what they must do.
`.trim();

/**
 * Legalese terms that should be flagged for replacement during contract review.
 * Each entry is a term to flag; the review system should suggest a plain-language alternative.
 */
export const BANNED_WORDS: string[] = [
  "hereinafter",
  "notwithstanding",
  "whereas",
  "hereby",
  "aforementioned",
  "witnesseth",
  "shall",
  "party of the first part",
  "party of the second part",
  "in the event that",
  "prior to",
  "subsequent to",
  "in accordance with",
  "for the avoidance of doubt",
  "including but not limited to",
  "mutatis mutandis",
  "inter alia",
  "pari passu",
  "ipso facto",
  "force and effect",
  "null and void",
  "terms and conditions",
  "due and payable",
  "any and all",
  "each and every",
  "made and entered into",
  "duly authorized",
  "good and valuable consideration",
  "right, title, and interest",
  "indemnify and hold harmless",
  "represent and warrant",
  "covenant and agree",
  "sole and exclusive",
  "free and clear",
  "perform and discharge",
  "stipulate and agree",
  "authorize and direct",
  "will and testament",
  "rest, residue, and remainder",
  "give, devise, and bequeath",
  "hereunder",
  "hereto",
  "herein",
  "thereof",
  "therein",
  "thereto",
  "therefrom",
  "wherein",
  "whereby",
  "whatsoever",
  "whomsoever",
  "howsoever",
];
