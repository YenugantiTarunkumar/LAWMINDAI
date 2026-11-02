'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatEvidence {
  clause: string;
  quote: string;
  pageNumber: number | null;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  answerType?: 'document' | 'general' | 'mixed';
  documentCoverage?: 'supported' | 'not_found' | 'not_applicable';
  evidence?: ChatEvidence[];
}

interface ChatApiResponse {
  answer: string;
  answerType: 'document' | 'general' | 'mixed';
  documentCoverage: 'supported' | 'not_found' | 'not_applicable';
  evidence: ChatEvidence[];
}

interface DocumentChatProps {
  reviewId?: string;
  documentText?: string;
}

const SUGGESTED_QUESTIONS = [
  'Summarize this agreement.',
  'What are my payment obligations?',
  'Can either party terminate this agreement?',
  'What happens if payment is delayed?',
  'Does this agreement contain an indemnity clause?',
  'Which clauses expose me to high risk?',
  'What important clauses are missing?',
  'What are the responsibilities of each party?',
  'Explain the liability clause in simple English.',
  'Suggest safer wording for this provision.',
];
const MAX_VISIBLE_MESSAGES = 40;

function isChatApiResponse(value: unknown): value is ChatApiResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const response = value as Record<string, unknown>;
  return (
    typeof response.answer === 'string' &&
    ['document', 'general', 'mixed'].includes(response.answerType as string) &&
    ['supported', 'not_found', 'not_applicable'].includes(
      response.documentCoverage as string,
    ) &&
    Array.isArray(response.evidence) &&
    response.evidence.every((evidence) => {
      if (typeof evidence !== 'object' || evidence === null) return false;
      const citation = evidence as Record<string, unknown>;
      return (
        typeof citation.clause === 'string' &&
        typeof citation.quote === 'string' &&
        (citation.pageNumber === null ||
          (Number.isInteger(citation.pageNumber) &&
            (citation.pageNumber as number) > 0))
      );
    })
  );
}

export default function DocumentChat({
  reviewId,
  documentText,
}: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const canSend = Boolean(reviewId || documentText?.trim());

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  async function sendQuestion(text = question) {
    const trimmedQuestion = text.trim();
    if (!trimmedQuestion || loading || !canSend) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          documentText: reviewId ? undefined : documentText,
          question: trimmedQuestion,
          history: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : `Chat request failed (${response.status}).`;
        throw new Error(message);
      }
      if (!isChatApiResponse(result)) {
        throw new Error('The chat service returned an invalid answer. Please retry.');
      }

      setMessages((current) => [
        ...current.slice(-(MAX_VISIBLE_MESSAGES - 2)),
        { role: 'user', content: trimmedQuestion },
        {
          role: 'assistant',
          content: result.answer,
          answerType: result.answerType,
          documentCoverage: result.documentCoverage,
          evidence: result.evidence,
        },
      ]);
      setQuestion('');
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send your question. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="document-chat-title"
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
        <div>
          <h3
            id="document-chat-title"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Ask about this agreement
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Answers use retrieved agreement passages and show their source.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setQuestion('');
            setError(null);
          }}
          disabled={messages.length === 0 || loading}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear conversation
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        className="max-h-[34rem] min-h-44 space-y-4 overflow-y-auto bg-zinc-50/70 px-4 py-5 dark:bg-zinc-950/30 sm:px-6"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl py-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3.75h6m-9.75 7.5 2.67-3.56A8.25 8.25 0 1 1 12 20.25c-1.97 0-3.78-.69-5.2-1.84L3.75 19.5Z"
                />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Ask a question about this agreement
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              You can ask follow-up questions. Supporting quotations and PDF page
              numbers appear with answers when available.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[85%] ${
                message.role === 'user'
                  ? 'rounded-br-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === 'assistant' &&
                message.documentCoverage === 'not_found' && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    No supporting provision was located in the passages
                    retrieved. This does not establish that the agreement
                    contains no such provision.
                  </p>
                )}
              {message.role === 'assistant' &&
                message.answerType === 'general' && (
                  <p className="mt-3 text-xs font-medium text-blue-700 dark:text-blue-300">
                    General information — not a finding about this agreement.
                  </p>
                )}
              {message.role === 'assistant' &&
                message.answerType === 'mixed' && (
                  <p className="mt-3 text-xs font-medium text-blue-700 dark:text-blue-300">
                    Includes general legal information, separate from agreement
                    findings.
                  </p>
                )}
              {message.role === 'assistant' &&
                message.evidence &&
                message.evidence.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-700">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Agreement evidence
                    </p>
                    {message.evidence.map((citation, evidenceIndex) => (
                      <blockquote
                        key={`${citation.clause}-${evidenceIndex}`}
                        className="rounded-lg border-l-2 border-emerald-500 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"
                      >
                        <p className="mb-1 font-semibold">
                          {citation.clause}
                          {citation.pageNumber !== null &&
                            ` · Page ${citation.pageNumber}`}
                        </p>
                        <p className="italic">&ldquo;{citation.quote}&rdquo;</p>
                      </blockquote>
                    ))}
                  </div>
                )}
            </div>
          </article>
        ))}

        {loading && (
          <div
            role="status"
            className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
            </span>
            Reviewing relevant agreement passages…
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:overflow-visible sm:px-6">
          {SUGGESTED_QUESTIONS.map((suggestedQuestion) => (
            <button
              key={suggestedQuestion}
              type="button"
              onClick={() => void sendQuestion(suggestedQuestion)}
              disabled={loading || !canSend}
              className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
            >
              {suggestedQuestion}
            </button>
          ))}
        </div>
      )}

      <form
        className="border-t border-zinc-100 p-4 dark:border-zinc-800 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          void sendQuestion();
        }}
      >
        {error && (
          <p role="alert" className="mb-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="agreement-chat-input" className="sr-only">
            Ask a question about this agreement
          </label>
          <textarea
            id="agreement-chat-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendQuestion();
              }
            }}
            maxLength={1_000}
            rows={2}
            placeholder="Ask a question or follow up…"
            disabled={!canSend || loading}
            className="min-h-12 flex-1 resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800 dark:disabled:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading || !canSend}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 14-7-4 14-3-6-7-1Z"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          AI-generated information is not legal advice. Document answers are
          limited to retrieved text; general information is labeled separately.
        </p>
      </form>
    </section>
  );
}
