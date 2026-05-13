'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { setToken } from '../lib/auth';

type RegisterResponse = {
  message: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

export default function RegisterPage() {
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
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await res.json()) as RegisterResponse | { message?: string };

      if (!res.ok) {
        setErrorMessage(
          typeof data.message === 'string'
            ? data.message
            : 'Registration failed. Please try again.',
        );
        return;
      }

      setToken((data as RegisterResponse).accessToken);
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
        <h1 className="mb-2 text-2xl font-bold text-white">Register</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Create an account to own and edit flows.
        </p>

        {errorMessage && (
          <div
            data-cy="register-error"
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
              data-cy="register-email"
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
              data-cy="register-password"
              type="password"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <button
            data-cy="register-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}