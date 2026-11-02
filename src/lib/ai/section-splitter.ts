/**
 * Section splitter for long commercial agreements.
 *
 * Divides agreements into manageable chunks along logical boundaries
 * (clauses, sections, articles, page markers, or paragraphs) without
 * severing individual sentences or clauses.
 */

export interface AgreementSection {
  index: number;
  total: number;
  title: string;
  text: string;
  characterCount: number;
}

export const SECTION_SPLIT_THRESHOLD = 8_000;
export const TARGET_SECTION_CHAR_SIZE = 5_000;
export const MAX_SECTION_CHAR_SIZE = 9_000;

// Regex to identify starting points of clauses / sections
const CLAUSE_BOUNDARY_REGEX =
  /(?:^|\n\n+)(?=(?:(?:Clause|Section|Article|ARTICLE)\s+[\dA-Za-z\.]+|(?:\d{1,2}\.|\(\d{1,2}\))\s+[A-Z]|\[Page\s+\d+\]|[A-Z\s]{4,}:))/i;

/**
 * Splits text into segments at logical headings or paragraph breaks.
 */
function splitIntoRawSegments(text: string): string[] {
  // If the text contains recognizable clause or section markers, split by them
  const parts = text.split(CLAUSE_BOUNDARY_REGEX).map((p) => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    return parts;
  }

  // Fallback: split by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  // Fallback for single huge block: split at sentence boundaries (~4000 chars)
  const sentences: string[] = [];
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(match[0]);
    lastIndex = sentenceRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) sentences.push(remaining);
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Extracts a concise human-readable title from the beginning of a section.
 */
function extractSectionTitle(sectionText: string, index: number): string {
  const firstLine = sectionText.split('\n')[0]?.trim() ?? '';
  // Check if first line resembles a clause title
  const headingMatch = firstLine.match(
    /^(?:(?:Clause|Section|Article|ARTICLE)\s+[\dA-Za-z\.]+[^\n]{0,60}|(?:\d{1,2}\.|\(\d{1,2}\))\s+[^\n]{0,60}|\[Page\s+\d+\][^\n]{0,40})/i,
  );

  if (headingMatch && headingMatch[0].trim()) {
    return headingMatch[0].trim().replace(/\s+/g, ' ');
  }

  if (firstLine.length > 0 && firstLine.length <= 60 && !firstLine.endsWith('.')) {
    return firstLine;
  }

  return `Section ${index + 1}`;
}

/**
 * Splits a contract into manageable sections if it exceeds the threshold.
 * Returns an array of AgreementSection with 0-based indices and total count.
 */
export function splitAgreementIntoSections(
  content: string,
  threshold: number = SECTION_SPLIT_THRESHOLD,
): AgreementSection[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  // If text is within the threshold, return a single section
  if (trimmed.length <= threshold) {
    return [
      {
        index: 0,
        total: 1,
        title: extractSectionTitle(trimmed, 0),
        text: trimmed,
        characterCount: trimmed.length,
      },
    ];
  }

  const rawSegments = splitIntoRawSegments(trimmed);
  const sections: string[] = [];
  let currentAccumulator = '';

  for (const segment of rawSegments) {
    // If a single segment is extraordinarily large, split it further
    if (segment.length > MAX_SECTION_CHAR_SIZE) {
      if (currentAccumulator.trim()) {
        sections.push(currentAccumulator.trim());
        currentAccumulator = '';
      }

      // Split the oversized segment by sentence or paragraph
      const subParagraphs = segment.split(/\n\s*\n+/).filter(Boolean);
      for (const sub of subParagraphs) {
        if (currentAccumulator && currentAccumulator.length + sub.length > TARGET_SECTION_CHAR_SIZE) {
          sections.push(currentAccumulator.trim());
          currentAccumulator = sub;
        } else {
          currentAccumulator = currentAccumulator
            ? `${currentAccumulator}\n\n${sub}`
            : sub;
        }
      }
      continue;
    }

    if (
      currentAccumulator &&
      currentAccumulator.length + segment.length > TARGET_SECTION_CHAR_SIZE
    ) {
      sections.push(currentAccumulator.trim());
      currentAccumulator = segment;
    } else {
      currentAccumulator = currentAccumulator
        ? `${currentAccumulator}\n\n${segment}`
        : segment;
    }
  }

  if (currentAccumulator.trim()) {
    sections.push(currentAccumulator.trim());
  }

  // In the rare case nothing accumulated, fallback to original
  if (sections.length === 0) {
    sections.push(trimmed);
  }

  const total = sections.length;
  return sections.map((text, index) => ({
    index,
    total,
    title: extractSectionTitle(text, index),
    text,
    characterCount: text.length,
  }));
}
