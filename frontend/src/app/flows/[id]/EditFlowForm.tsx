'use client';

import { useState } from 'react';

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch(`http://localhost:3001/flows/${flow.id}`, {
        method: 'PATCH',
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
          setErrorMessage('Failed to update flow.');
        }

        return;
      }

      setSuccessMessage('Flow updated successfully.');
    } catch {
      setErrorMessage('Could not connect to the server.');
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Edit Flow</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && <p className="text-green-600">{successMessage}</p>}
        {errorMessage && <p className="text-red-600">{errorMessage}</p>}

        <input
          className="border p-2 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />

        <input
          className="border p-2 w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
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
          Update Flow
        </button>
      </form>
    </section>
  );
}