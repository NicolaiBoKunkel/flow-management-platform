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
    <main className="mx-auto w-full max-w-md px-6 py-10">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Register</h1>
        <p className="mb-6 text-sm text-neutral-600">
          Create an account to own and edit flows.
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-black px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}