'use client';

import { useState, useCallback } from 'react';
import type { ReviewMode, ReviewResult } from '@/lib/types';
import ContractUpload from '@/components/ContractUpload';
import ReviewTypeSelector from '@/components/ReviewTypeSelector';
import ReviewOutput from '@/components/ReviewOutput';

import { SAMPLE_CONTRACT, SAMPLE_REVIEW_RESULT } from '@/lib/demo-data';

function HeroSection({
  onGetStarted,
  onStartDemo,
}: {
  onGetStarted: () => void;
  onStartDemo: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-2xl shadow-lg dark:bg-white">
        <span className="text-white dark:text-zinc-900">⚖</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
        Contract review, powered by AI
      </h1>
      <p className="mt-3 max-w-lg text-base text-zinc-500 dark:text-zinc-400">
        Paste or upload any contract. Get clause-by-clause analysis, risk
        assessments, plain-language revisions, and drafting quality scores — in
        seconds.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow-md dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Start Live Review
        </button>

        <button
          type="button"
          onClick={onStartDemo}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-600 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Demo
          </span>
          Try API-Free Demo Mode
        </button>
      </div>

      {/* Feature cards */}
      <div className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            icon: '📋',
            title: 'Full Review',
            desc: 'Comprehensive risk assessment of the entire contract',
          },
          {
            icon: '🔍',
            title: 'Clause-by-Clause',
            desc: 'Deep analysis of each provision with specific recommendations',
          },
          {
            icon: '✏️',
            title: 'Redline',
            desc: 'Get before/after revisions for every flagged clause',
          },
          {
            icon: '📝',
            title: 'Provision Drafter',
            desc: 'Describe what you need — get a plain-language provision',
          },
        ].map((feat) => (
          <div
            key={feat.title}
            className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="mt-0.5 text-lg">{feat.icon}</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {feat.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {feat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showReview, setShowReview] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ReviewMode>('full-review');
  const [save, setSave] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [chatReviewId, setChatReviewId] = useState<string | undefined>();
  const [chatDocumentText, setChatDocumentText] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const startDemo = useCallback(() => {
    setShowReview(true);
    setIsDemoMode(true);
    setContent(SAMPLE_CONTRACT);
    setSelectedFile(null);
    setChatReviewId(undefined);
    setChatDocumentText(undefined);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && !selectedFile) {
      setError('Please paste contract text or upload a file.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setChatReviewId(undefined);
    setChatDocumentText(undefined);

    // Demo mode never sends documents to an external AI service.
    if (isDemoMode) {
      setResult({ ...SAMPLE_REVIEW_RESULT, isDemo: true });
      setChatDocumentText(content);
      setLoading(false);
      return;
    }

    try {
      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('mode', mode);
        formData.append('save', String(save));
        if (selectedFile.name) formData.append('fileName', selectedFile.name);

        res = await fetch('/api/review', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            mode,
            save,
          }),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${res.status})`);
      }

      const data: ReviewResult & {
        reviewId?: string;
        chatDocumentText?: string;
      } = await res.json();
      setChatReviewId(data.reviewId);
      setChatDocumentText(data.chatDocumentText ?? content);
      const {
        reviewId: _reviewId,
        chatDocumentText: _chatDocumentText,
        ...reviewResult
      } = data;
      void _reviewId;
      void _chatDocumentText;
      setResult(reviewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [content, selectedFile, mode, save, isDemoMode]);

  const handleReset = () => {
    setResult(null);
    setChatReviewId(undefined);
    setChatDocumentText(undefined);
    setError(null);
  };

  // Show hero landing if user hasn't started
  if (!showReview && !result) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <HeroSection
          onGetStarted={() => {
            setShowReview(true);
            setIsDemoMode(false);
          }}
          onStartDemo={startDemo}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {result ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            New Review
          </button>
          <ReviewOutput
            result={result}
            reviewId={chatReviewId}
            documentText={chatDocumentText}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Demo Mode Banner / Toggle */}
          {isDemoMode ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-blue-900 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                    DEMO MODE ACTIVE
                  </span>
                  <span className="text-sm font-semibold">API-Free Interactive Evaluation</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContent(SAMPLE_CONTRACT);
                      setSelectedFile(null);
                      setError(null);
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Reload Sample Agreement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDemoMode(false);
                      setContent('');
                      setSelectedFile(null);
                      setError(null);
                    }}
                    className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-100"
                  >
                    Switch to Live Review
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-blue-800 dark:text-blue-300">
                You are in API-free demo mode using a synthetic service agreement. Analysis is computed offline without external AI calls or API keys.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <span>Submit a contract for live analysis. If the service is unavailable, you will receive an error; demo mode is also available.</span>
              <button
                type="button"
                onClick={startDemo}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Switch to API-Free Demo Mode →
              </button>
            </div>
          )}

          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                New Review {isDemoMode && <span className="text-sm font-normal text-blue-600 dark:text-blue-400">(Demo Mode)</span>}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {isDemoMode
                  ? 'Examine the pre-loaded synthetic contract or choose a review mode to preview findings.'
                  : 'Paste or upload a contract, choose a review mode, and let AI analyze it.'}
              </p>
            </div>
          </div>

          <ContractUpload
            value={content}
            onChange={setContent}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />

          <ReviewTypeSelector selected={mode} onSelect={setMode} />

          {isDemoMode ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Demo reviews are temporary and are not saved to shared storage.
            </p>
          ) : (
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={save}
                onChange={(e) => setSave(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
              />
              Save this review for later
            </label>
          )}

          {/* Error & Fallback to Demo Mode */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <p className="font-semibold">{error}</p>
              {error.includes('AI service is not configured') && (
                <div className="mt-3">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Live analysis is not configured on this server. You can explore the application using Demo Mode or contact the site administrator.
                  </p>
                  <button
                    type="button"
                    onClick={startDemo}
                    className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-800"
                  >
                    Switch to Demo Mode (No Key Needed)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && !selectedFile)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isDemoMode ? 'Loading sample analysis…' : 'Analyzing contract…'}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                {isDemoMode ? 'Run Demo Review (No API Key)' : 'Review Contract'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
