'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type AnalysisNode = {
  nodeId: string;
  label: string;
  type: string;
};

type HighBranchingNode = AnalysisNode & {
  outgoingCount: number;
};

type FlowAnalysis =
  | {
      flowId: string;
      synced: false;
      message: string;
    }
  | {
      flowId: string;
      synced: true;
      nodeCount: number;
      edgeCount: number;
      pathsToEndCount: number;
      maxPathLength: number;
      deadEndNodes: AnalysisNode[];
      unreachableNodes: AnalysisNode[];
      highBranchingNodes: HighBranchingNode[];
    };

type FlowAnalysisPanelProps = {
  flowId: string;
  refreshKey: number;
};

export default function FlowAnalysisPanel({
  flowId,
  refreshKey,
}: FlowAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<FlowAnalysis | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnalysis = useCallback(
    async (showSuccessMessage = false) => {
      setIsLoadingAnalysis(true);
      setErrorMessage('');

      if (!showSuccessMessage) {
        setSuccessMessage('');
      }

      try {
        const res = await apiFetch(`/flows/${flowId}/analysis`);
        const data = (await res.json()) as unknown;

        if (!res.ok) {
          const errorData = data as { message?: string | string[] };

          if (Array.isArray(errorData.message)) {
            setErrorMessage(errorData.message.join(', '));
          } else if (typeof errorData.message === 'string') {
            setErrorMessage(errorData.message);
          } else {
            setErrorMessage('Failed to load flow analysis.');
          }

          return;
        }

        setAnalysis(data as FlowAnalysis);

        if (showSuccessMessage) {
          setSuccessMessage('Analysis refreshed after saving the flow.');
        }
      } catch {
        setErrorMessage('Could not connect to the server.');
      } finally {
        setIsLoadingAnalysis(false);
      }
    },
    [flowId],
  );

  useEffect(() => {
    if (refreshKey > 0) {
      void loadAnalysis(true);
    }
  }, [refreshKey, loadAnalysis]);

  async function syncProjection() {
    setIsSyncing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await apiFetch(`/flows/${flowId}/analysis/sync`, {
        method: 'POST',
      });

      const data = (await res.json()) as { message?: string | string[] };

      if (!res.ok) {
        if (Array.isArray(data.message)) {
          setErrorMessage(data.message.join(', '));
        } else if (typeof data.message === 'string') {
          setErrorMessage(data.message);
        } else {
          setErrorMessage('Failed to sync Neo4j projection.');
        }

        return;
      }

      setSuccessMessage('Neo4j projection synced successfully.');
      await loadAnalysis();
    } catch {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Flow Analysis</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Analysis is based on the Neo4j graph projection of this flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={syncProjection}
            disabled={isSyncing || isLoadingAnalysis}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Projection'}
          </button>

          <button
            onClick={() => loadAnalysis()}
            disabled={isLoadingAnalysis || isSyncing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingAnalysis ? 'Loading...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {!analysis && !errorMessage && !successMessage && (
        <p className="text-sm text-neutral-400">
          Click refresh to load graph analysis. If this is an older flow, use
          sync projection first.
        </p>
      )}

      {analysis && !analysis.synced && (
        <div className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-sm text-amber-300">
          No Neo4j projection found for this flow yet. Save the flow graph or
          click Sync Projection to generate it.
        </div>
      )}

      {analysis && analysis.synced && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Nodes" value={analysis.nodeCount} />
            <MetricCard label="Edges" value={analysis.edgeCount} />
            <MetricCard label="Paths to end" value={analysis.pathsToEndCount} />
            <MetricCard label="Max path length" value={analysis.maxPathLength} />
          </div>

          <NodeList
            title="Dead-end nodes"
            nodes={analysis.deadEndNodes}
            emptyText="No dead-end nodes found."
          />

          <NodeList
            title="Unreachable nodes"
            nodes={analysis.unreachableNodes}
            emptyText="No unreachable nodes found."
          />

          <HighBranchingList nodes={analysis.highBranchingNodes} />
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function NodeList({
  title,
  nodes,
  emptyText,
}: {
  title: string;
  nodes: AnalysisNode[];
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>

      {nodes.length === 0 ? (
        <p className="text-sm text-neutral-400">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {nodes.map((node) => (
            <li
              key={node.nodeId}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <span className="font-medium">{node.label}</span>{' '}
              <span className="text-neutral-400">({node.type})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HighBranchingList({ nodes }: { nodes: HighBranchingNode[] }) {
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">High branching nodes</h3>

      {nodes.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No high branching nodes found.
        </p>
      ) : (
        <ul className="space-y-2">
          {nodes.map((node) => (
            <li
              key={node.nodeId}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <span className="font-medium">{node.label}</span>{' '}
              <span className="text-neutral-400">
                ({node.type}, {node.outgoingCount} outgoing edges)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}