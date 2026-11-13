import { z } from 'zod';
import { normalizeEvidenceText, type DocumentPassage } from './retrieval';

export interface ChatEvidence {
  clause: string;
  quote: string;
  pageNumber: number | null;
}

export interface ChatResponse {
  answer: string;
  answerType: 'document' | 'general' | 'mixed';
  documentCoverage: 'supported' | 'not_found' | 'not_applicable';
  evidence: ChatEvidence[];
}

/**
 * Robustly extracts a JSON object or array from raw model text.
 * Handles direct JSON, markdown code fences (```json ... ```), and raw text with embedded JSON.
 */
export function extractJsonFromText(text: string): unknown {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to pattern extraction
  }

  // 2. Markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // 3. Outermost JSON object extraction: find first '{' and last '}'
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Verifies whether a purported quote actually exists within the given passage text.
 * Handles exact normalized matches, quotes with ellipses ("..."), and subtle punctuation variations.
 * Never converts unverified text or paraphrases into verified quotations.
 */
export function verifyQuoteInPassage(quote: string, passageText: string): boolean {
  if (!quote || !passageText) return false;
  const trimmedQuote = quote.trim();
  if (trimmedQuote.length < 2) return false;

  const normalizedPassage = normalizeEvidenceText(passageText);
  const normalizedQuote = normalizeEvidenceText(trimmedQuote);

  if (!normalizedQuote) return false;

  // 1. Direct normalized substring check
  if (normalizedPassage.includes(normalizedQuote)) {
    return true;
  }

  // 2. Ellipsis support: if the quote contains "...", "…", or sequential dots
  // Verify that every segment appears in sequential order within the passage text
  const segments = normalizedQuote
    .split(/(?:\.\.\.+|…|\.\s+\.\s+\.)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length > 1) {
    let searchFrom = 0;
    let allFound = true;
    for (const segment of segments) {
      const idx = normalizedPassage.indexOf(segment, searchFrom);
      if (idx === -1) {
        allFound = false;
        break;
      }
      searchFrom = idx + segment.length;
    }
    if (allFound) {
      return true;
    }
  }

  // 3. Punctuation & quote normalization:
  // Normalize smart quotes, dashes, hyphens, colons, semicolons
  const stripPunctuation = (str: string) =>
    str.replace(/[\u2018\u2019\u201C\u201D"''`.,;:!?-]/g, ' ').replace(/\s+/g, ' ').trim();

  const strippedPassage = stripPunctuation(normalizedPassage);
  const strippedQuote = stripPunctuation(normalizedQuote);

  if (strippedQuote.length >= 4 && strippedPassage.includes(strippedQuote)) {
    return true;
  }

  return false;
}

const RawEvidenceItemSchema = z
  .object({
    passageId: z.unknown().optional(),
    id: z.unknown().optional(),
    quote: z.unknown().optional(),
    text: z.unknown().optional(),
  })
  .passthrough();

const RawResponseSchema = z
  .object({
    answer: z.unknown().optional(),
    content: z.unknown().optional(),
    text: z.unknown().optional(),
    response: z.unknown().optional(),
    answerType: z.unknown().optional(),
    documentCoverage: z.unknown().optional(),
    evidence: z.unknown().optional(),
  })
  .passthrough();

/**
 * Safely parses and validates Gemini's chat response.
 * - Resilient against markdown code fences, trailing comments, and minor key variations.
 * - Rigorously verifies document evidence against retrieved passages; drops unverified evidence without crashing.
 * - Safely normalizes answerType and documentCoverage.
 * - Falls back to clean text answer if AI returned plain English instead of JSON.
 */
export function parseChatResponse(
  text: string,
  passages: DocumentPassage[],
): ChatResponse | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const rawJson = extractJsonFromText(trimmed);

  if (rawJson && typeof rawJson === 'object') {
    const parseResult = RawResponseSchema.safeParse(rawJson);
    if (parseResult.success) {
      const data = parseResult.data;
      const rawAnswer = data.answer ?? data.content ?? data.text ?? data.response;

      if (typeof rawAnswer === 'string' && rawAnswer.trim()) {
        const answer = rawAnswer.trim();

        // Process and verify evidence items
        const verifiedEvidence: ChatEvidence[] = [];
        const seenQuotes = new Set<string>();

        if (Array.isArray(data.evidence)) {
          for (const rawItem of data.evidence) {
            const itemParsed = RawEvidenceItemSchema.safeParse(rawItem);
            if (!itemParsed.success) continue;

            const item = itemParsed.data;
            const passageId = typeof item.passageId === 'string' ? item.passageId : typeof item.id === 'string' ? item.id : null;
            const quoteText = typeof item.quote === 'string' ? item.quote : typeof item.text === 'string' ? item.text : null;

            if (!passageId || !quoteText || !quoteText.trim()) continue;

            const passage = passages.find((p) => p.id === passageId);
            if (!passage) continue;

            if (verifyQuoteInPassage(quoteText, passage.text)) {
              const cleanedQuote = quoteText.trim();
              const dedupeKey = `${passage.id}:${cleanedQuote.toLowerCase()}`;
              if (!seenQuotes.has(dedupeKey)) {
                seenQuotes.add(dedupeKey);
                verifiedEvidence.push({
                  clause: passage.clause,
                  quote: cleanedQuote,
                  pageNumber: passage.pageNumber,
                });
              }
            }
            if (verifiedEvidence.length >= 5) break;
          }
        }

        // Determine normalized documentCoverage
        const rawCoverage = String(data.documentCoverage ?? '').toLowerCase().trim();
        const rawType = String(data.answerType ?? '').toLowerCase().trim();

        // If the model claimed the document supports this answer, but not a single evidence quote
        // could be verified from the retrieved passages, reject the response to avoid presenting
        // ungrounded or fabricated document statements as supported.
        if (rawCoverage === 'supported' && verifiedEvidence.length === 0) {
          return null;
        }

        let documentCoverage: ChatResponse['documentCoverage'];
        if (verifiedEvidence.length > 0) {
          documentCoverage = 'supported';
        } else if (rawCoverage === 'not_found') {
          documentCoverage = 'not_found';
        } else if (rawCoverage === 'not_applicable' || rawType === 'general') {
          documentCoverage = 'not_applicable';
        } else {
          documentCoverage = 'not_found';
        }

        // Determine normalized answerType
        let answerType: ChatResponse['answerType'];
        if (rawType === 'general') {
          answerType = 'general';
        } else if (rawType === 'mixed') {
          answerType = verifiedEvidence.length > 0 ? 'mixed' : (documentCoverage === 'not_found' ? 'document' : 'general');
        } else {
          answerType = (verifiedEvidence.length > 0 || documentCoverage === 'not_found') ? 'document' : 'general';
        }

        return {
          answer,
          answerType,
          documentCoverage,
          evidence: verifiedEvidence,
        };
      }
    }
  }

  // Graceful fallback for non-JSON conversational text returned by Gemini
  // If the model answered directly in plain text without formatting, preserve the answer safely
  // with documentCoverage marked as not_found/not_applicable so the user receives their answer.
  if (trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return {
      answer: trimmed,
      answerType: 'general',
      documentCoverage: 'not_found',
      evidence: [],
    };
  }

  return null;
}
