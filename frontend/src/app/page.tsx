'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
};

export default function Home() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [status, setStatus] = useState('draft');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function fetchFlows() {
    const res = await fetch('http://localhost:3001/flows');
    const data = await res.json();
    setFlows(data);
  }

  useEffect(() => {
    fetchFlows();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('http://localhost:3001/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          visibility,
          status,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();

        if (Array.isArray(errorData.message)) {
          setErrorMessage(errorData.message.join(', '));
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

    const confirmed = window.confirm(
      'Are you sure you want to delete this flow?',
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3001/flows/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setErrorMessage('Failed to delete flow.');
        return;
      }

      setSuccessMessage('Flow deleted successfully.');
      await fetchFlows();
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Flow Management Platform</h1>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <h2 className="text-xl font-semibold">Create Flow</h2>

        {successMessage && <p className="text-green-600">{successMessage}</p>}
        {errorMessage && <p className="text-red-600">{errorMessage}</p>}

        <input
          className="border p-2 w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="border p-2 w-full"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="private">Private</option>
          <option value="shared">Shared</option>
          <option value="public">Public</option>
        </select>

        <select
          className="border p-2 w-full"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Create Flow
        </button>
      </form>

      <section>
        <h2 className="text-xl font-semibold mb-4">Flows</h2>

        {flows.length === 0 ? (
          <p>No flows found.</p>
        ) : (
          <ul className="space-y-4">
            {flows.map((flow) => (
              <li key={flow.id} className="border rounded p-4">
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

                {flow.description && <p>{flow.description}</p>}

                <button
                  onClick={() => handleDelete(flow.id)}
                  className="mt-3 bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}