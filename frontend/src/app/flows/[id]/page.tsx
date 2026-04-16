import { notFound } from 'next/navigation';
import EditFlowForm from './EditFlowForm';

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

async function getFlow(id: string): Promise<Flow | null> {
  const res = await fetch(`http://localhost:3001/flows/${id}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error('Failed to fetch flow');
  }

  return res.json();
}

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const flow = await getFlow(id);

  if (!flow) {
    notFound();
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">{flow.title}</h1>

      <p className="text-sm text-gray-600 mb-2">Status: {flow.status}</p>
      <p className="text-sm text-gray-600 mb-4">
        Visibility: {flow.visibility}
      </p>

      {flow.description && <p className="mb-4">{flow.description}</p>}

      <p className="text-sm text-gray-500 mb-8">
        Created: {new Date(flow.createdAt).toLocaleString()}
      </p>

      <EditFlowForm flow={flow} />
    </main>
  );
}