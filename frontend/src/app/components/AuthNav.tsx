'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { removeToken } from '../lib/auth';

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

    void loadUser();
  }, []);

  function handleLogout() {
    removeToken();
    window.location.href = '/';
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-black">
          Flow Management Platform
        </Link>

        <nav className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-neutral-500">Loading...</span>
          ) : user ? (
            <>
              <span className="text-sm text-neutral-600">{user.email}</span>
              <Link
                href="/login"
                className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
              >
                Switch user
              </Link>
              <button
                onClick={handleLogout}
                className="rounded bg-black px-3 py-2 text-sm text-white hover:bg-neutral-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded bg-black px-3 py-2 text-sm text-white hover:bg-neutral-800"
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