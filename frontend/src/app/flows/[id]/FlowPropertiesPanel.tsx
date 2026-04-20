'use client';

import type {
  DomainNodeType,
  NumberOperator,
  QuestionType,
} from './flow-editor.types';

type FlowPropertiesPanelProps = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  nodeLabel: string;
  setNodeLabel: React.Dispatch<React.SetStateAction<string>>;
  introText: string;
  setIntroText: React.Dispatch<React.SetStateAction<string>>;
  questionText: string;
  setQuestionText: React.Dispatch<React.SetStateAction<string>>;
  resultText: string;
  setResultText: React.Dispatch<React.SetStateAction<string>>;
  infoText: string;
  setInfoText: React.Dispatch<React.SetStateAction<string>>;
  edgeLabel: string;
  setEdgeLabel: React.Dispatch<React.SetStateAction<string>>;
  selectedNodeType: DomainNodeType;
  questionType: QuestionType;
  setQuestionType: React.Dispatch<React.SetStateAction<QuestionType>>;
  selectedEdgeSourceQuestionType: QuestionType | null;
  edgeConditionOperator: NumberOperator;
  setEdgeConditionOperator: React.Dispatch<React.SetStateAction<NumberOperator>>;
  edgeConditionValue: string;
  setEdgeConditionValue: React.Dispatch<React.SetStateAction<string>>;
  handleUpdateNodeType: (newType: DomainNodeType) => void;
  handleUpdateNodeContent: () => void;
  handleDeleteNode: () => void;
  handleUpdateEdgeLabel: () => void;
  handleDeleteEdge: () => void;
};

function formatGeneratedNumberLabel(
  operator: NumberOperator,
  value: string,
): string {
  if (value.trim() === '') {
    return 'No condition configured yet';
  }

  const operatorMap: Record<NumberOperator, string> = {
    lt: '<',
    lte: '<=',
    gt: '>',
    gte: '>=',
    eq: '=',
  };

  return `${operatorMap[operator]} ${value}`;
}

export default function FlowPropertiesPanel({
  selectedNodeId,
  selectedEdgeId,
  nodeLabel,
  setNodeLabel,
  introText,
  setIntroText,
  questionText,
  setQuestionText,
  resultText,
  setResultText,
  infoText,
  setInfoText,
  edgeLabel,
  setEdgeLabel,
  selectedNodeType,
  questionType,
  setQuestionType,
  selectedEdgeSourceQuestionType,
  edgeConditionOperator,
  setEdgeConditionOperator,
  edgeConditionValue,
  setEdgeConditionValue,
  handleUpdateNodeType,
  handleUpdateNodeContent,
  handleDeleteNode,
  handleUpdateEdgeLabel,
  handleDeleteEdge,
}: FlowPropertiesPanelProps) {
  const isNumberEdge = selectedEdgeSourceQuestionType === 'number';

  return (
    <aside className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Properties</h2>

      {!selectedNodeId && !selectedEdgeId && (
        <div className="rounded-lg border border-dashed border-neutral-700 p-4 text-sm text-neutral-400">
          Select a node or an edge to edit its properties.
        </div>
      )}

      {selectedNodeId && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Selected Node</h3>
            <p className="text-sm text-neutral-500">ID: {selectedNodeId}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Node label
            </label>
            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={nodeLabel}
              onChange={(e) => setNodeLabel(e.target.value)}
              placeholder="Node label"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Node type
            </label>
            <select
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
              value={selectedNodeType}
              onChange={(e) =>
                handleUpdateNodeType(e.target.value as DomainNodeType)
              }
            >
              <option value="start">Start</option>
              <option value="question">Question</option>
              <option value="info">Info</option>
              <option value="end">End</option>
            </select>
          </div>

          {selectedNodeType === 'start' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">
                Intro text
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Welcome text or introduction shown before the flow begins"
              />
            </div>
          )}

          {selectedNodeType === 'question' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Question type
                </label>
                <select
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={questionType}
                  onChange={(e) =>
                    setQuestionType(e.target.value as QuestionType)
                  }
                >
                  <option value="singleChoice">Single choice</option>
                  <option value="number">Number</option>
                  <option value="text" disabled>
                    Text (coming soon)
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Question text
                </label>
                <textarea
                  className="min-h-[100px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="What should the user be asked?"
                />
              </div>
            </div>
          )}

          {selectedNodeType === 'info' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">
                Info text
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={infoText}
                onChange={(e) => setInfoText(e.target.value)}
                placeholder="Informational text shown to the user"
              />
            </div>
          )}

          {selectedNodeType === 'end' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">
                Result text
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Final recommendation or result shown to the user"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpdateNodeContent}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Update Node Content
            </button>

            <button
              onClick={handleDeleteNode}
              className="rounded bg-red-600 px-4 py-2 text-white"
            >
              Delete Node
            </button>
          </div>
        </div>
      )}

      {selectedEdgeId && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Selected Edge</h3>
            <p className="text-sm text-neutral-500">ID: {selectedEdgeId}</p>
          </div>

          {!isNumberEdge && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">
                Edge label
              </label>
              <input
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
                placeholder="e.g. Yes / No"
              />
            </div>
          )}

          {isNumberEdge && (
            <div className="rounded-lg border border-blue-900 bg-blue-950/40 p-4">
              <p className="text-sm font-medium text-blue-300">
                Edge label is generated automatically
              </p>
              <p className="mt-2 text-sm text-blue-200">
                Generated label:{' '}
                <span className="font-semibold">
                  {formatGeneratedNumberLabel(
                    edgeConditionOperator,
                    edgeConditionValue,
                  )}
                </span>
              </p>
            </div>
          )}

          {isNumberEdge && (
            <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Number condition operator
                </label>
                <select
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={edgeConditionOperator}
                  onChange={(e) =>
                    setEdgeConditionOperator(e.target.value as NumberOperator)
                  }
                >
                  <option value="eq">Equal (=)</option>
                  <option value="lt">Less than (&lt;)</option>
                  <option value="lte">Less than or equal (&lt;=)</option>
                  <option value="gt">Greater than (&gt;)</option>
                  <option value="gte">Greater than or equal (&gt;=)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Number condition value
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={edgeConditionValue}
                  onChange={(e) => setEdgeConditionValue(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpdateEdgeLabel}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Update Edge
            </button>

            <button
              onClick={handleDeleteEdge}
              className="rounded bg-red-600 px-4 py-2 text-white"
            >
              Delete Edge
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}