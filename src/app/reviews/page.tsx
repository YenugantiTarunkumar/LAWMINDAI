import Link from 'next/link';
import { connection } from 'next/server';
import type { RiskLevel } from '@/lib/types';
import RiskBadge from '@/components/RiskBadge';
import { listUserReviews } from '@/lib/storage/user-review-store';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const MODE_LABELS: Record<string, string> = {
  'full-review': 'Full Review',
  'clause-by-clause': 'Clause-by-Clause',
  redline: 'Redline',
  'provision-drafter': 'Provision Drafter',
};

export default async function ReviewsPage() {
  await connection();

  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-xl text-white">
            ⚙️
          </div>
          <h2 className="text-xl font-bold text-amber-950 dark:text-amber-100">
            Supabase Database & Auth Not Configured
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-amber-800 dark:text-amber-300">
            LawMind AI uses Supabase with database Row Level Security (RLS) to keep reviews private to each authenticated user.
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-xl bg-white p-4 text-left text-xs shadow-sm dark:bg-zinc-900">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Setup Instructions:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-zinc-600 dark:text-zinc-400">
              <li>Add your Supabase project URL and Anon Key to <code>.env.local</code>:
                <pre className="mt-1 rounded bg-zinc-100 p-2 font-mono text-[11px] dark:bg-zinc-800">
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
                </pre>
              </li>
              <li>Run the SQL migration in <code>supabase/migrations/20261023_init_reviews.sql</code>.</li>
              <li>Restart the dev server.</li>
            </ol>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/review"
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Explore Demo Mode (No Setup Required)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-xl text-white dark:bg-white dark:text-zinc-900">
            🔒
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Authentication Required
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Your saved reviews are private and secured using Row Level Security (RLS). Please sign in to access your review history.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Create Account
            </Link>
            <Link
              href="/review"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
            >
              Try Demo Mode
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let reviews;
  try {
    reviews = await listUserReviews(user.id);
  } catch (error) {
    console.error(
      'Reviews page load failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-center"
        >
          <h2 className="text-lg font-semibold text-red-950">
            Saved reviews are unavailable
          </h2>
          <p className="mt-2 text-sm text-red-800">
            We couldn&apos;t load your review history. Please refresh the page
            or try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            My Saved Reviews
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Private reviews for <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{user.email}</strong>.
          </p>
          <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Protected with Supabase Row Level Security (RLS) — accessible only by your account.
          </p>
        </div>
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          ← New Review
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No saved reviews in your account yet. Run a review with &ldquo;Save this review for later&rdquo; enabled to
            store it securely.
          </p>
          <Link
            href="/review"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"
          >
            Start a Contract Review
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {new Date(review.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {MODE_LABELS[review.mode] || review.mode}
                    </span>
                    {review.inputFileName && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {review.inputFileName}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {review.executiveSummary}
                  </p>
                </div>
                <RiskBadge level={(review.overallRiskLevel as RiskLevel) || 'medium'} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
