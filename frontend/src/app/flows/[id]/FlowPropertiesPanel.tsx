'use client';

import type { Dispatch, SetStateAction } from 'react';
import type {
  DomainNodeType,
  NumberConditionMode,
  NumberOperator,
  QuestionType,
} from './flow-editor.types';

type FlowPropertiesPanelProps = {
  canEdit: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  nodeLabel: string;
  setNodeLabel: Dispatch<SetStateAction<string>>;
  introText: string;
  setIntroText: Dispatch<SetStateAction<string>>;
  questionText: string;
  setQuestionText: Dispatch<SetStateAction<string>>;
  resultText: string;
  setResultText: Dispatch<SetStateAction<string>>;
  infoText: string;
  setInfoText: Dispatch<SetStateAction<string>>;
  multipleChoiceOptions: string[];
  setMultipleChoiceOptions: Dispatch<SetStateAction<string[]>>;
  edgeLabel: string;
  setEdgeLabel: Dispatch<SetStateAction<string>>;
  selectedNodeType: DomainNodeType;
  questionType: QuestionType;
  setQuestionType: Dispatch<SetStateAction<QuestionType>>;
  selectedEdgeSourceQuestionType: QuestionType | null;
  numberConditionMode: NumberConditionMode;
  setNumberConditionMode: Dispatch<SetStateAction<NumberConditionMode>>;
  edgeConditionOperator: NumberOperator;
  setEdgeConditionOperator: Dispatch<SetStateAction<NumberOperator>>;
  edgeConditionValue: string;
  setEdgeConditionValue: Dispatch<SetStateAction<string>>;
  edgeConditionMin: string;
  setEdgeConditionMin: Dispatch<SetStateAction<string>>;
  edgeConditionMax: string;
  setEdgeConditionMax: Dispatch<SetStateAction<string>>;
  edgeConditionMinInclusive: boolean;
  setEdgeConditionMinInclusive: Dispatch<SetStateAction<boolean>>;
  edgeConditionMaxInclusive: boolean;
  setEdgeConditionMaxInclusive: Dispatch<SetStateAction<boolean>>;
  handleUpdateNodeType: (newType: DomainNodeType) => void;
  handleUpdateNodeContent: () => void;
  handleDeleteNode: () => void;
  handleUpdateEdgeLabel: () => void;
  handleDeleteEdge: () => void;
};

function formatGeneratedNumberLabel(
  mode: NumberConditionMode,
  operator: NumberOperator,
  value: string,
  min: string,
  max: string,
  minInclusive: boolean,
  maxInclusive: boolean,
): string {
  if (mode === 'range') {
    if (min.trim() === '' || max.trim() === '') {
      return 'No range configured yet';
    }

    const leftBracket = minInclusive ? '[' : '(';
    const rightBracket = maxInclusive ? ']' : ')';

    return `${leftBracket}${min} - ${max}${rightBracket}`;
  }

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
  canEdit,
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
  multipleChoiceOptions,
  setMultipleChoiceOptions,
  edgeLabel,
  setEdgeLabel,
  selectedNodeType,
  questionType,
  setQuestionType,
  selectedEdgeSourceQuestionType,
  numberConditionMode,
  setNumberConditionMode,
  edgeConditionOperator,
  setEdgeConditionOperator,
  edgeConditionValue,
  setEdgeConditionValue,
  edgeConditionMin,
  setEdgeConditionMin,
  edgeConditionMax,
  setEdgeConditionMax,
  edgeConditionMinInclusive,
  setEdgeConditionMinInclusive,
  edgeConditionMaxInclusive,
  setEdgeConditionMaxInclusive,
  handleUpdateNodeType,
  handleUpdateNodeContent,
  handleDeleteNode,
  handleUpdateEdgeLabel,
  handleDeleteEdge,
}: FlowPropertiesPanelProps) {
  const isNumberEdge = selectedEdgeSourceQuestionType === 'number';

  function updateMultipleChoiceOption(index: number, value: string) {
    setMultipleChoiceOptions((currentOptions) =>
      currentOptions.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  function addMultipleChoiceOption() {
    setMultipleChoiceOptions((currentOptions) => [...currentOptions, '']);
  }

  function removeMultipleChoiceOption(index: number) {
    setMultipleChoiceOptions((currentOptions) =>
      currentOptions.filter((_, optionIndex) => optionIndex !== index),
    );
  }

  return (
    <aside
      data-cy="flow-properties-panel"
      className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold">Properties</h2>

      {!canEdit && (
        <div
          data-cy="properties-readonly-message"
          className="rounded-lg border border-dashed border-neutral-700 p-4 text-sm text-neutral-400"
        >
          You can inspect the selected node or edge, but only the owner can edit
          properties.
        </div>
      )}

      {!selectedNodeId && !selectedEdgeId && (
        <div
          data-cy="properties-empty-state"
          className="rounded-lg border border-dashed border-neutral-700 p-4 text-sm text-neutral-400"
        >
          Select a node or an edge to {canEdit ? 'edit' : 'inspect'} its
          properties.
        </div>
      )}

      {selectedNodeId && canEdit && (
        <div data-cy="selected-node-panel" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Selected Node</h3>
            <p data-cy="selected-node-id" className="text-sm text-neutral-500">
              ID: {selectedNodeId}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Node label
            </label>
            <input
              data-cy="node-label-input"
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
              data-cy="node-type-select"
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
                data-cy="intro-text-input"
                className="min-h-[100px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Welcome text or introduction shown before the flow begins"
              />
            </div>
          )}

          {selectedNodeType === 'question' && (
            <div data-cy="question-properties" className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Question type
                </label>
                <select
                  data-cy="question-type-select"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={questionType}
                  onChange={(e) =>
                    setQuestionType(e.target.value as QuestionType)
                  }
                >
                  <option value="singleChoice">Single choice</option>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                  <option value="multipleChoice">Multiple choice</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Question text
                </label>
                <textarea
                  data-cy="question-text-input"
                  className="min-h-[100px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="What should the user be asked?"
                />
              </div>

              {questionType === 'multipleChoice' && (
                <div
                  data-cy="multiple-choice-options-panel"
                  className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-300">
                      Multiple choice options
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Add at least two options. The flow will continue through
                      one outgoing edge while storing the selected options.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {multipleChoiceOptions.map((option, index) => (
                      <div
                        key={index}
                        data-cy="multiple-choice-option-row"
                        className="flex gap-2"
                      >
                        <input
                          data-cy="multiple-choice-option-input"
                          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                          value={option}
                          onChange={(e) =>
                            updateMultipleChoiceOption(index, e.target.value)
                          }
                          placeholder={`Option ${index + 1}`}
                        />

                        <button
                          data-cy="remove-multiple-choice-option"
                          type="button"
                          onClick={() => removeMultipleChoiceOption(index)}
                          className="rounded border bg-red-950 px-3 py-2 text-sm text-red-100 hover:bg-red-800"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    data-cy="add-multiple-choice-option"
                    type="button"
                    onClick={addMultipleChoiceOption}
                    className="rounded border border-neutral-700 px-4 py-2 text-sm text-white hover:bg-neutral-800"
                  >
                    Add option
                  </button>
                </div>
              )}
            </div>
          )}

          {selectedNodeType === 'info' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">
                Info text
              </label>
              <textarea
                data-cy="info-text-input"
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
                data-cy="result-text-input"
                className="min-h-[120px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Final recommendation or result shown to the user"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              data-cy="update-node-content"
              onClick={handleUpdateNodeContent}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Update Node Content
            </button>

            <button
              data-cy="delete-node"
              onClick={handleDeleteNode}
              className="rounded bg-red-600 px-4 py-2 text-white"
            >
              Delete Node
            </button>
          </div>
        </div>
      )}

      {selectedNodeId && !canEdit && (
        <div data-cy="selected-node-readonly-panel" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Selected Node</h3>
            <p data-cy="selected-node-id" className="text-sm text-neutral-500">
              ID: {selectedNodeId}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
            Node editing is disabled because you are not the owner of this flow.
          </div>
        </div>
      )}

      {selectedEdgeId && canEdit && (
        <div data-cy="selected-edge-panel" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Selected Edge</h3>
            <p data-cy="selected-edge-id" className="text-sm text-neutral-500">
              ID: {selectedEdgeId}
            </p>
          </div>

          {!isNumberEdge && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">
                Edge label
              </label>
              <input
                data-cy="edge-label-input"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
                placeholder="e.g. Yes / No"
              />
            </div>
          )}

          {isNumberEdge && (
            <div
              data-cy="number-edge-generated-label"
              className="rounded-lg border border-blue-900 bg-blue-950/40 p-4"
            >
              <p className="text-sm font-medium text-blue-300">
                Edge label is generated automatically
              </p>
              <p className="mt-2 text-sm text-blue-200">
                Generated label:{' '}
                <span className="font-semibold">
                  {formatGeneratedNumberLabel(
                    numberConditionMode,
                    edgeConditionOperator,
                    edgeConditionValue,
                    edgeConditionMin,
                    edgeConditionMax,
                    edgeConditionMinInclusive,
                    edgeConditionMaxInclusive,
                  )}
                </span>
              </p>
            </div>
          )}

          {isNumberEdge && (
            <div
              data-cy="number-condition-panel"
              className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Number condition type
                </label>
                <select
                  data-cy="number-condition-mode"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                  value={numberConditionMode}
                  onChange={(e) =>
                    setNumberConditionMode(
                      e.target.value as NumberConditionMode,
                    )
                  }
                >
                  <option value="single">Single comparison</option>
                  <option value="range">Range / between</option>
                </select>
              </div>

              {numberConditionMode === 'single' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-300">
                      Number condition operator
                    </label>
                    <select
                      data-cy="number-condition-operator"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                      value={edgeConditionOperator}
                      onChange={(e) =>
                        setEdgeConditionOperator(
                          e.target.value as NumberOperator,
                        )
                      }
                    >
                      <option value="eq">Equal (=)</option>
                      <option value="lt">Less than (&lt;)</option>
                      <option value="lte">Less than or equal (&lt;=)</option>
                      <option value="gt">Greater than (&gt;)</option>
                      <option value="gte">
                        Greater than or equal (&gt;=)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-300">
                      Number condition value
                    </label>
                    <input
                      data-cy="number-condition-value"
                      type="number"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                      value={edgeConditionValue}
                      onChange={(e) => setEdgeConditionValue(e.target.value)}
                      placeholder="e.g. 25000"
                    />
                  </div>
                </>
              )}

              {numberConditionMode === 'range' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-300">
                      Minimum value
                    </label>
                    <input
                      data-cy="number-range-min"
                      type="number"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                      value={edgeConditionMin}
                      onChange={(e) => setEdgeConditionMin(e.target.value)}
                      placeholder="e.g. 18"
                    />

                    <label className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
                      <input
                        data-cy="number-range-min-inclusive"
                        type="checkbox"
                        checked={edgeConditionMinInclusive}
                        onChange={(e) =>
                          setEdgeConditionMinInclusive(e.target.checked)
                        }
                      />
                      Include minimum value
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-300">
                      Maximum value
                    </label>
                    <input
                      data-cy="number-range-max"
                      type="number"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition focus:border-blue-500"
                      value={edgeConditionMax}
                      onChange={(e) => setEdgeConditionMax(e.target.value)}
                      placeholder="e.g. 60"
                    />

                    <label className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
                      <input
                        data-cy="number-range-max-inclusive"
                        type="checkbox"
                        checked={edgeConditionMaxInclusive}
                        onChange={(e) =>
                          setEdgeConditionMaxInclusive(e.target.checked)
                        }
                      />
                      Include maximum value
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              data-cy="update-edge"
              onClick={handleUpdateEdgeLabel}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Update Edge
            </button>

            <button
              data-cy="delete-edge"
              onClick={handleDeleteEdge}
              className="rounded bg-red-600 px-4 py-2 text-white"
            >
              Delete Edge
            </button>
          </div>
        </div>
      )}

      {selectedEdgeId && !canEdit && (
        <div data-cy="selected-edge-readonly-panel" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Selected Edge</h3>
            <p data-cy="selected-edge-id" className="text-sm text-neutral-500">
              ID: {selectedEdgeId}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
            Edge editing is disabled because you are not the owner of this flow.
          </div>
        </div>
      )}
    </aside>
  );
}