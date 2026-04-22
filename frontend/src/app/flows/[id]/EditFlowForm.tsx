'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { getToken } from '../../lib/auth';

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  ownerId?: string | null;
};

type MeResponse = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export default function EditFlowForm({ flow }: { flow: Flow }) {
  const [title, setTitle] = useState(flow.title);
  const [description, setDescription] = useState(flow.description ?? '');
  const [visibility, setVisibility] = useState(flow.visibility);
  const [status, setStatus] = useState(flow.status);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!getToken()) {
      setErrorMessage('You must be logged in to update a flow.');
      return;
    }

    if (!isOwner) {
      setErrorMessage('Only the owner can update this flow.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await apiFetch(`/flows/${flow.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          description,
          visibility,
          status,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as {
          message?: string | string[];
        };

        if (Array.isArray(errorData.message)) {
          setErrorMessage(errorData.message.join(', '));
        } else if (typeof errorData.message === 'string') {
          setErrorMessage(errorData.message);
        } else {
          setErrorMessage('Failed to update flow.');
        }

        return;
      }

      setSuccessMessage('Flow updated successfully.');
    } catch {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!currentUser) {
    return (
      <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-sm">
        <h2 className="text-xl font-semibold">Edit Flow</h2>
        <p className="mt-2 text-sm text-neutral-400">
          You must be logged in as the owner to edit flow metadata.
        </p>
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-sm">
        <h2 className="text-xl font-semibold">Edit Flow</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Only the owner can change flow metadata, visibility, and sharing
          settings. Shared editors can still modify the graph below.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Edit Flow</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Update the flow metadata without changing the graph itself.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Title
            </label>
            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Flow title"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Description
            </label>
            <textarea
              className="min-h-[42px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Visibility
            </label>
            <select
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex justify-start">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Updating...' : 'Update Flow'}
          </button>
        </div>
      </form>
    </section>
  );
}