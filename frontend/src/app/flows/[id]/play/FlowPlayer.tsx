'use client';

import { useEffect, useMemo, useState } from 'react';

type DomainNodeType = 'start' | 'question' | 'end' | 'info';

type FlowNode = {
  id: string;
  type: DomainNodeType;
  label: string;
  position: {
    x: number;
    y: number;
  };
  introText?: string;
  questionText?: string;
  resultText?: string;
  infoText?: string;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type FlowPlayerProps = {
  flowId: string;
  graph: FlowGraph | null;
};

type SessionResponse = {
  sessionId: string;
  flowId: string;
  status: 'active' | 'completed' | 'abandoned';
  currentNode: FlowNode;
  canGoBack: boolean;
};

export default function FlowPlayer({ flowId, graph }: FlowPlayerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<FlowNode | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    'active' | 'completed' | 'abandoned' | null
  >(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [error, setError] = useState('');

  const outgoingEdges = useMemo(() => {
    if (!graph || !currentNode) {
      return [];
    }

    return graph.edges.filter((edge) => edge.source === currentNode.id);
  }, [graph, currentNode]);

  useEffect(() => {
    async function startSession() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(
          `http://localhost:3001/flows/${flowId}/sessions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          if (errorData?.message) {
            setError(String(errorData.message));
          } else {
            setError('Failed to start flow session.');
          }

          return;
        }

        const data: SessionResponse = await response.json();
        setSessionId(data.sessionId);
        setCurrentNode(data.currentNode);
        setSessionStatus(data.status);
        setCanGoBack(data.canGoBack);
      } catch (err) {
        console.error('Failed to start flow session:', err);
        setError('An unexpected error occurred while starting play mode.');
      } finally {
        setIsLoading(false);
      }
    }

    startSession();
  }, [flowId]);

  async function advance(selectedEdgeId?: string) {
    if (!sessionId) return;

    setIsAdvancing(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:3001/flows/${flowId}/sessions/${sessionId}/advance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(selectedEdgeId ? { selectedEdgeId } : {}),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (Array.isArray(errorData?.message)) {
          setError(errorData.message.join(', '));
        } else if (typeof errorData?.message === 'string') {
          setError(errorData.message);
        } else {
          setError('Failed to advance flow session.');
        }

        return;
      }

      const data: SessionResponse = await response.json();
      setCurrentNode(data.currentNode);
      setSessionStatus(data.status);
      setCanGoBack(data.canGoBack);
    } catch (err) {
      console.error('Failed to advance flow session:', err);
      setError('An unexpected error occurred while advancing the flow.');
    } finally {
      setIsAdvancing(false);
    }
  }

  async function goBack() {
    if (!sessionId) return;

    setIsGoingBack(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:3001/flows/${flowId}/sessions/${sessionId}/back`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (Array.isArray(errorData?.message)) {
          setError(errorData.message.join(', '));
        } else if (typeof errorData?.message === 'string') {
          setError(errorData.message);
        } else {
          setError('Failed to go back in flow session.');
        }

        return;
      }

      const data: SessionResponse = await response.json();
      setCurrentNode(data.currentNode);
      setSessionStatus(data.status);
      setCanGoBack(data.canGoBack);
    } catch (err) {
      console.error('Failed to go back in flow session:', err);
      setError('An unexpected error occurred while going back.');
    } finally {
      setIsGoingBack(false);
    }
  }

  if (!graph) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
        This flow does not contain a graph.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
        Starting flow...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
        {error}
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
        No current node available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-400">
            Session status
          </p>
          <p className="mt-1 text-base font-medium text-white">
            {sessionStatus ?? 'unknown'}
          </p>
        </div>

        <button
          onClick={goBack}
          disabled={!canGoBack || isGoingBack || isAdvancing}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGoingBack ? 'Going back...' : 'Back'}
        </button>
      </div>

      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-neutral-400">
          Node type
        </p>
        <h2 className="mt-1 text-2xl font-bold capitalize">
          {currentNode.type}
        </h2>
      </div>

      {currentNode.type === 'start' && (
        <div className="space-y-6">
          <p className="text-lg leading-7 text-neutral-100">
            {currentNode.introText || 'Welcome to this flow.'}
          </p>

          <button
            onClick={() => advance()}
            disabled={isAdvancing || isGoingBack}
            className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
          >
            {isAdvancing ? 'Continuing...' : 'Continue'}
          </button>
        </div>
      )}

      {currentNode.type === 'info' && (
        <div className="space-y-6">
          <p className="text-lg leading-7 text-neutral-100">
            {currentNode.infoText || 'Information'}
          </p>

          <button
            onClick={() => advance()}
            disabled={isAdvancing || isGoingBack}
            className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
          >
            {isAdvancing ? 'Continuing...' : 'Continue'}
          </button>
        </div>
      )}

      {currentNode.type === 'question' && (
        <div className="space-y-6">
          <p className="text-lg leading-7 text-neutral-100">
            {currentNode.questionText || currentNode.label}
          </p>

          <div className="flex flex-col gap-3">
            {outgoingEdges.map((edge) => (
              <button
                key={edge.id}
                onClick={() => advance(edge.id)}
                disabled={isAdvancing || isGoingBack}
                className="rounded border border-neutral-700 bg-neutral-950 px-4 py-3 text-left text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {edge.label || 'Continue'}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentNode.type === 'end' && (
        <div className="space-y-6">
          <p className="text-lg leading-7 text-neutral-100">
            {currentNode.resultText || 'Flow completed.'}
          </p>

          <div className="rounded-lg border border-green-800 bg-green-950 p-4 text-green-300">
            This flow has been completed.
          </div>
        </div>
      )}
    </div>
  );
}