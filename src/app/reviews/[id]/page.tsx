import Link from 'next/link';
import { loadUserReview } from '@/lib/storage/user-review-store';
import { isValidReviewId } from '@/lib/storage/review-store';
import { getSessionUser } from '@/lib/supabase/server';
import ReviewOutput from '@/components/ReviewOutput';

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidReviewId(id)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Review not found
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            The requested review ID is invalid or does not exist.
          </p>
          <Link
            href="/reviews"
            className="mt-4 inline-flex text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            ← Back to reviews
          </Link>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  let review = null;

  if (user) {
    review = await loadUserReview(user.id, id);
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Review not found
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            This review does not exist, has been deleted, or belongs to another user account.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/reviews"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"
            >
              ← Back to reviews
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/reviews"
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
          All Reviews
        </Link>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {new Date(review.timestamp).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {user && (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Private Review
          </span>
        )}
      </div>

      <ReviewOutput result={review.result} reviewId={review.id} />
    </div>
  );
}
