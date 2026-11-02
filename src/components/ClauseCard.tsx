'use client';

import { useState } from 'react';
import type { ClauseAnalysis } from '@/lib/types';
import RiskBadge from './RiskBadge';

interface ClauseCardProps {
  clause: ClauseAnalysis;
  defaultExpanded?: boolean;
}

function Section({
  title,
  children,
  variant,
}: {
  title: string;
  children: React.ReactNode;
  variant?: 'quote' | 'highlight' | 'default';
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {title}
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4">
          {variant === 'quote' ? (
            <blockquote className="rounded-lg border-l-4 border-zinc-300 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 italic dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
              {children}
            </blockquote>
          ) : variant === 'highlight' ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
              {children}
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClauseCard({ clause, defaultExpanded = false }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {clause.clauseTitle}
          </h3>
          {clause.findingType === 'insufficient-evidence' ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              Insufficient evidence
            </span>
          ) : (
            <>
              <RiskBadge level={clause.riskLevel} />
              {clause.findingType === 'informational' && (
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Informational
                </span>
              )}
            </>
          )}
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div>
          {clause.originalText ? (
            <Section title="Exact Original Text" variant="quote">
              {clause.originalText}
            </Section>
          ) : (
            <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              No exact supporting quotation was matched in the extracted
              document. Treat this observation as unconfirmed.
            </div>
          )}
          <Section title="Issue">
            {clause.issue}
          </Section>
          {clause.ambiguity && (
            <Section title="Ambiguity in this clause">
              <p>{clause.ambiguity}</p>
              {clause.possibleInterpretations &&
                clause.possibleInterpretations.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {clause.possibleInterpretations.map((interpretation) => (
                      <li key={interpretation}>{interpretation}</li>
                    ))}
                  </ul>
                )}
            </Section>
          )}
          {clause.whyItMatters && (
            <Section title="Why It Matters">
              {clause.whyItMatters}
            </Section>
          )}
          {clause.potentialConsequences && (
            <Section title="Potential Consequences">
              {clause.potentialConsequences}
            </Section>
          )}
          {clause.recommendedAction && (
            <Section title="Recommended Action">
              {clause.recommendedAction}
            </Section>
          )}
          {clause.proposedRevision && (
            <Section title="Proposed Revision" variant="highlight">
              {clause.proposedRevision}
            </Section>
          )}
          <Section title="Reasoning">
            {clause.reasoning}
          </Section>
          {clause.legalReferences && clause.legalReferences.length > 0 && (
            <Section title="Legal References">
              <ul className="space-y-2">
                {clause.legalReferences.map((reference) => (
                  <li
                    key={`${reference.actName}-${reference.section}`}
                    className="text-sm leading-relaxed"
                  >
                    <span className="font-medium">
                      {reference.actName}, section {reference.section}
                    </span>
                    <span className="block">{reference.relevance}</span>
                    <span className="block text-xs text-amber-700 dark:text-amber-300">
                      General reference only; not checked against current
                      official law and not a verified legal source.
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {clause.evidenceLimitations && (
            <Section title="Evidence Limitations">
              {clause.evidenceLimitations}
            </Section>
          )}
          {clause.confidence !== undefined && (
            <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Assessment confidence: {Math.round(clause.confidence * 100)}%
              {clause.pageNumbers && clause.pageNumbers.length > 0 && (
                <span> · Source pages: {clause.pageNumbers.join(', ')}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
