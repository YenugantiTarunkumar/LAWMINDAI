export interface DocumentPassage {
  id: string;
  text: string;
  clause: string;
  pageNumber: number | null;
}

interface ScoredPassage {
  passage: DocumentPassage;
  score: number;
  index: number;
}

const CHUNK_TARGET_LENGTH = 1_200;
const MAX_PASSAGES = 8;
const PAGE_MARKER = /^\[Page\s+(\d+)\]\s*$/i;

const QUERY_EXPANSIONS: Record<string, string[]> = {
  party: [
    'parties',
    'contracting',
    'between',
    'provider',
    'customer',
    'vendor',
    'supplier',
    'client',
  ],
  parties: [
    'party',
    'contracting',
    'between',
    'provider',
    'customer',
    'vendor',
    'supplier',
    'client',
  ],
  indemnity: ['indemnification', 'indemnify', 'indemnifies', 'hold', 'harmless'],
  indemnification: ['indemnity', 'indemnify', 'hold', 'harmless'],
  terminate: ['termination', 'terminates', 'terminated', 'expiry', 'expiration'],
  termination: ['terminate', 'expiry', 'expiration', 'notice'],
  payment: ['pay', 'pays', 'invoice', 'fee', 'charges', 'consideration'],
  liability: ['liable', 'damages', 'loss', 'limitation', 'cap'],
  confidentiality: ['confidential', 'disclosure', 'proprietary'],
  renewal: ['renew', 'renewal', 'extend', 'extension', 'term'],
  dispute: ['disputes', 'arbitration', 'jurisdiction', 'court', 'resolution'],
  obligation: ['obligations', 'responsible', 'responsibilities', 'shall', 'must'],
};

const BROAD_QUESTION =
  /\b(summar(?:y|ize|ise)|overview|responsibilit(?:y|ies)|obligations|high risk|risky clauses|missing clauses|important clauses)\b/i;

export function retrieveDocumentPassages(
  documentText: string,
  question: string,
  history: string[] = [],
): DocumentPassage[] {
  const chunks = chunkDocument(documentText);
  if (chunks.length === 0) return [];

  const retrievalQuery = [question, ...history.slice(-3)].join(' ');
  const terms = expandTerms(tokenize(retrievalQuery));
  const documentFrequency = new Map<string, number>();

  for (const { text } of chunks) {
    const uniqueTerms = new Set(tokenize(text));
    for (const term of terms) {
      if (uniqueTerms.has(term)) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }
  }

  const scored = chunks.map((passage, index): ScoredPassage => {
    const passageTerms = tokenize(passage.text);
    const counts = new Map<string, number>();
    for (const term of passageTerms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }

    let score = 0;
    for (const term of terms) {
      const count = counts.get(term) ?? 0;
      if (count > 0) {
        const inverseFrequency =
          Math.log(1 + chunks.length / (1 + (documentFrequency.get(term) ?? 0)));
        score += (1 + Math.log(count)) * inverseFrequency;
      }
    }

    const normalizedQuery = retrievalQuery.trim().toLowerCase();
    if (normalizedQuery.length >= 5 && passage.text.toLowerCase().includes(normalizedQuery)) {
      score += 12;
    }

    return { passage, score, index };
  });

  const matching = scored
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  if (BROAD_QUESTION.test(question)) {
    return selectDistributedPassages(matching.length > 0 ? matching : scored, chunks.length);
  }

  return matching.slice(0, MAX_PASSAGES).map(({ passage }) => passage);
}

export function normalizeEvidenceText(text: string): string {
  return text
    .replace(/\[Page\s+\d+\]\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function chunkDocument(documentText: string): DocumentPassage[] {
  const passages: DocumentPassage[] = [];
  let pageNumber: number | null = null;
  let clause = 'Document passage';
  let pageText = '';

  const flushPage = () => {
    if (!pageText.trim()) return;
    const paragraphs = pageText.split(/\n\s*\n/);
    let current = '';

    const flushChunk = () => {
      const text = current.trim();
      if (!text) return;
      passages.push({
        id: `passage-${passages.length + 1}`,
        text: `${pageNumber === null ? '' : `[Page ${pageNumber}]\n`}${text}`,
        clause,
        pageNumber,
      });
      current = '';
    };

    for (const paragraph of paragraphs) {
      const normalizedParagraph = paragraph.trim();
      if (!normalizedParagraph) continue;

      const heading = findClauseHeading(normalizedParagraph);
      if (heading) clause = heading;

      if (normalizedParagraph.length > CHUNK_TARGET_LENGTH) {
        flushChunk();
        for (
          let start = 0;
          start < normalizedParagraph.length;
          start += CHUNK_TARGET_LENGTH
        ) {
          const text = normalizedParagraph
            .slice(start, start + CHUNK_TARGET_LENGTH)
            .trim();
          if (text) {
            passages.push({
              id: `passage-${passages.length + 1}`,
              text: `${pageNumber === null ? '' : `[Page ${pageNumber}]\n`}${text}`,
              clause,
              pageNumber,
            });
          }
        }
        continue;
      }

      if (
        current.length > 0 &&
        current.length + normalizedParagraph.length + 2 > CHUNK_TARGET_LENGTH
      ) {
        flushChunk();
      }
      current = current ? `${current}\n\n${normalizedParagraph}` : normalizedParagraph;
    }
    flushChunk();
  };

  for (const line of documentText.split(/\r?\n/)) {
    const pageMarker = line.trim().match(PAGE_MARKER);
    if (pageMarker) {
      flushPage();
      pageText = '';
      pageNumber = Number(pageMarker[1]);
      continue;
    }
    pageText += `${line}\n`;
  }
  flushPage();

  return passages;
}

function selectDistributedPassages(
  scored: ScoredPassage[],
  totalPassages: number,
): DocumentPassage[] {
  if (scored.length <= MAX_PASSAGES) {
    return scored.map(({ passage }) => passage);
  }

  const selected: ScoredPassage[] = [];
  const interval = Math.max(1, Math.floor(totalPassages / MAX_PASSAGES));
  for (let position = 0; position < totalPassages && selected.length < 4; position += interval) {
    const passage = scored.find((candidate) => candidate.index === position);
    if (passage) selected.push(passage);
  }

  for (const candidate of scored) {
    if (selected.length >= MAX_PASSAGES) break;
    if (!selected.some(({ index }) => index === candidate.index)) {
      selected.push(candidate);
    }
  }

  return selected
    .sort((left, right) => left.index - right.index)
    .map(({ passage }) => passage);
}

function findClauseHeading(paragraph: string): string | null {
  const firstLine = paragraph.split(/\r?\n/, 1)[0].trim();
  if (
    firstLine.length <= 120 &&
    (/^(?:\d+(?:\.\d+)*|[A-Z])[\).:-]?\s+\S/.test(firstLine) ||
      /^(?:section|clause|article)\s+[\w.-]+/i.test(firstLine))
  ) {
    return firstLine;
  }
  return null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[\p{L}\p{N}]{3,}/gu) ?? [];
}

function expandTerms(terms: string[]): Set<string> {
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of QUERY_EXPANSIONS[term] ?? []) {
      expanded.add(synonym);
    }
  }
  return expanded;
}
