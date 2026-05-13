'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { setToken } from '../lib/auth';

type LoginResponse = {
  message: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await res.json()) as LoginResponse | { message?: string };

      if (!res.ok) {
        setErrorMessage(
          typeof data.message === 'string'
            ? data.message
            : 'Login failed. Please try again.',
        );
        return;
      }

      setToken((data as LoginResponse).accessToken);
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-10 text-white">
      <div className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-white">Login</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Sign in to create and manage your own flows.
        </p>

        {errorMessage && (
          <div
            data-cy="login-error"
            className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              data-cy="login-email"
              type="email"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Password
            </label>
            <input
              data-cy="login-password"
              type="password"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          <button
            data-cy="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-400">
          No account yet?{' '}
          <Link href="/register" className="text-blue-400 underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}