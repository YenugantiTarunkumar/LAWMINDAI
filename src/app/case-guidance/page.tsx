'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  Plus,
  Scale,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  CASE_CATEGORIES,
  CASE_CATEGORY_LABELS,
  type CaseCategory,
  type CaseConversation,
  type CaseGuidanceMessage,
  type CaseGuidanceReference,
  type CaseGuidanceReport,
} from '@/lib/case-guidance/types';

interface GuidanceResponse {
  report: CaseGuidanceReport;
  references: CaseGuidanceReference[];
  category: CaseCategory;
  limitations: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNamedExplanation(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.area === 'string' &&
    typeof value.explanation === 'string';
}

function isQuestionWhy(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.question === 'string' &&
    typeof value.why === 'string';
}

function isApproach(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isStringArray(value.considerations);
}

function isEvidenceItem(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.item === 'string' &&
    typeof value.why === 'string';
}

function isGuidanceResponse(value: unknown): value is GuidanceResponse {
  if (!isRecord(value) || !isRecord(value.report) || !Array.isArray(value.references)) {
    return false;
  }
  const report = value.report;
  return (
    typeof report.situationSummary === 'string' &&
    isStringArray(report.confirmedFacts) &&
    isStringArray(report.assumptions) &&
    Array.isArray(report.missingInformation) &&
    report.missingInformation.every(isQuestionWhy) &&
    Array.isArray(report.possibleLegalAreas) &&
    report.possibleLegalAreas.every(isNamedExplanation) &&
    isStringArray(report.rightsResponsibilities) &&
    Array.isArray(report.possibleApproaches) &&
    report.possibleApproaches.every(isApproach) &&
    Array.isArray(report.evidenceChecklist) &&
    report.evidenceChecklist.every(isEvidenceItem) &&
    Array.isArray(report.procedureAuthorities) &&
    report.procedureAuthorities.every((item) =>
      isRecord(item) &&
      typeof item.description === 'string' &&
      item.status === 'not-established',
    ) &&
    isStringArray(report.challengesRisks) &&
    isStringArray(report.nextSteps) &&
    isStringArray(report.advocateQuestions) &&
    isStringArray(report.followUpQuestions) &&
    isStringArray(report.limitations) &&
    isStringArray(report.referenceIds) &&
    value.references.every((reference) => {
      if (!isRecord(reference)) return false;
      return (
        typeof reference.id === 'string' &&
        typeof reference.actName === 'string' &&
        (typeof reference.section === 'string' || reference.section === null) &&
        typeof reference.sourceUrl === 'string' &&
        reference.sourceStatus === 'not-live-verified' &&
        typeof reference.verificationNote === 'string' &&
        (typeof reference.sectionTitle === 'string' || reference.sectionTitle === null)
      );
    }) &&
    CASE_CATEGORIES.includes(value.category as CaseCategory) &&
    isStringArray(value.limitations)
  );
}

function newCase(): CaseConversation {
  return {
    id: crypto.randomUUID(),
    title: 'New case',
    updatedAt: Date.now(),
    category: 'not-sure',
    situation: '',
    messages: [],
    references: [],
  };
}

function getAssistantContext(report: CaseGuidanceReport): string {
  return [
    `Summary: ${report.situationSummary}`,
    `Missing information: ${report.missingInformation.map(({ question }) => question).join('; ')}`,
    `Follow-up questions: ${report.followUpQuestions.join('; ')}`,
  ].join('\n').slice(0, 1_500);
}

export default function CaseGuidancePage() {
  const [cases, setCases] = useState<CaseConversation[]>(() => [newCase()]);
  const [activeCaseId, setActiveCaseId] = useState(() => cases[0].id);
  const [followUp, setFollowUp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCase = useMemo(
    () => cases.find(({ id }) => id === activeCaseId) ?? cases[0],
    [activeCaseId, cases],
  );
  const latestReport = activeCase?.messages
    .slice()
    .reverse()
    .find(({ report }) => report)?.report;

  function updateActiveCase(update: Partial<CaseConversation>) {
    if (!activeCase) return;
    setCases((current) =>
      current.map((item) =>
        item.id === activeCase.id
          ? { ...item, ...update, updatedAt: Date.now() }
          : item,
      ),
    );
  }

  function startNewCase() {
    const item = newCase();
    setCases((current) => [item, ...current]);
    setActiveCaseId(item.id);
    setFollowUp('');
    setError(null);
  }

  function clearCase() {
    if (!activeCase) return;
    updateActiveCase({
      title: 'New case',
      category: 'not-sure',
      situation: '',
      messages: [],
      references: [],
    });
    setFollowUp('');
    setError(null);
  }

  async function submitGuidance(question: string) {
    if (!activeCase || loading || !activeCase.situation.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/case-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCase.category,
          situation: activeCase.situation,
          question,
          history: activeCase.messages.slice(-8).map(({ role, content }) => ({
            role,
            content: content.slice(0, 1_600),
          })),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : `Request failed (${response.status}).`;
        throw new Error(message);
      }
      if (!isGuidanceResponse(result)) {
        throw new Error('The case guidance response was invalid. Please retry.');
      }

      const userMessage: CaseGuidanceMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
      };
      const assistantMessage: CaseGuidanceMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getAssistantContext(result.report),
        report: result.report,
      };
      setCases((current) =>
        current.map((item) =>
          item.id === activeCase.id
            ? {
                ...item,
                title:
                  item.messages.length === 0
                    ? item.situation.trim().slice(0, 48)
                    : item.title,
                updatedAt: Date.now(),
                messages: [...item.messages, userMessage, assistantMessage],
                references: result.references,
              }
            : item,
        ),
      );
      setFollowUp('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to analyze this situation. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  const sortedCases = cases.slice().sort((left, right) => right.updatedAt - left.updatedAt);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <BriefcaseBusiness size={14} aria-hidden="true" />
            Structured legal situation intake
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Case Guidance
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Organize the facts, identify information still needed, and consider
            practical questions to discuss with an advocate.
          </p>
        </div>
      </header>

      <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <strong>Limited coverage and source status:</strong> This tool does not
        cover all of Indian law. Existing legal index entries are unverified
        candidates only; no statutory text, amendments, judgments, deadlines,
        or procedures are represented as verified.
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={startNewCase}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus size={16} aria-hidden="true" />
            New case
          </button>
          <h2 className="mb-2 mt-5 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Session cases
          </h2>
          <div className="max-h-52 space-y-1 overflow-y-auto lg:max-h-[30rem]">
            {sortedCases.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setActiveCaseId(item.id);
                  setFollowUp('');
                  setError(null);
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left ${
                  item.id === activeCase?.id
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span className="block truncate text-xs font-medium">{item.title}</span>
                <span className="mt-1 block truncate text-[10px] text-zinc-400">
                  {CASE_CATEGORY_LABELS[item.category]}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 border-t border-zinc-100 px-2 pt-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Cases remain in this browser session and are not saved to your
            account or database.
          </p>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Describe your legal situation
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Include the key events, approximate dates, people or organizations involved, and what outcome you hope for. Avoid passwords or full account numbers.
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  Your description is processed by the AI service for analysis.
                  Case history is kept only in this browser session; avoid sharing
                  unnecessary sensitive details.
                </p>
              </div>
              <button
                type="button"
                onClick={clearCase}
                disabled={!activeCase?.situation && !activeCase?.messages.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Trash2 size={13} aria-hidden="true" />
                Clear case
              </button>
            </div>
            <label htmlFor="case-category" className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Legal category
            </label>
            <select
              id="case-category"
              value={activeCase?.category ?? 'not-sure'}
              onChange={(event) => updateActiveCase({ category: event.target.value as CaseCategory })}
              disabled={loading}
              className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
            >
              {CASE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{CASE_CATEGORY_LABELS[category]}</option>
              ))}
            </select>
            <label htmlFor="case-situation" className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              What happened?
            </label>
            <textarea
              id="case-situation"
              value={activeCase?.situation ?? ''}
              onChange={(event) => updateActiveCase({ situation: event.target.value })}
              maxLength={10_000}
              rows={5}
              disabled={loading}
              placeholder="Describe the situation in your own words. You can revise these facts and request an updated analysis later."
              className="min-h-32 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeCase?.situation.length ?? 0}/10,000 characters
              </p>
              <button
                type="button"
                onClick={() => void submitGuidance('Please assess the situation and identify what information is missing.')}
                disabled={!activeCase?.situation.trim() || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Scale size={15} aria-hidden="true" />
                {latestReport ? 'Reassess with edited facts' : 'Analyze situation'}
              </button>
            </div>
          </section>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}

          {loading && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-200" />
              Reviewing the facts and preparing structured guidance…
            </p>
          )}

          {!latestReport && !loading && (
            <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <CircleHelp className="mx-auto mb-3 text-zinc-400" size={25} aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">A careful first step</h2>
              <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                The analysis will separate supplied facts from assumptions, ask about missing details, and offer qualified practical options—not predict an outcome.
              </p>
            </section>
          )}

          {latestReport && activeCase && (
            <GuidanceReport
              report={latestReport}
              references={activeCase.references}
              loading={loading}
              followUp={followUp}
              setFollowUp={setFollowUp}
              onSubmit={() => void submitGuidance(followUp.trim())}
              onAskQuestion={(question) => {
                setFollowUp(question);
                void submitGuidance(question);
              }}
            />
          )}

          {activeCase?.messages.length ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Case conversation
              </h2>
              <div className="space-y-2">
                {activeCase.messages.filter(({ role }) => role === 'user').map((message) => (
                  <div key={message.id} className="rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <span className="mr-1 font-semibold">You:</span>{message.content}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        LawMind AI provides general legal information and educational guidance,
        not legal advice. Consult a qualified Indian advocate for advice about
        your specific circumstances.
      </p>
    </div>
  );
}

function GuidanceReport({
  report,
  references,
  loading,
  followUp,
  setFollowUp,
  onSubmit,
  onAskQuestion,
}: {
  report: CaseGuidanceReport;
  references: CaseGuidanceReference[];
  loading: boolean;
  followUp: string;
  setFollowUp: (value: string) => void;
  onSubmit: () => void;
  onAskQuestion: (question: string) => void;
}) {
  const selectedReferences = references.filter(({ id }) => report.referenceIds.includes(id));

  return (
    <section className="space-y-4" aria-label="Case guidance report">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-blue-100">
          <BookOpenCheck size={17} aria-hidden="true" />
          Situation summary
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-blue-950 dark:text-blue-100">
          {report.situationSummary}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FactList title="Facts provided" items={report.confirmedFacts} empty="No specific facts were separated from the description." />
          <FactList title="Assumptions / not established" items={report.assumptions} empty="No assumptions identified." />
        </div>
      </div>

      <ReportSection title="Missing information" icon={CircleHelp} empty="No additional questions were identified. This does not mean all relevant facts are known.">
        {report.missingInformation.map(({ question, why }, index) => (
          <button key={`${question}-${index}`} type="button" onClick={() => onAskQuestion(question)} disabled={loading} className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-left hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-100">{question}</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{why}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 dark:text-blue-300">Answer this question <ArrowDownRight size={12} /></span>
          </button>
        ))}
      </ReportSection>

      <ReportSection title="Possible legal areas" icon={Scale} empty="No legal area could be identified with enough context.">
        {report.possibleLegalAreas.map(({ area, explanation }, index) => (
          <InfoCard key={`${area}-${index}`} title={area} text={explanation} />
        ))}
      </ReportSection>

      <ReportSection title="Rights and responsibilities to explore" icon={ShieldAlert} empty="Further facts are needed before outlining relevant rights or responsibilities.">
        <BulletList items={report.rightsResponsibilities} />
      </ReportSection>

      <ReportSection title="Possible approaches" icon={BriefcaseBusiness} empty="No specific approach is suggested without more facts.">
        {report.possibleApproaches.map(({ title, description, considerations }, index) => (
          <div key={`${title}-${index}`} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
            {considerations.length > 0 && <BulletList items={considerations} />}
          </div>
        ))}
      </ReportSection>

      <ReportSection title="Evidence checklist" icon={FileCheck2} empty="No specific evidence items identified. Preserve relevant records where appropriate.">
        {report.evidenceChecklist.map(({ item, why }, index) => (
          <InfoCard key={`${item}-${index}`} title={item} text={why} />
        ))}
      </ReportSection>

      <ReportSection title="Procedure and authorities" icon={BookOpenCheck} empty="No procedure or authority could be established from the available verified material.">
        {report.procedureAuthorities.map(({ description }, index) => (
          <div key={`${description}-${index}`} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{description}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Not established from verified sources
            </p>
          </div>
        ))}
      </ReportSection>

      <ReportSection title="Challenges and risks" icon={AlertTriangle} empty="No specific challenge identified; important uncertainty may remain.">
        <BulletList items={report.challengesRisks} />
      </ReportSection>

      <ReportSection title="Suggested next steps" icon={CheckCircle2} empty="Consult an advocate to determine an appropriate next step.">
        <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
          {report.nextSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
        </ol>
      </ReportSection>

      <ReportSection title="Questions for an advocate" icon={BriefcaseBusiness} empty="Consider asking an advocate what further facts and documents they need to assess the matter.">
        <BulletList items={report.advocateQuestions} />
      </ReportSection>

      {selectedReferences.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
          <h2 className="text-xs font-semibold text-amber-950 dark:text-amber-100">Unverified candidate legal references</h2>
          <ul className="mt-2 space-y-2">
            {selectedReferences.map((reference) => (
              <li key={reference.id} className="text-xs text-amber-950 dark:text-amber-100">
                <span className="font-medium">{reference.actName}{reference.section ? `, section ${reference.section}` : ''}{reference.sectionTitle ? ` — ${reference.sectionTitle}` : ''}</span>
                <a className="ml-2 underline underline-offset-2" href={reference.sourceUrl} target="_blank" rel="noreferrer">Official portal</a>
                <p className="mt-0.5 text-[11px]">Candidate only; source text, current status, and amendments were not verified.</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Continue this case</h2>
        <div className="mt-2 flex items-end gap-2">
          <label className="sr-only" htmlFor="case-guidance-followup">Ask a follow-up or add a fact</label>
          <textarea
            id="case-guidance-followup"
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
            maxLength={1_500}
            rows={2}
            disabled={loading}
            placeholder="Answer a question, add a relevant fact, or ask about the analysis…"
            className="min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
          />
          <button type="button" aria-label="Send follow-up" onClick={onSubmit} disabled={!followUp.trim() || loading} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            <span className="hidden sm:inline">Continue</span><Send size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
        <h2 className="text-xs font-semibold text-amber-950 dark:text-amber-100">Limitations and urgent situations</h2>
        <BulletList items={report.limitations} />
        <p className="mt-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
          If someone is in immediate danger or harm is ongoing, seek appropriate urgent professional or emergency assistance.
        </p>
      </section>
    </section>
  );
}

function ReportSection({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: typeof Scale;
  empty: string;
  children: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <Icon size={16} aria-hidden="true" />{title}
      </h2>
      <div className="space-y-2">
        {hasContent ? children : <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{empty}</p>}
      </div>
    </section>
  );
}

function FactList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-3 dark:bg-zinc-900/60">
      <h3 className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
      {items.length > 0 ? <BulletList items={items} /> : <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{empty}</p>}
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
      <h3 className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
      {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
    </ul>
  );
}
