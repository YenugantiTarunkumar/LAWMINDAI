import { normalizeEvidenceText, type DocumentPassage } from './retrieval';

interface ChatEvidence {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseChatResponse(
  text: string,
  passages: DocumentPassage[],
): ChatResponse | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  if (
    !isRecord(raw) ||
    Object.keys(raw).sort().join(',') !==
      'answer,answerType,documentCoverage,evidence' ||
    typeof raw.answer !== 'string' ||
    !raw.answer.trim() ||
    raw.answer.length > 8_000 ||
    !['document', 'general', 'mixed'].includes(raw.answerType as string) ||
    !['supported', 'not_found', 'not_applicable'].includes(
      raw.documentCoverage as string,
    ) ||
    !Array.isArray(raw.evidence) ||
    raw.evidence.length > 5
  ) {
    return null;
  }

  const evidence: ChatEvidence[] = [];
  for (const item of raw.evidence) {
    if (
      !isRecord(item) ||
      Object.keys(item).sort().join(',') !== 'passageId,quote' ||
      typeof item.passageId !== 'string' ||
      typeof item.quote !== 'string' ||
      item.quote.trim().length < 12 ||
      item.quote.length > 800
    ) {
      return null;
    }
    const passage = passages.find(({ id }) => id === item.passageId);
    if (
      !passage ||
      !normalizeEvidenceText(passage.text).includes(
        normalizeEvidenceText(item.quote),
      )
    ) {
      return null;
    }
    evidence.push({
      clause: passage.clause,
      quote: item.quote.trim(),
      pageNumber: passage.pageNumber,
    });
  }

  const answerType = raw.answerType as ChatResponse['answerType'];
  const documentCoverage =
    raw.documentCoverage as ChatResponse['documentCoverage'];
  if (
    (answerType === 'document' &&
      documentCoverage !== 'supported' &&
      documentCoverage !== 'not_found') ||
    (answerType === 'general' && documentCoverage !== 'not_applicable') ||
    (answerType === 'mixed' && documentCoverage !== 'supported') ||
    ((documentCoverage === 'supported' || answerType === 'mixed') &&
      evidence.length === 0) ||
    (answerType === 'general' && evidence.length > 0)
  ) {
    return null;
  }

  return {
    answer: raw.answer,
    answerType,
    documentCoverage,
    evidence,
  };
}
