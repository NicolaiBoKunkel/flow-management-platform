'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from './lib/api';
import { getToken } from './lib/auth';

type FlowAccessEntry = {
  id: string;
  role: 'viewer' | 'editor';
  user: {
    id: string;
    email: string;
  };
};

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  ownerId?: string | null;
  accessList?: FlowAccessEntry[];
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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
          if (data) {
            setCurrentUser(data as MeResponse);
          }
        })
        .catch(() => setCurrentUser(null));
    }
  }, []);

  const myFlows = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return flows.filter((flow) => flow.ownerId === currentUser.id);
  }, [flows, currentUser]);

  const sharedWithMeFlows = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return flows.filter(
      (flow) =>
        flow.ownerId !== currentUser.id &&
        flow.accessList?.some((entry) => entry.user.id === currentUser.id),
    );
  }, [flows, currentUser]);

  const publicFlows = useMemo(() => {
    return flows.filter((flow) => {
      const isOwner = currentUser ? flow.ownerId === currentUser.id : false;

      const isSharedWithMe = currentUser
        ? flow.accessList?.some((entry) => entry.user.id === currentUser.id)
        : false;

      return flow.visibility === 'public' && !isOwner && !isSharedWithMe;
    });
  }, [flows, currentUser]);

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

  async function handleImportFlow(e: React.FormEvent) {
    e.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!getToken()) {
      setErrorMessage('You must be logged in to import a flow.');
      return;
    }

    if (!importFile) {
      setErrorMessage('Please choose a JSON file to import.');
      return;
    }

    setIsImporting(true);

    try {
      const fileText = await importFile.text();
      const parsedJson = JSON.parse(fileText) as unknown;

      const res = await apiFetch('/flows/import', {
        method: 'POST',
        body: JSON.stringify(parsedJson),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as {
          message?: string | string[];
          errors?: string[];
        };

        if (Array.isArray(errorData.errors)) {
          setErrorMessage(errorData.errors.join(', '));
        } else if (Array.isArray(errorData.message)) {
          setErrorMessage(errorData.message.join(', '));
        } else if (typeof errorData.message === 'string') {
          setErrorMessage(errorData.message);
        } else {
          setErrorMessage('Failed to import flow.');
        }

        return;
      }

      setImportFile(null);
      setSuccessMessage('Flow imported successfully.');

      const fileInput = document.querySelector<HTMLInputElement>(
        '[data-cy="import-flow-file-input"]',
      );

      if (fileInput) {
        fileInput.value = '';
      }

      await fetchFlows();
    } catch (error) {
      console.error('Failed to import flow:', error);
      setErrorMessage('The selected file could not be imported as valid JSON.');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDelete(id: string) {
    setSuccessMessage('');
    setErrorMessage('');

    if (!getToken()) {
      setErrorMessage('You must be logged in to delete a flow.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this flow?');

    if (!confirmed) {
      return;
    }

    try {
      const res = await apiFetch(`/flows/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = (await res.json()) as {
          message?: string;
        };

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
          You are not logged in. You can browse public flows, but creating,
          editing, importing and deleting requires login.
        </div>
      )}

      <form
        data-cy="create-flow-form"
        onSubmit={handleSubmit}
        className="mb-8 space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold">Create Flow</h2>

        {successMessage && (
          <div
            data-cy="success-message"
            className="rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-300"
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            data-cy="error-message"
            className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300"
          >
            {errorMessage}
          </div>
        )}

        <input
          data-cy="create-flow-title"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          data-cy="create-flow-description"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          data-cy="flow-visibility"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
          <option value="public">Public</option>
        </select>

        <select
          data-cy="flow-status"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <button
          data-cy="create-flow-submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500"
        >
          Create Flow
        </button>
      </form>

      {currentUser && (
        <form
          data-cy="import-flow-form"
          onSubmit={handleImportFlow}
          className="mb-8 space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm"
        >
          <div>
            <h2 className="text-xl font-semibold">Import Flow</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Import a previously exported flow JSON file. Imported flows are
              created as your own private draft.
            </p>
          </div>

          <input
            data-cy="import-flow-file-input"
            type="file"
            accept="application/json,.json"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white file:mr-4 file:rounded file:border-0 file:bg-blue-700 file:px-3 file:py-1 file:text-white"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />

          <button
            data-cy="import-flow-submit"
            type="submit"
            disabled={isImporting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import Flow'}
          </button>
        </form>
      )}

      {currentUser && (
        <section data-cy="my-flows-section" className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">My Flows</h2>

          {myFlows.length === 0 ? (
            <p className="text-neutral-400">
              You have not created any flows yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {myFlows.map((flow) => (
                <li
                  data-cy="flow-list-item"
                  key={flow.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-sm"
                >
                  <h3 className="font-medium">
                    <Link
                      data-cy="flow-link"
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

                  <button
                    data-cy="delete-flow-button"
                    onClick={() => handleDelete(flow.id)}
                    className="mt-3 rounded bg-red-600 px-3 py-1 text-white transition hover:bg-red-500"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {currentUser && (
        <section data-cy="shared-with-me-section" className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Shared With Me</h2>

          {sharedWithMeFlows.length === 0 ? (
            <p className="text-neutral-400">
              No flows have been shared with you yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {sharedWithMeFlows.map((flow) => {
                const myAccess = flow.accessList?.find(
                  (entry) => entry.user.id === currentUser.id,
                );

                return (
                  <li
                    data-cy="shared-flow-list-item"
                    key={flow.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-sm"
                  >
                    <h3 className="font-medium">
                      <Link
                        data-cy="shared-flow-link"
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
                      <p className="mt-2 text-neutral-200">
                        {flow.description}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-amber-300">
                      Your role: {myAccess?.role ?? 'viewer'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section data-cy="public-flows-section">
        <h2 className="mb-4 text-xl font-semibold">Public Flows</h2>

        {publicFlows.length === 0 ? (
          <p className="text-neutral-400">No public flows found.</p>
        ) : (
          <ul className="space-y-4">
            {publicFlows.map((flow) => (
              <li
                data-cy="public-flow-list-item"
                key={flow.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-sm"
              >
                <h3 className="font-medium">
                  <Link
                    data-cy="public-flow-link"
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}