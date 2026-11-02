'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileText,
  Info,
  Plus,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  DRAFT_TEMPLATES,
  getDraftTemplate,
  type DraftAnalysis,
  type DraftClause,
  type DraftDocumentType,
  type LegalDraft,
} from '@/lib/legal-drafting/types';

type Action = 'analyze' | 'generate' | 'explain-clause' | 'regenerate-clause';

interface GeneratedDraft {
  title: string;
  clauses: DraftClause[];
  finalChecklist: string[];
}

interface ClauseExplanation {
  plainLanguage: string;
  verify: string[];
  riskPoints: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDraftAnalysis(value: unknown): value is DraftAnalysis {
  return isRecord(value) &&
    Array.isArray(value.missingFields) &&
    value.missingFields.every((item) =>
      isRecord(item) && typeof item.key === 'string' && typeof item.label === 'string',
    ) &&
    stringArray(value.contradictions) &&
    stringArray(value.followUpQuestions) &&
    stringArray(value.riskFlags);
}

function isClause(value: unknown): value is DraftClause {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.heading === 'string' &&
    typeof value.draftText === 'string' &&
    typeof value.plainLanguage === 'string' &&
    stringArray(value.verify) &&
    stringArray(value.riskPoints) &&
    typeof value.highImpact === 'boolean';
}

function isGeneratedDraft(value: unknown): value is GeneratedDraft {
  return isRecord(value) &&
    typeof value.title === 'string' &&
    Array.isArray(value.clauses) &&
    value.clauses.length >= 2 &&
    value.clauses.every(isClause) &&
    stringArray(value.finalChecklist);
}

function isClauseExplanation(value: unknown): value is ClauseExplanation {
  return isRecord(value) &&
    typeof value.plainLanguage === 'string' &&
    stringArray(value.verify) &&
    stringArray(value.riskPoints);
}

function createDraft(type: DraftDocumentType): LegalDraft {
  return {
    id: crypto.randomUUID(),
    type,
    title: getDraftTemplate(type).title,
    values: {},
    additionalInformation: '',
    clauses: [],
    finalChecklist: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function missingPlaceholder(label: string): string {
  return `[PLEASE PROVIDE: ${label}]`;
}

function downloadDraft(draft: LegalDraft) {
  const contents = [
    draft.title.toUpperCase(),
    '',
    ...draft.clauses.map(({ heading, draftText }) => `${heading.toUpperCase()}\n${draftText}`),
    '',
  ].join('\n\n');
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'legal-draft'}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LegalDraftingPage() {
  const [drafts, setDrafts] = useState<LegalDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DraftDocumentType>('service-agreement');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'details' | 'review' | 'draft'>('select');
  const [revisionInstructions, setRevisionInstructions] = useState<Record<string, string>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  const activeDraft = useMemo(
    () => drafts.find(({ id }) => id === activeDraftId) ?? null,
    [activeDraftId, drafts],
  );
  const template = activeDraft ? getDraftTemplate(activeDraft.type) : null;
  const sortedDrafts = drafts.slice().sort((left, right) => right.updatedAt - left.updatedAt);
  const hasAnyDetails = Boolean(
    activeDraft &&
    (Object.values(activeDraft.values).some((value) => value.trim()) ||
      activeDraft.additionalInformation.trim()),
  );

  function updateDraft(id: string, update: Partial<LegalDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? { ...draft, ...update, updatedAt: Date.now() }
          : draft,
      ),
    );
  }

  function createSelectedDraft() {
    const draft = createDraft(selectedType);
    setDrafts((current) => [draft, ...current]);
    setActiveDraftId(draft.id);
    setStep('details');
    setError(null);
  }

  function openDraft(draft: LegalDraft) {
    setActiveDraftId(draft.id);
    setStep(draft.clauses.length ? 'draft' : draft.analysis ? 'review' : 'details');
    setError(null);
  }

  function duplicateDraft(draft: LegalDraft) {
    const duplicate = {
      ...draft,
      id: crypto.randomUUID(),
      title: `${draft.title} (copy)`,
      clauses: draft.clauses.map((clause) => ({ ...clause, id: crypto.randomUUID() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDrafts((current) => [duplicate, ...current]);
    setActiveDraftId(duplicate.id);
    setStep(duplicate.clauses.length ? 'draft' : 'details');
    setError(null);
  }

  function deleteDraft(draft: LegalDraft) {
    setDrafts((current) => current.filter(({ id }) => id !== draft.id));
    if (activeDraftId === draft.id) {
      setActiveDraftId(null);
      setStep('select');
    }
    setError(null);
  }

  async function requestAction(action: Action, options?: {
    clause?: DraftClause;
    instruction?: string;
  }): Promise<unknown> {
    if (!activeDraft) throw new Error('Select or create a draft first.');
    const response = await fetch('/api/legal-drafting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        documentType: activeDraft.type,
        fields: activeDraft.values,
        additionalInformation: activeDraft.additionalInformation,
        clause: options?.clause,
        instruction: options?.instruction,
      }),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = isRecord(result) && typeof result.error === 'string'
        ? result.error
        : `Request failed (${response.status}).`;
      throw new Error(message);
    }
    return result;
  }

  async function analyzeDetails() {
    if (!activeDraft || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await requestAction('analyze');
      if (!isRecord(result) || !isDraftAnalysis(result.analysis)) {
        throw new Error('The drafting analysis was malformed. Please retry.');
      }
      updateDraft(activeDraft.id, { analysis: result.analysis });
      setStep('review');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to analyze these details.');
    } finally {
      setLoading(false);
    }
  }

  async function generateDocument() {
    if (!activeDraft || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await requestAction('generate');
      if (!isGeneratedDraft(result)) {
        throw new Error('The generated document was malformed. Please retry.');
      }
      updateDraft(activeDraft.id, {
        title: result.title,
        clauses: result.clauses,
        finalChecklist: result.finalChecklist,
      });
      setStep('draft');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to generate this draft.');
    } finally {
      setLoading(false);
    }
  }

  async function explainClause(clause: DraftClause) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setExpandedExplanations((current) => ({ ...current, [clause.id]: true }));
    try {
      const result = await requestAction('explain-clause', { clause });
      if (!isClauseExplanation(result)) throw new Error('The clause explanation was malformed.');
      if (activeDraft) {
        updateDraft(activeDraft.id, {
          clauses: activeDraft.clauses.map((current) =>
            current.id === clause.id ? { ...current, ...result } : current,
          ),
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to explain this clause.');
    } finally {
      setLoading(false);
    }
  }

  async function regenerateClause(clause: DraftClause) {
    const instruction = revisionInstructions[clause.id]?.trim();
    if (!activeDraft || !instruction || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await requestAction('regenerate-clause', { clause, instruction });
      if (!isClause(result)) throw new Error('The revised clause was malformed.');
      updateDraft(activeDraft.id, {
        clauses: activeDraft.clauses.map((current) =>
          current.id === clause.id ? result : current,
        ),
      });
      setRevisionInstructions((current) => ({ ...current, [clause.id]: '' }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to revise this clause.');
    } finally {
      setLoading(false);
    }
  }

  function updateClause(clauseId: string, draftText: string) {
    if (!activeDraft) return;
    updateDraft(activeDraft.id, {
      clauses: activeDraft.clauses.map((clause) =>
        clause.id === clauseId ? { ...clause, draftText } : clause,
      ),
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <FileText size={14} aria-hidden="true" />
            Editable document drafts
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Legal Document Drafting
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Build a draft from information you provide, review each clause, and export only the document text.
          </p>
        </div>
      </header>

      <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <strong>Drafting and source limitations:</strong> Generated drafts are
        not verified against authoritative legal sources. The legal assistant’s
        candidate references are unverified and are not used as legal authority.
        No generated draft is represented as legally valid or ready to sign.
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button type="button" onClick={() => { setActiveDraftId(null); setStep('select'); setError(null); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
            <Plus size={16} aria-hidden="true" />New draft
          </button>
          <h2 className="mb-2 mt-5 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Session drafts
          </h2>
          {sortedDrafts.length === 0 ? (
            <p className="px-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">Drafts are kept in this tab only and are not saved to your account or database.</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[32rem]">
              {sortedDrafts.map((draft) => (
                <div key={draft.id} className={`rounded-xl p-2 ${draft.id === activeDraftId ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}>
                  <button type="button" onClick={() => openDraft(draft)} className="w-full min-w-0 text-left">
                    <span className="block truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{draft.title}</span>
                    <span className="mt-1 block truncate text-[10px] text-zinc-500 dark:text-zinc-400">{getDraftTemplate(draft.type).title}</span>
                  </button>
                  <div className="mt-1 flex gap-2 pl-1">
                    <button type="button" onClick={() => duplicateDraft(draft)} className="text-[10px] text-blue-700 underline dark:text-blue-300">Duplicate</button>
                    <button type="button" onClick={() => deleteDraft(draft)} className="text-[10px] text-red-700 underline dark:text-red-300">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 border-t border-zinc-100 px-2 pt-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Drafts exist only during this browser session. Export a copy to keep it.
          </p>
        </aside>

        <main className="min-w-0 space-y-5">
          <StepIndicator step={step} onStep={(next) => {
            if (next === 'select') setActiveDraftId(null);
            if (next === 'details' && activeDraft) setStep('details');
            if (next === 'review' && activeDraft?.analysis) setStep('review');
            if (next === 'draft' && activeDraft?.clauses.length) setStep('draft');
          }} hasDraft={Boolean(activeDraft)} hasAnalysis={Boolean(activeDraft?.analysis)} hasDocument={Boolean(activeDraft?.clauses.length)} />

          {!activeDraft ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">1. Select a document type</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Templates are limited starting points. Choose the closest type, then provide only facts and terms you know.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {DRAFT_TEMPLATES.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelectedType(item.id)} className={`rounded-xl border p-4 text-left transition-colors ${selectedType === item.id ? 'border-blue-500 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/30' : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60'}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                      {item.support === 'limited-draft-only' && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Draft only</span>}
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{item.description}</span>
                  </button>
                ))}
              </div>
              {getDraftTemplate(selectedType).support === 'limited-draft-only' && (
                <p className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  This notice template is limited to draft correspondence. It is not a verified statutory notice, legal finding, or guarantee that notice is required or sufficient.
                </p>
              )}
              <button type="button" onClick={createSelectedDraft} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
                Continue with {getDraftTemplate(selectedType).title}
              </button>
            </section>
          ) : (
            <>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

              {step !== 'draft' && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">2. Your information</p>
                    <h2 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">{template?.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{template?.description}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {template?.fields.map((field) => (
                      <DraftFieldInput
                        key={field.key}
                        field={field}
                        value={activeDraft.values[field.key] ?? ''}
                        disabled={loading}
                        onChange={(value) => {
                          updateDraft(activeDraft.id, {
                            values: { ...activeDraft.values, [field.key]: value },
                            analysis: undefined,
                          });
                          setStep('details');
                        }}
                      />
                    ))}
                  </div>
                  <label htmlFor="draft-additional-information" className="mb-1.5 mt-4 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Follow-up answers or additional facts
                  </label>
                  <textarea id="draft-additional-information" value={activeDraft.additionalInformation} maxLength={5_000} rows={3} disabled={loading} onChange={(event) => {
                    updateDraft(activeDraft.id, { additionalInformation: event.target.value, analysis: undefined });
                    setStep('details');
                  }} placeholder="Answer follow-up questions or add facts. To replace a missing required value, also fill its matching field above." className="min-h-24 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Required details left blank become visible placeholders, never invented facts.</p>
                    <button type="button" onClick={() => void analyzeDetails()} disabled={!hasAnyDetails || loading} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                      {loading ? <Spinner /> : <Check size={15} />}Analyze details
                    </button>
                  </div>
                </section>
              )}

              {activeDraft.analysis && step !== 'draft' && (
                <DraftReadiness analysis={activeDraft.analysis} />
              )}

              {activeDraft.analysis && step === 'review' && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">3. Review details and generate</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Answer follow-up questions in the additional-information field above or edit the corresponding fields. To replace a missing required-value placeholder, also enter that value in its matching field. You may still generate with placeholders and complete them in the draft.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setStep('details')} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Edit details</button>
                    <button type="button" onClick={() => void generateDocument()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                      {loading ? <Spinner /> : <FileText size={15} />}Generate draft
                    </button>
                  </div>
                </section>
              )}

              {step === 'draft' && activeDraft.clauses.length > 0 && (
                <section className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">4. Edit and review</p>
                        <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{activeDraft.title}</h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Edit only the draft text below. Explanations and risks are not part of the export.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => downloadDraft(activeDraft)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                          <Download size={14} />Export .txt
                        </button>
                        <button type="button" onClick={() => setStep('details')} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">Edit facts</button>
                      </div>
                    </div>
                  </div>

                  {activeDraft.clauses.map((clause) => (
                    <ClauseEditor
                      key={clause.id}
                      clause={clause}
                      loading={loading}
                      revisionInstruction={revisionInstructions[clause.id] ?? ''}
                      explanationExpanded={Boolean(expandedExplanations[clause.id])}
                      onTextChange={(value) => updateClause(clause.id, value)}
                      onInstructionChange={(value) => setRevisionInstructions((current) => ({ ...current, [clause.id]: value }))}
                      onRegenerate={() => void regenerateClause(clause)}
                      onExplain={() => void explainClause(clause)}
                    />
                  ))}

                  <ReviewChecklist items={activeDraft.finalChecklist} />
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100">
                    <strong>Professional review required:</strong> Check all facts and placeholders. Do not sign or send based only on this AI-generated draft; have it reviewed by a qualified Indian advocate.
                  </div>
                  <button type="button" onClick={() => void generateDocument()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    {loading ? <Spinner /> : <RefreshCw size={15} />}Regenerate full draft
                  </button>
                </section>
              )}
            </>
          )}

          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            AI-generated draft for informational purposes only. Not legal advice. Have the document reviewed by a qualified advocate before signing or sending.
          </p>
        </main>
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  onStep,
  hasDraft,
  hasAnalysis,
  hasDocument,
}: {
  step: 'select' | 'details' | 'review' | 'draft';
  onStep: (step: 'select' | 'details' | 'review' | 'draft') => void;
  hasDraft: boolean;
  hasAnalysis: boolean;
  hasDocument: boolean;
}) {
  const steps = [
    { id: 'select' as const, label: 'Select type', enabled: true },
    { id: 'details' as const, label: 'Your details', enabled: hasDraft },
    { id: 'review' as const, label: 'Check gaps', enabled: hasAnalysis },
    { id: 'draft' as const, label: 'Edit draft', enabled: hasDocument },
  ];
  return (
    <nav aria-label="Drafting steps" className="flex flex-wrap gap-2">
      {steps.map((item, index) => (
        <button key={item.id} type="button" onClick={() => item.enabled && onStep(item.id)} disabled={!item.enabled} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${step === item.id ? 'border-blue-700 bg-blue-700 text-white' : 'border-zinc-200 bg-white text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
          {index + 1}. {item.label}
        </button>
      ))}
    </nav>
  );
}

function DraftFieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: { key: string; label: string; help: string; placeholder: string; required: boolean; multiline?: boolean };
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={field.multiline ? 'sm:col-span-2' : ''}>
      <label htmlFor={`draft-${field.key}`} className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {field.label}{field.required && <span className="ml-1 text-blue-700 dark:text-blue-300">Required detail</span>}
      </label>
      {field.multiline ? (
        <textarea id={`draft-${field.key}`} value={value} onChange={(event) => onChange(event.target.value)} maxLength={3_000} rows={3} disabled={disabled} placeholder={field.placeholder} aria-describedby={`help-${field.key}`} className="min-h-20 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
      ) : (
        <input id={`draft-${field.key}`} value={value} onChange={(event) => onChange(event.target.value)} maxLength={3_000} disabled={disabled} placeholder={field.placeholder} aria-describedby={`help-${field.key}`} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
      )}
      <p id={`help-${field.key}`} className="mt-1 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">{field.help}</p>
    </div>
  );
}

function DraftReadiness({ analysis }: { analysis: DraftAnalysis }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/70 dark:bg-zinc-900 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <Info size={16} className="text-amber-600" />3. Missing or contradictory information
      </h2>
      {analysis.missingFields.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Required details not supplied</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
            {analysis.missingFields.map(({ key, label }) => <li key={key}>{label} — will use {missingPlaceholder(label)} unless completed.</li>)}
          </ul>
        </div>
      )}
      {analysis.contradictions.length > 0 && <TextList title="Possible contradictions to check" items={analysis.contradictions} />}
      {analysis.followUpQuestions.length > 0 && <TextList title="Follow-up questions" items={analysis.followUpQuestions} />}
      {analysis.riskFlags.length > 0 && <TextList title="Drafting considerations" items={analysis.riskFlags} />}
      {!analysis.missingFields.length && !analysis.contradictions.length && !analysis.followUpQuestions.length && !analysis.riskFlags.length && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No specific gaps identified. Review the supplied information carefully.</p>
      )}
    </section>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}

function ClauseEditor({
  clause,
  loading,
  revisionInstruction,
  explanationExpanded,
  onTextChange,
  onInstructionChange,
  onRegenerate,
  onExplain,
}: {
  clause: DraftClause;
  loading: boolean;
  revisionInstruction: string;
  explanationExpanded: boolean;
  onTextChange: (value: string) => void;
  onInstructionChange: (value: string) => void;
  onRegenerate: () => void;
  onExplain: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{clause.heading}</h3>
          {clause.highImpact && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-red-800 dark:bg-red-950/60 dark:text-red-200"><ShieldAlert size={11} />High impact</span>}
        </div>
        <button type="button" onClick={onExplain} disabled={loading} aria-expanded={explanationExpanded} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-300">
          Explain clause <ChevronDown size={13} />
        </button>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Editable draft text</span>
          <textarea aria-label={`Draft text: ${clause.heading}`} value={clause.draftText} onChange={(event) => onTextChange(event.target.value)} maxLength={8_000} rows={Math.min(16, Math.max(4, clause.draftText.split('\n').length + 1))} className="min-h-28 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm leading-relaxed text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
        </label>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Plain-language explanation — not part of the document</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{clause.plainLanguage}</p>
        </div>
        {(clause.verify.length > 0 || clause.riskPoints.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Verify</p><SimpleList items={clause.verify} /></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Risks / negotiation</p><SimpleList items={clause.riskPoints} /></div>
          </div>
        )}
        {clause.highImpact && <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-800 dark:bg-red-950/40 dark:text-red-200">High-impact clause: ask a qualified advocate to review before signing or sending.</p>}
        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <label htmlFor={`revision-${clause.id}`} className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Revise this clause only</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id={`revision-${clause.id}`} value={revisionInstruction} onChange={(event) => onInstructionChange(event.target.value)} maxLength={1_000} placeholder="Describe the wording change you want" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <button type="button" onClick={onRegenerate} disabled={!revisionInstruction.trim() || loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              {loading ? <Spinner /> : <RefreshCw size={13} />}Regenerate clause
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SimpleList({ items }: { items: string[] }) {
  if (!items.length) return <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">None listed.</p>;
  return <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
}

function ReviewChecklist({ items }: { items: string[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"><ClipboardCheck size={16} />Final review checklist</h2>
      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        {[...items, 'Replace every [PLEASE PROVIDE: ...] placeholder and verify all party, date, amount, and address details.', 'Have a qualified Indian advocate review the document before signing or sending.'].map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-2"><input type="checkbox" aria-label={`Checklist: ${item}`} className="mt-0.5 accent-blue-700" /><span>{item}</span></li>
        ))}
      </ul>
    </section>
  );
}

function Spinner() {
  return <span aria-label="Loading" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}
