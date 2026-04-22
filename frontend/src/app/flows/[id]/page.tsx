'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import EditFlowForm from './EditFlowForm';
import FlowEditor from './FlowEditor';
import { apiFetch } from '../../lib/api';

type FlowGraph = {
  nodes: {
    id: string;
    type: 'start' | 'question' | 'end' | 'info';
    label: string;
    position: {
      x: number;
      y: number;
    };
    questionType?: 'singleChoice' | 'number' | 'text';
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
    condition?: {
      kind: 'number';
      operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
      value: number;
    };
  }[];
};

type Flow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  ownerId?: string | null;
  graph?: FlowGraph | null;
  createdAt: string;
  updatedAt: string;
};

export default function FlowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [flowId, setFlowId] = useState<string | null>(null);

  useEffect(() => {
    async function resolveParamsAndFetch() {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      setFlowId(id);

      try {
        const res = await apiFetch(`/flows/${id}`);

        if (res.status === 403) {
          setIsForbidden(true);
          setFlow(null);
          return;
        }

        if (res.status === 404) {
          setIsNotFound(true);
          setFlow(null);
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch flow');
        }

        const data = (await res.json()) as Flow;
        setFlow(data);
      } catch (error) {
        console.error('Failed to fetch flow:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void resolveParamsAndFetch();
  }, [params]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl p-8 text-white">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
          <p className="text-neutral-300">Loading flow...</p>
        </div>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main className="mx-auto max-w-4xl p-8 text-white">
        <div className="rounded-xl border border-red-800 bg-red-950 p-6">
          <h1 className="mb-2 text-2xl font-bold">Access denied</h1>
          <p className="text-red-200">
            You do not have permission to view this flow.
          </p>
        </div>
      </main>
    );
  }

  if (isNotFound || !flow || !flowId) {
    return (
      <main className="mx-auto max-w-4xl p-8 text-white">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
          <h1 className="mb-2 text-2xl font-bold">Flow not found</h1>
          <p className="text-neutral-300">
            The requested flow could not be found.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 text-white">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-4 text-2xl font-bold">{flow.title}</h1>

          <p className="mb-2 text-sm text-neutral-400">Status: {flow.status}</p>
          <p className="mb-4 text-sm text-neutral-400">
            Visibility: {flow.visibility}
          </p>

          {flow.description && <p className="mb-4">{flow.description}</p>}

          <p className="text-sm text-neutral-500">
            Created: {new Date(flow.createdAt).toLocaleString()}
          </p>
        </div>

        <Link
          href={`/flows/${flow.id}/play`}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          Play Flow
        </Link>
      </div>

      <EditFlowForm flow={flow} />

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Flow Editor</h2>
        <FlowEditor
          flowId={flow.id}
          initialGraph={flow.graph ?? null}
          ownerId={flow.ownerId ?? null}
        />
      </div>
    </main>
  );
}