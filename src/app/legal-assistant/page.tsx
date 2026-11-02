'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Plus, Scale, Send, Trash2 } from 'lucide-react';
import {
  type LegalClassification,
  type LegalCoverage,
  type LegalSource,
} from '@/lib/legal-assistant/knowledge-base';

interface AssistantAnswer {
  shortAnswer: string;
  explanation: string;
  practicalExample: string;
  conditions: string[];
  limitations: string[];
  references: (LegalSource & {
    section: string | null;
    sectionTitle: string | null;
    topics: string[];
  })[];
  coverage: LegalCoverage;
  classification: LegalClassification;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: AssistantAnswer;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ConversationMessage[];
}

const INITIAL_QUESTIONS = [
  'What is a breach of contract under Indian law?',
  'What is the difference between sections 73 and 74 of the Indian Contract Act?',
  'What are a consumer’s rights in India?',
  'What can a person do after receiving an unfair service?',
  'What is the role of an FIR?',
  'What is the purpose of the Bharatiya Sakshya Adhiniyam?',
  'Explain Article 21 of the Constitution in simple English.',
];

function isAssistantAnswer(value: unknown): value is AssistantAnswer {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const answer = value as Record<string, unknown>;
  return (
    typeof answer.shortAnswer === 'string' &&
    typeof answer.explanation === 'string' &&
    typeof answer.practicalExample === 'string' &&
    Array.isArray(answer.conditions) &&
    answer.conditions.every((item) => typeof item === 'string') &&
    Array.isArray(answer.limitations) &&
    answer.limitations.every((item) => typeof item === 'string') &&
    Array.isArray(answer.references) &&
    answer.references.every((reference) => {
      if (typeof reference !== 'object' || reference === null) return false;
      const item = reference as Record<string, unknown>;
      return (
        typeof item.id === 'string' &&
        typeof item.actName === 'string' &&
        typeof item.sourceUrl === 'string' &&
        item.sourceStatus === 'not-live-verified' &&
        (typeof item.section === 'string' || item.section === null) &&
        (typeof item.sectionTitle === 'string' || item.sectionTitle === null)
      );
    }) &&
    (answer.coverage === 'supported' ||
      answer.coverage === 'limited' ||
      answer.coverage === 'not_covered') &&
    typeof answer.classification === 'object' &&
    answer.classification !== null
  );
}

function newConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    updatedAt: Date.now(),
    messages: [],
  };
}

function formatConversationTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export default function LegalAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    newConversation(),
  ]);
  const [activeConversationId, setActiveConversationId] = useState(
    () => conversations[0].id,
  );
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = useMemo(
    () =>
      conversations.find(({ id }) => id === activeConversationId) ??
      conversations[0],
    [activeConversationId, conversations],
  );

  function startConversation() {
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setQuestion('');
    setError(null);
  }

  function clearConversation() {
    if (!activeConversation) return;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              title: 'New conversation',
              updatedAt: Date.now(),
              messages: [],
            }
          : conversation,
      ),
    );
    setQuestion('');
    setError(null);
  }

  async function askLegalQuestion(value = question) {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion || loading || !activeConversation) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/legal-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmedQuestion,
          history: activeConversation.messages.slice(-8).map(({ role, content }) => ({
            role,
            content,
          })),
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
            : `Request failed (${response.status}).`;
        throw new Error(message);
      }
      if (!isAssistantAnswer(result)) {
        throw new Error('The legal assistant returned an invalid answer. Please retry.');
      }

      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedQuestion,
      };
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.shortAnswer,
        answer: result,
      };
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                title:
                  conversation.messages.length === 0
                    ? trimmedQuestion.slice(0, 60)
                    : conversation.title,
                updatedAt: Date.now(),
                messages: [
                  ...conversation.messages,
                  userMessage,
                  assistantMessage,
                ],
              }
            : conversation,
        ),
      );
      setQuestion('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to get an answer. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  const activeMessages = activeConversation?.messages ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <Scale size={14} aria-hidden="true" />
            Indian legal information
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Legal Assistant
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Ask general questions about a limited set of Indian laws. This is
            separate from the agreement-specific Document Chat.
          </p>
        </div>
      </header>

      <div
        role="note"
        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <strong>Source verification limitation:</strong> Official India Code
        and Legislative Department portals were inaccessible during setup.
        Candidate Act and section references are not live-verified; no statutory
        text or amendments are represented as checked. Coverage is limited and
        is not a comprehensive Indian legal service.
      </div>

      <div className="grid min-h-[38rem] gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={startConversation}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus size={16} aria-hidden="true" />
            New conversation
          </button>
          <h2 className="mb-2 mt-5 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Conversation history
          </h2>
          <div className="max-h-44 space-y-1 overflow-y-auto lg:max-h-[25rem]">
            {conversations
              .slice()
              .sort((left, right) => right.updatedAt - left.updatedAt)
              .map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => {
                    setActiveConversationId(conversation.id);
                    setQuestion('');
                    setError(null);
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    conversation.id === activeConversation?.id
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="block truncate text-xs font-medium">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    {conversation.messages.length === 0
                      ? 'No messages'
                      : formatConversationTime(conversation.updatedAt)}
                  </span>
                </button>
              ))}
          </div>
          <p className="mt-4 border-t border-zinc-100 px-2 pt-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Conversations stay in memory in this browser tab and are not saved
            to your account or database.
          </p>
        </aside>

        <section className="flex min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                <BookOpen size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  General Indian law
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {activeConversation?.title ?? 'New conversation'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearConversation}
              disabled={activeMessages.length === 0 || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Trash2 size={13} aria-hidden="true" />
              Clear conversation
            </button>
          </div>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/60 px-4 py-5 dark:bg-zinc-950/30 sm:px-6"
          >
            {activeMessages.length === 0 ? (
              <div className="mx-auto max-w-2xl py-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  <Scale size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-center text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  How can I help you understand Indian law?
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Choose a question to get started. Responses are informational
                  and candidate citations will be clearly marked unverified.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {INITIAL_QUESTIONS.map((suggestedQuestion) => (
                    <button
                      key={suggestedQuestion}
                      type="button"
                      disabled={loading}
                      onClick={() => void askLegalQuestion(suggestedQuestion)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                    >
                      {suggestedQuestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeMessages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`w-fit max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[88%] ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <AssistantMessage answer={message.answer} />
                    )}
                  </div>
                </article>
              ))
            )}
            {loading && (
              <p
                role="status"
                className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-200" />
                Checking the limited legal topic index…
              </p>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void askLegalQuestion();
            }}
            className="border-t border-zinc-100 p-4 dark:border-zinc-800 sm:px-6"
          >
            {error && (
              <p role="alert" className="mb-3 text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="legal-assistant-input" className="sr-only">
                Ask a general question about Indian law
              </label>
              <textarea
                id="legal-assistant-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void askLegalQuestion();
                  }
                }}
                maxLength={1_000}
                rows={2}
                disabled={loading}
                placeholder="Ask a general question about Indian law…"
                className="min-h-12 flex-1 resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!question.trim() || loading}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <span className="hidden sm:inline">Send</span>
                <Send size={15} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              LawMind AI provides general legal information, not legal advice.
              Consult a qualified advocate for advice on your specific
              circumstances.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

function AssistantMessage({ answer }: { answer?: AssistantAnswer }) {
  if (!answer) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-zinc-950 dark:text-zinc-50">
          {answer.shortAnswer}
        </p>
        {answer.explanation && (
          <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {answer.explanation}
          </p>
        )}
      </div>

      {answer.practicalExample && (
        <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
          <p className="mb-1 font-semibold">Illustrative example</p>
          {answer.practicalExample}
        </div>
      )}

      {answer.conditions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Conditions and exceptions
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
            {answer.conditions.map((condition, index) => (
              <li key={`${index}-${condition}`}>{condition}</li>
            ))}
          </ul>
        </div>
      )}

      {answer.references.length > 0 && (
        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Candidate legal references
          </p>
          <ul className="space-y-2">
            {answer.references.map((reference) => (
              <li key={reference.id} className="text-xs">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {reference.actName}
                  {reference.section &&
                    `, section ${reference.section}`}
                  {reference.sectionTitle &&
                    ` — ${reference.sectionTitle}`}
                </span>
                <a
                  href={reference.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1.5 text-blue-700 underline underline-offset-2 dark:text-blue-300"
                >
                  Official portal
                </a>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                  Candidate reference only; act text, section, and amendments
                  were not checked live.
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer.limitations.length > 0 && (
        <div className="rounded-lg bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="mb-1 font-semibold">Limitations</p>
          <ul className="list-disc space-y-1 pl-4">
            {answer.limitations.map((limitation, index) => (
              <li key={`${index}-${limitation}`}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
