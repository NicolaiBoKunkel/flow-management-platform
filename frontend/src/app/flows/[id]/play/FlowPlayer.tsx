'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import type {
  FlowEdge,
  FlowGraph,
  FlowNode,
} from '../flow-editor.types';

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
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [error, setError] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [textValue, setTextValue] = useState('');

  const outgoingEdges = useMemo(() => {
    if (!graph || !currentNode) {
      return [];
    }

    return graph.edges.filter((edge) => edge.source === currentNode.id);
  }, [graph, currentNode]);

  async function startSession() {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiFetch(`/flows/${flowId}/sessions`, {
        method: 'POST',
      });

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
      setHasStarted(true);
      setNumericValue('');
      setTextValue('');
    } catch (err) {
      console.error('Failed to start flow session:', err);
      setError('An unexpected error occurred while starting play mode.');
    } finally {
      setIsLoading(false);
    }
  }

  async function advance(
    selectedEdgeId?: string,
    submittedNumericValue?: number,
    submittedTextValue?: string,
  ) {
    if (!sessionId) return;

    setIsAdvancing(true);
    setError('');

    try {
      const body =
        typeof submittedNumericValue === 'number'
          ? { numericValue: submittedNumericValue }
          : typeof submittedTextValue === 'string'
            ? { textValue: submittedTextValue }
            : selectedEdgeId
              ? { selectedEdgeId }
              : {};

      const response = await apiFetch(
        `/flows/${flowId}/sessions/${sessionId}/advance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
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
      setNumericValue('');
      setTextValue('');
    } catch (err) {
      console.error('Failed to advance flow session:', err);
      setError('An unexpected error occurred while advancing the flow.');
    } finally {
      setIsAdvancing(false);
    }
  }

  async function submitNumericAnswer() {
    const parsedValue = Number(numericValue);

    if (numericValue.trim() === '' || Number.isNaN(parsedValue)) {
      setError('Please enter a valid number.');
      return;
    }

    await advance(undefined, parsedValue);
  }

  async function submitTextAnswer() {
    if (textValue.trim() === '') {
      setError('Please enter some text.');
      return;
    }

    await advance(undefined, undefined, textValue.trim());
  }

  async function goBack() {
    if (!sessionId) return;

    setIsGoingBack(true);
    setError('');

    try {
      const response = await apiFetch(
        `/flows/${flowId}/sessions/${sessionId}/back`,
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
      setNumericValue('');
      setTextValue('');
    } catch (err) {
      console.error('Failed to go back in flow session:', err);
      setError('An unexpected error occurred while going back.');
    } finally {
      setIsGoingBack(false);
    }
  }

  if (!graph) {
    return (
      <div
        data-cy="flow-player-no-graph"
        className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300"
      >
        This flow does not contain a graph.
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div
        data-cy="flow-player-start-screen"
        className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-sm"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-neutral-400">
              Play mode
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Ready to start
            </h2>
          </div>

          <p className="text-neutral-300">
            Start a new session to run this flow step by step.
          </p>

          {error && (
            <div
              data-cy="flow-player-error"
              className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
            >
              {error}
            </div>
          )}

          <button
            data-cy="start-flow-button"
            onClick={startSession}
            disabled={isLoading}
            className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
          >
            {isLoading ? 'Starting...' : 'Start Flow'}
          </button>
        </div>
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div
        data-cy="flow-player-no-current-node"
        className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300"
      >
        No current node available.
      </div>
    );
  }

  return (
    <div
      data-cy="flow-player-session"
      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-sm"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-400">
            Session status
          </p>
          <p
            data-cy="session-status"
            className="mt-1 text-base font-medium text-white"
          >
            {sessionStatus ?? 'unknown'}
          </p>
        </div>

        <button
          data-cy="back-button"
          onClick={goBack}
          disabled={!canGoBack || isGoingBack || isAdvancing}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGoingBack ? 'Going back...' : 'Back'}
        </button>
      </div>

      {error && (
        <div
          data-cy="flow-player-error"
          className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
        >
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-neutral-400">
          Node type
        </p>
        <h2
          data-cy="current-node-type"
          className="mt-1 text-2xl font-bold capitalize"
        >
          {currentNode.type}
        </h2>
      </div>

      {currentNode.type === 'start' && (
        <div data-cy="start-node-view" className="space-y-6">
          <p
            data-cy="start-node-text"
            className="text-lg leading-7 text-neutral-100"
          >
            {currentNode.introText || 'Welcome to this flow.'}
          </p>

          <button
            data-cy="continue-flow-button"
            onClick={() => advance()}
            disabled={isAdvancing || isGoingBack}
            className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
          >
            {isAdvancing ? 'Continuing...' : 'Continue'}
          </button>
        </div>
      )}

      {currentNode.type === 'info' && (
        <div data-cy="info-node-view" className="space-y-6">
          <p
            data-cy="info-node-text"
            className="text-lg leading-7 text-neutral-100"
          >
            {currentNode.infoText || 'Information'}
          </p>

          <button
            data-cy="continue-flow-button"
            onClick={() => advance()}
            disabled={isAdvancing || isGoingBack}
            className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
          >
            {isAdvancing ? 'Continuing...' : 'Continue'}
          </button>
        </div>
      )}

      {currentNode.type === 'question' &&
        currentNode.questionType === 'number' && (
          <div data-cy="number-question-view" className="space-y-6">
            <p
              data-cy="question-text"
              className="text-lg leading-7 text-neutral-100"
            >
              {currentNode.questionText || currentNode.label}
            </p>

            <div className="space-y-4">
              <input
                data-cy="numeric-answer-input"
                type="number"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                disabled={isAdvancing || isGoingBack}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
                placeholder="Enter a number"
              />

              <button
                data-cy="submit-numeric-answer"
                onClick={submitNumericAnswer}
                disabled={isAdvancing || isGoingBack}
                className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
              >
                {isAdvancing ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}

      {currentNode.type === 'question' &&
        currentNode.questionType === 'text' && (
          <div data-cy="text-question-view" className="space-y-6">
            <p
              data-cy="question-text"
              className="text-lg leading-7 text-neutral-100"
            >
              {currentNode.questionText || currentNode.label}
            </p>

            <div className="space-y-4">
              <textarea
                data-cy="text-answer-input"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                disabled={isAdvancing || isGoingBack}
                className="min-h-[120px] w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
                placeholder="Write your answer here"
              />

              <button
                data-cy="submit-text-answer"
                onClick={submitTextAnswer}
                disabled={isAdvancing || isGoingBack}
                className="rounded bg-blue-700 px-5 py-2.5 text-white disabled:opacity-50"
              >
                {isAdvancing ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}

      {currentNode.type === 'question' &&
        currentNode.questionType !== 'number' &&
        currentNode.questionType !== 'text' && (
          <div data-cy="single-choice-question-view" className="space-y-6">
            <p
              data-cy="question-text"
              className="text-lg leading-7 text-neutral-100"
            >
              {currentNode.questionText || currentNode.label}
            </p>

            <div className="flex flex-col gap-3">
              {outgoingEdges.map((edge) => (
                <button
                  data-cy="choice-answer-button"
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
        <div data-cy="end-node-view" className="space-y-6">
          <p
            data-cy="flow-result-text"
            className="text-lg leading-7 text-neutral-100"
          >
            {currentNode.resultText || 'Flow completed.'}
          </p>

          <div
            data-cy="flow-completed-message"
            className="rounded-lg border border-green-800 bg-green-950 p-4 text-green-300"
          >
            This flow has been completed.
          </div>
        </div>
      )}
    </div>
  );
}