'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
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
  graph?: FlowGraph | null;
};

export default function FlowPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    async function resolveParamsAndFetch() {
      const resolvedParams = await params;
      const id = resolvedParams.id;

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
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-neutral-300">Loading flow...</p>
        </div>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-800 bg-red-950 p-6">
          <h1 className="mb-2 text-2xl font-bold">Access denied</h1>
          <p className="text-red-200">
            You do not have permission to play this flow.
          </p>
        </div>
      </main>
    );
  }

  if (isNotFound || !flow) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h1 className="mb-2 text-2xl font-bold">Flow not found</h1>
          <p className="text-neutral-300">
            The requested flow could not be found.
          </p>
        </div>
      </main>
    );
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