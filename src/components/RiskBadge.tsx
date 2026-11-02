import type { RiskLevel } from '@/lib/types';

const config: Record<RiskLevel, { label: string; classes: string }> = {
  high: {
    label: 'High Risk',
    classes: 'bg-red-100 text-red-800 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300',
  },
  medium: {
    label: 'Medium Risk',
    classes:
      'bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300',
  },
  low: {
    label: 'Low Risk',
    classes:
      'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
};

const icons: Record<RiskLevel, string> = { high: '🔴', medium: '🟡', low: '🟢' };

export default function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, classes } = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${classes}`}
    >
      <span aria-hidden="true">{icons[level]}</span>
      {label}
    </span>
  );
}
