'use client';

import { useEffect, useState } from 'react';

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

    await fetch('http://localhost:3001/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        visibility,
        status,
      }),
    });

    // reset form
    setTitle('');
    setDescription('');
    setVisibility('private');
    setStatus('draft');

    // refresh list
    fetchFlows();
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Flow Management Platform
      </h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <h2 className="text-xl font-semibold">Create Flow</h2>

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

        <button className="bg-blue-500 text-white px-4 py-2">
          Create Flow
        </button>
      </form>

      {/* LIST */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Flows</h2>

        {flows.length === 0 ? (
          <p>No flows found.</p>
        ) : (
          <ul className="space-y-4">
            {flows.map((flow) => (
              <li key={flow.id} className="border rounded p-4">
                <h3 className="font-medium">{flow.title}</h3>
                <p className="text-sm text-gray-600">
                  {flow.status} | {flow.visibility}
                </p>
                {flow.description && <p>{flow.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}