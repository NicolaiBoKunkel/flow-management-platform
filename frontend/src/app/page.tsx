'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from './lib/api';
import { getToken } from './lib/auth';

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  ownerId?: string | null;
};

type MeResponse = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [status, setStatus] = useState('draft');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function fetchFlows() {
    const res = await apiFetch('/flows');
    const data = (await res.json()) as Flow[];
    setFlows(data);
  }

  useEffect(() => {
    apiFetch('/flows')
      .then((res) => res.json())
      .then((data) => setFlows(data as Flow[]))
      .catch(() => {});

    const token = getToken();
    if (token) {
      apiFetch('/auth/me')
        .then((res) => {
          if (!res.ok) {
            setCurrentUser(null);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data) setCurrentUser(data as MeResponse);
        })
        .catch(() => setCurrentUser(null));
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!getToken()) {
      setErrorMessage('You must be logged in to create a flow.');
      return;
    }

    try {
      const res = await apiFetch('/flows', {
        method: 'POST',
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
          setErrorMessage('Failed to create flow.');
        }

        return;
      }

      setTitle('');
      setDescription('');
      setVisibility('private');
      setStatus('draft');
      setSuccessMessage('Flow created successfully.');

      await fetchFlows();
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  async function handleDelete(id: string) {
    setSuccessMessage('');
    setErrorMessage('');

    if (!getToken()) {
      setErrorMessage('You must be logged in to delete a flow.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this flow?',
    );

    if (!confirmed) return;

    try {
      const res = await apiFetch(`/flows/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string };

        if (typeof errorData.message === 'string') {
          setErrorMessage(errorData.message);
        } else {
          setErrorMessage('Failed to delete flow.');
        }

        return;
      }

      setSuccessMessage('Flow deleted successfully.');
      await fetchFlows();
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Flow Management Platform</h1>

      {!currentUser && (
        <div className="mb-6 rounded-lg border border-amber-800 bg-amber-950 px-4 py-3 text-amber-300">
          You are not logged in. You can browse flows, but creating, editing and
          deleting requires login.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mb-8 space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold">Create Flow</h2>

        {successMessage && (
          <div className="rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-300">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <input
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
          <option value="public">Public</option>
        </select>

        <select
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500">
          Create Flow
        </button>
      </form>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Flows</h2>

        {flows.length === 0 ? (
          <p className="text-neutral-400">No flows found.</p>
        ) : (
          <ul className="space-y-4">
            {flows.map((flow) => (
              <li
                key={flow.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-sm"
              >
                <h3 className="font-medium">
                  <Link
                    href={`/flows/${flow.id}`}
                    className="text-blue-400 underline"
                  >
                    {flow.title}
                  </Link>
                </h3>

                <p className="text-sm text-neutral-400">
                  {flow.status} | {flow.visibility}
                </p>

                {flow.description && (
                  <p className="mt-2 text-neutral-200">{flow.description}</p>
                )}

                {currentUser && flow.ownerId === currentUser.id && (
                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="mt-3 rounded bg-red-600 px-3 py-1 text-white transition hover:bg-red-500"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}