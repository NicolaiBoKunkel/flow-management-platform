'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { getToken } from '../../lib/auth';

type Flow = {
  id: string;
  ownerId?: string | null;
};

type MeResponse = {
  id: string;
  email: string;
};

type FlowAccessEntry = {
  id: string;
  role: 'viewer' | 'editor';
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
};

export default function SharingPanel({ flow }: { flow: Flow }) {
  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);
  const [accessList, setAccessList] = useState<FlowAccessEntry[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

  useEffect(() => {
    async function fetchMe() {
      if (!getToken()) {
        setCurrentUser(null);
        return;
      }

      try {
        const res = await apiFetch('/auth/me');

        if (!res.ok) {
          setCurrentUser(null);
          return;
        }

        const data = (await res.json()) as MeResponse;
        setCurrentUser(data);
      } catch {
        setCurrentUser(null);
      }
    }

    void fetchMe();
  }, []);

  const isOwner = !!currentUser && flow.ownerId === currentUser.id;

  const loadAccessList = useCallback(async () => {
    if (!getToken()) {
      setAccessList([]);
      return;
    }

    setIsLoadingAccess(true);

    try {
      const res = await apiFetch(`/flows/${flow.id}/access`);

      if (!res.ok) {
        setAccessList([]);
        return;
      }

      const data = (await res.json()) as FlowAccessEntry[];
      setAccessList(data);
    } catch {
      setAccessList([]);
    } finally {
      setIsLoadingAccess(false);
    }
  }, [flow.id]);

  useEffect(() => {
    if (isOwner) {
      void loadAccessList();
    }
  }, [isOwner, loadAccessList]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await apiFetch(`/flows/${flow.id}/access`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          role,
        }),
      });

      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        setErrorMessage(
          typeof data.message === 'string'
            ? data.message
            : 'Failed to share flow.',
        );
        return;
      }

      setEmail('');
      setRole('viewer');
      setSuccessMessage('Access updated successfully.');
      await loadAccessList();
    } catch {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveAccess(accessId: string) {
    setSuccessMessage('');
    setErrorMessage('');

    const confirmed = window.confirm(
      'Are you sure you want to remove this user from the shared access list?',
    );

    if (!confirmed) return;

    try {
      const res = await apiFetch(`/flows/${flow.id}/access/${accessId}`, {
        method: 'DELETE',
      });

      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        setErrorMessage(
          typeof data.message === 'string'
            ? data.message
            : 'Failed to remove access.',
        );
        return;
      }

      setSuccessMessage('Access removed successfully.');
      await loadAccessList();
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  if (!currentUser || !isOwner) {
    return null;
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Sharing</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Share this flow with registered users by email.
        </p>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleShare} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input
          type="email"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          placeholder="Registered user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          value={role}
          onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Sharing...' : 'Share'}
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-lg font-medium">Shared users</h3>

        {isLoadingAccess ? (
          <p className="text-sm text-neutral-400">Loading shared users...</p>
        ) : accessList.length === 0 ? (
          <p className="text-sm text-neutral-400">
            This flow is not shared with any users yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {accessList.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{entry.user.email}</p>
                  <p className="text-sm text-neutral-400">
                    Role: {entry.role}
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveAccess(entry.id)}
                  className="rounded bg-red-600 px-3 py-1 text-sm text-white transition hover:bg-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}