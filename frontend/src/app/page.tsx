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

  useEffect(() => {
    void fetchFlows();
    void fetchMe();
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
    <main className="mx-auto w-full max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Flow Management Platform</h1>

      {!currentUser && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          You are not logged in. You can browse flows, but creating, editing and
          deleting requires login.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Create Flow</h2>

        {successMessage && <p className="text-green-600">{successMessage}</p>}
        {errorMessage && <p className="text-red-600">{errorMessage}</p>}

        <input
          className="w-full rounded border p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full rounded border p-2"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
          <option value="public">Public</option>
        </select>

        <select
          className="w-full rounded border p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Create Flow
        </button>
      </form>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Flows</h2>

        {flows.length === 0 ? (
          <p>No flows found.</p>
        ) : (
          <ul className="space-y-4">
            {flows.map((flow) => (
              <li key={flow.id} className="rounded border bg-white p-4 shadow-sm">
                <h3 className="font-medium">
                  <Link
                    href={`/flows/${flow.id}`}
                    className="text-blue-600 underline"
                  >
                    {flow.title}
                  </Link>
                </h3>

                <p className="text-sm text-gray-600">
                  {flow.status} | {flow.visibility}
                </p>

                {flow.description && <p className="mt-2">{flow.description}</p>}

                {currentUser && flow.ownerId === currentUser.id && (
                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="mt-3 rounded bg-red-500 px-3 py-1 text-white"
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