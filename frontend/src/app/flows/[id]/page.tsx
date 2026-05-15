'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import EditFlowForm from './EditFlowForm';
import FlowAnalysisPanel from './FlowAnalysisPanel';
import FlowEditor from './FlowEditor';
import SharingPanel from './SharingPanel';
import type { FlowGraph } from './flow-editor.types';

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
  graph?: FlowGraph | null;
  accessList?: FlowAccessEntry[];
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
  const [analysisRefreshKey, setAnalysisRefreshKey] = useState(0);
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  function handleGraphSaved() {
    setAnalysisRefreshKey((current) => current + 1);
  }

  function createSafeFilename(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function handleExportFlow() {
    if (!flow) return;

    setIsExporting(true);
    setExportError('');

    try {
      const res = await apiFetch(`/flows/${flow.id}/export`);

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;

        setExportError(errorData?.message ?? 'Failed to export flow.');
        return;
      }

      const exportData = await res.json();
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], {
        type: 'application/json',
      });

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const safeTitle = createSafeFilename(flow.title) || 'flow-export';

      link.href = objectUrl;
      link.download = `${safeTitle}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to export flow:', error);
      setExportError('An unexpected error occurred while exporting the flow.');
    } finally {
      setIsExporting(false);
    }
  }

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

          {exportError && (
            <div
              data-cy="export-flow-error"
              className="mt-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300"
            >
              {exportError}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            data-cy="export-flow-button"
            type="button"
            onClick={handleExportFlow}
            disabled={isExporting}
            className="rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export Flow'}
          </button>

          <Link
            href={`/flows/${flow.id}/play`}
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            Play Flow
          </Link>
        </div>
      </div>

      <EditFlowForm flow={flow} />
      <SharingPanel flow={flow} />

      <FlowAnalysisPanel flowId={flow.id} refreshKey={analysisRefreshKey} />

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Flow Editor</h2>
        <FlowEditor
          flowId={flow.id}
          initialGraph={flow.graph ?? null}
          ownerId={flow.ownerId ?? null}
          accessList={flow.accessList ?? []}
          onGraphSaved={handleGraphSaved}
        />
      </div>
    </main>
  );
}