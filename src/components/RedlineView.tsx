interface RedlineViewProps {
  original: string;
  revised: string;
  title: string;
}

export default function RedlineView({ original, revised, title }: RedlineViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Original */}
        <div className="border-b border-zinc-200 p-5 md:border-r md:border-b-0 dark:border-zinc-700">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Original
            </span>
          </div>
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900 dark:bg-red-900/15 dark:text-red-200">
            {original}
          </div>
        </div>

        {/* Revised */}
        <div className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Proposed Revision
            </span>
          </div>
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-900/15 dark:text-emerald-200">
            {revised}
          </div>
        </div>
      </div>
    </div>
  );
}
