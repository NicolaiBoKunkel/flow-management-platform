import { notFound } from 'next/navigation';
import EditFlowForm from './EditFlowForm';
import FlowEditor from './FlowEditor';

type FlowGraph = {
  nodes: {
    id: string;
    type: 'start' | 'question' | 'end' | 'info';
    label: string;
    position: {
      x: number;
      y: number;
    };
    introText?: string;
    questionText?: string;
    resultText?: string;
    infoText?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
};

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  graph?: FlowGraph | null;
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
      <h1 className="mb-4 text-2xl font-bold">{flow.title}</h1>

      <p className="mb-2 text-sm text-gray-600">Status: {flow.status}</p>
      <p className="mb-4 text-sm text-gray-600">
        Visibility: {flow.visibility}
      </p>

      {flow.description && <p className="mb-4">{flow.description}</p>}

      <p className="mb-8 text-sm text-gray-500">
        Created: {new Date(flow.createdAt).toLocaleString()}
      </p>

      <EditFlowForm flow={flow} />

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Flow Editor</h2>
        <FlowEditor flowId={flow.id} initialGraph={flow.graph ?? null} />
      </div>
    </main>
  );
}