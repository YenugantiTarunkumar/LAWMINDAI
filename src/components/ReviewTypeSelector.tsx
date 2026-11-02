'use client';

import type { ReviewMode } from '@/lib/types';

interface Option {
  mode: ReviewMode;
  icon: string;
  title: string;
  description: string;
}

const options: Option[] = [
  {
    mode: 'full-review',
    icon: '📋',
    title: 'Full Review',
    description: 'Comprehensive analysis of the entire contract',
  },
  {
    mode: 'clause-by-clause',
    icon: '🔍',
    title: 'Clause-by-Clause',
    description: 'Deep dive into each individual provision',
  },
  {
    mode: 'redline',
    icon: '✏️',
    title: 'Redline',
    description: 'Get proposed revisions with before/after comparisons',
  },
  {
    mode: 'provision-drafter',
    icon: '📝',
    title: 'Provision Drafter',
    description: 'Draft a new provision from a plain-language description',
  },
];

interface ReviewTypeSelectorProps {
  selected: ReviewMode;
  onSelect: (mode: ReviewMode) => void;
}

export default function ReviewTypeSelector({
  selected,
  onSelect,
}: ReviewTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Review Mode
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(({ mode, icon, title, description }) => {
          const isSelected = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelect(mode)}
              className={`group relative flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-md dark:border-white dark:bg-white dark:text-zinc-900'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  {icon}
                </span>
                <span className="text-sm font-semibold">{title}</span>
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  isSelected
                    ? 'text-zinc-300 dark:text-zinc-500'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
