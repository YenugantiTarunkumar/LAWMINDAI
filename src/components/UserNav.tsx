'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: string;
  email?: string;
}

export default function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setIsConfigured(data.isConfigured);
        }
      } catch {
        // network or auth error
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Sign out failed. Please try again.');
      }
      setUser(null);
      router.replace('/');
    } catch {
      setLogoutError('Sign out failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-9 items-center px-3 text-xs text-zinc-400">
        Checking session…
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-1 border-t border-zinc-100 p-3 dark:border-zinc-800">
        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Auth: Setup Required
        </span>
        <p className="text-[10px] text-zinc-400">
          Add Supabase keys in .env.local for private user data.
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900">
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {user.email}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              ● Online (Private Session)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-zinc-200 bg-white py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Sign Out
        </button>
        {logoutError && (
          <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">
            {logoutError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-zinc-100 p-3 dark:border-zinc-800">
      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        Create Account
      </Link>
    </div>
  );
}
