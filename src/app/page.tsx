import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Clock3,
  FilePlus2,
  Files,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react';
import { connection } from 'next/server';
import type { LucideIcon } from 'lucide-react';
import RiskBadge from '@/components/RiskBadge';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSessionUser } from '@/lib/supabase/server';
import { listUserReviews } from '@/lib/storage/user-review-store';
import type { ReviewMetadata } from '@/lib/storage/types';

const reviewModes: Record<string, string> = {
  'full-review': 'Full review',
  'clause-by-clause': 'Clause-by-clause',
  redline: 'Redline',
  'provision-drafter': 'Provision drafter',
};

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone: 'navy' | 'red' | 'amber' | 'green';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${
            tone === 'red'
              ? 'bg-red-500'
              : tone === 'amber'
                ? 'bg-amber-500'
                : tone === 'green'
                  ? 'bg-emerald-500'
                  : 'bg-blue-700'
          }`}
        />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-32 items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
        <Icon size={19} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-slate-900">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
      <ArrowRight
        className="mt-1 text-blue-800 transition-transform group-hover:translate-x-1"
        size={17}
      />
    </Link>
  );
}

function RecentReviews({ reviews }: { reviews: ReviewMetadata[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <Files className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
        <h3 className="mt-3 text-sm font-semibold text-slate-800">
          No saved reviews yet
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
          Your saved contract reviews will appear here. Start a review and turn
          on &ldquo;Save this review for later&rdquo; to build your history.
        </p>
        <Link
          href="/review"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900"
        >
          Review a contract <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {reviews.map((review) => (
        <Link
          key={review.id}
          href={`/reviews/${review.id}`}
          className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50 sm:p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <FilePlus2 size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {review.inputFileName || 'Untitled review'}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>{reviewModes[review.mode] || review.mode}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={review.timestamp}>
                  {new Date(review.timestamp).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </span>
            </span>
          </div>
          {review.overallRiskLevel === 'high' ? (
            <RiskBadge level="high" />
          ) : review.overallRiskLevel === 'medium' ? (
            <RiskBadge level="medium" />
          ) : review.overallRiskLevel === 'low' ? (
            <RiskBadge level="low" />
          ) : (
            <span className="text-xs text-slate-500">Unclassified risk</span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default async function OverviewPage() {
  await connection();

  const supabaseConfigured = isSupabaseConfigured();
  const user = supabaseConfigured ? await getSessionUser() : null;
  let reviews: ReviewMetadata[] = [];
  let reviewLoadFailed = false;

  if (user) {
    try {
      reviews = await listUserReviews(user.id);
    } catch (error) {
      console.error(
        'Overview reviews load failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      reviewLoadFailed = true;
    }
  }

  const totalReviews = reviews.length;
  const highRiskReviews = reviews.filter(
    (review) => review.overallRiskLevel === 'high',
  ).length;
  const mediumRiskReviews = reviews.filter(
    (review) => review.overallRiskLevel === 'medium',
  ).length;
  const lowRiskReviews = reviews.filter(
    (review) => review.overallRiskLevel === 'low',
  ).length;
  const recentReviews = reviews.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">
            Personal workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {user ? 'Welcome back' : 'Welcome to LawMind AI'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Review agreements and keep your saved work organized. AI-generated
            information is not a substitute for advice from a qualified
            advocate.
          </p>
        </div>
        <Link
          href="/review"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900"
        >
          <FilePlus2 size={16} />
          Review a contract
        </Link>
      </section>

      {!supabaseConfigured && (
        <section
          aria-label="Dashboard statistics setup"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
        >
          <ShieldCheck className="mt-0.5 shrink-0 text-amber-700" size={18} />
          <p className="text-xs leading-relaxed">
            Dashboard statistics and private review history require Supabase.
            Configure the Supabase URL and anon key, then sign in to see your
            saved records here. No sample statistics are shown.
          </p>
        </section>
      )}

      {supabaseConfigured && !user && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs leading-relaxed text-blue-950">
            Sign in to view your saved reviews and personal risk statistics.
          </p>
          <Link
            href="/login"
            className="text-xs font-semibold text-blue-800 underline underline-offset-2"
          >
            Sign in
          </Link>
        </section>
      )}

      {reviewLoadFailed && (
        <section
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
        >
          We couldn&apos;t load your review statistics. Please refresh the page
          or try again later.
        </section>
      )}

      <section aria-label="Review statistics">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Review overview
          </h2>
          {user && (
            <span className="text-xs text-slate-500">
              Based on your saved reviews
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Documents reviewed"
            value={user && !reviewLoadFailed ? totalReviews : '—'}
            detail={user ? 'Saved to your account' : 'Personal data only'}
            tone="navy"
          />
          <MetricCard
            label="High risk"
            value={user && !reviewLoadFailed ? highRiskReviews : '—'}
            detail="Reviews marked high risk"
            tone="red"
          />
          <MetricCard
            label="Medium risk"
            value={user && !reviewLoadFailed ? mediumRiskReviews : '—'}
            detail="Reviews marked medium risk"
            tone="amber"
          />
          <MetricCard
            label="Low risk"
            value={user && !reviewLoadFailed ? lowRiskReviews : '—'}
            detail="Reviews marked low risk"
            tone="green"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Quick actions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Choose a task to get started.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Link
            href="/review"
            className="group flex min-h-32 items-start gap-4 rounded-xl border border-blue-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <FilePlus2 size={19} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-900">
                Review a contract
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                Upload a PDF, DOCX, or text file, or paste an agreement for
                analysis.
              </span>
            </span>
            <ArrowRight
              className="mt-1 text-blue-800 transition-transform group-hover:translate-x-1"
              size={17}
            />
          </Link>
          <QuickAction
            href="/legal-assistant"
            icon={Bot}
            title="Ask legal assistant"
            description="Get general Indian-law information with candidate references clearly marked unverified."
          />
          <QuickAction
            href="/case-guidance"
            icon={BriefcaseBusiness}
            title="Get case guidance"
            description="Organize facts, possible next steps, and questions for an advocate."
          />
          <QuickAction
            href="/legal-drafting"
            icon={WandSparkles}
            title="Draft a legal document"
            description="Prepare a draft from structured information for legal review."
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 size={16} className="text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-800">
              Recent documents
            </h2>
          </div>
          {user && (
            <Link
              href="/reviews"
              className="text-xs font-semibold text-blue-800 hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        {reviewLoadFailed ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
            Recent documents are unavailable until your review history can be
            loaded.
          </div>
        ) : user ? (
          <RecentReviews reviews={recentReviews} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-600">
            {supabaseConfigured
              ? 'Sign in to see recent saved reviews. You can still try the contract review demo without an account.'
              : 'Connect Supabase to save private reviews. You can still try the contract review demo without an account.'}
            <Link
              href="/review"
              className="ml-1 font-semibold text-blue-800 underline underline-offset-2"
            >
              Open contract review
            </Link>
            .
          </div>
        )}
      </section>
    </div>
  );
}
