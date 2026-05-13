'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { AUTH_CHANGED_EVENT, removeToken } from '../lib/auth';

type MeResponse = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export default function AuthNav() {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);

      try {
        const res = await apiFetch('/auth/me');

        if (!res.ok) {
          setUser(null);
          return;
        }

        const data = (await res.json()) as MeResponse;
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    function handleAuthChanged() {
      void loadUser();
    }

    void loadUser();

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener('storage', handleAuthChanged);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener('storage', handleAuthChanged);
    };
  }, []);

  function handleLogout() {
    removeToken();
    window.location.href = '/';
  }

  return (
    <header className="border-b border-neutral-800 bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-white">
          Flow Management Platform
        </Link>

        <nav className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-neutral-400">Loading...</span>
          ) : user ? (
            <>
              <span data-cy="current-user-email" className="text-sm text-neutral-300">
                {user.email}
              </span>

              <Link
                data-cy="switch-user-link"
                href="/login"
                className="rounded border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
              >
                Switch user
              </Link>

              <button
                data-cy="logout-button"
                onClick={handleLogout}
                className="rounded bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                data-cy="login-link"
                href="/login"
                className="rounded border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
              >
                Login
              </Link>

              <Link
                data-cy="register-link"
                href="/register"
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-500"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}