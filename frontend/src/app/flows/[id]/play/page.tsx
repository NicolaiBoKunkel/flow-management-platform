import Link from 'next/link';
import { notFound } from 'next/navigation';
import FlowPlayer from './FlowPlayer';

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

export default async function FlowPlayPage({
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
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{flow.title}</h1>
            <p className="mt-2 text-sm text-neutral-400">Play Mode</p>
          </div>

          <Link
            href={`/flows/${flow.id}`}
            className="rounded border border-neutral-700 px-4 py-2 text-sm text-white hover:bg-neutral-900"
          >
            Back to Editor
          </Link>
        </div>

        <FlowPlayer flowId={flow.id} graph={flow.graph ?? null} />
      </div>
    </main>
  );
}