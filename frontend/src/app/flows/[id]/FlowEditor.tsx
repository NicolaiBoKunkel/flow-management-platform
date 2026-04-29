'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import FlowPropertiesPanel from './FlowPropertiesPanel';
import { apiFetch } from '../../lib/api';
import { getToken } from '../../lib/auth';
import type {
  DomainNodeType,
  EdgeCondition,
  NumberConditionMode,
  NumberOperator,
  QuestionType,
} from './flow-editor.types';
import {
  createNode,
  getNodeStyle,
  mapDomainTypeToReactFlowType,
} from './flow-editor.utils';

type FlowEditorProps = {
  flowId: string;
  ownerId: string | null;
  accessList: {
    id: string;
    role: 'viewer' | 'editor';
    user: {
      id: string;
      email: string;
    };
  }[];
  initialGraph: {
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
      condition?: EdgeCondition;
    }[];
  } | null;
};

type FlowEditorEdge = Edge & {
  condition?: EdgeCondition;
};

type MeResponse = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

function formatNumberConditionLabel(condition: EdgeCondition): string {
  if (condition.kind === 'numberRange') {
    const leftBracket = condition.minInclusive ? '[' : '(';
    const rightBracket = condition.maxInclusive ? ']' : ')';

    return `${leftBracket}${condition.min} - ${condition.max}${rightBracket}`;
  }

  const operatorMap: Record<NumberOperator, string> = {
    lt: '<',
    lte: '<=',
    gt: '>',
    gte: '>=',
    eq: '=',
  };

  return `${operatorMap[condition.operator]} ${condition.value}`;
}

export default function FlowEditor({
  flowId,
  ownerId,
  accessList,
  initialGraph,
}: FlowEditorProps) {
  const fallbackNodes: Node[] = useMemo(
    () => [
      {
        id: '1',
        type: 'input',
        position: { x: 100, y: 100 },
        data: {
          label: 'Start',
          nodeType: 'start',
          introText: '',
          questionText: '',
          resultText: '',
          infoText: '',
        },
        style: getNodeStyle('start', false),
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 100 },
        data: {
          label: 'Question',
          nodeType: 'question',
          questionType: 'singleChoice',
          introText: '',
          questionText: '',
          resultText: '',
          infoText: '',
        },
        style: getNodeStyle('question', false),
      },
    ],
    [],
  );

  const fallbackEdges: FlowEditorEdge[] = useMemo(() => [], []);

  const initialNodes: Node[] = useMemo(() => {
    if (!initialGraph?.nodes || initialGraph.nodes.length === 0) {
      return fallbackNodes;
    }

    return initialGraph.nodes.map((node) => ({
      id: node.id,
      type: mapDomainTypeToReactFlowType(node.type),
      position: node.position,
      data: {
        label: node.label,
        nodeType: node.type,
        questionType:
          node.type === 'question'
            ? (node.questionType ?? 'singleChoice')
            : undefined,
        introText: node.introText ?? '',
        questionText: node.questionText ?? '',
        resultText: node.resultText ?? '',
        infoText: node.infoText ?? '',
      },
      style: getNodeStyle(node.type, false),
    }));
  }, [initialGraph, fallbackNodes]);

  const initialEdges: FlowEditorEdge[] = useMemo(() => {
    if (!initialGraph?.edges || initialGraph.edges.length === 0) {
      return fallbackEdges;
    }

    return initialGraph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.condition ? formatNumberConditionLabel(edge.condition) : edge.label,
      condition: edge.condition,
    }));
  }, [initialGraph, fallbackEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [nodeLabel, setNodeLabel] = useState('');
  const [introText, setIntroText] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [resultText, setResultText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [selectedNodeType, setSelectedNodeType] =
    useState<DomainNodeType>('question');
  const [questionType, setQuestionType] =
    useState<QuestionType>('singleChoice');
  const [selectedEdgeSourceQuestionType, setSelectedEdgeSourceQuestionType] =
    useState<QuestionType | null>(null);
  const [numberConditionMode, setNumberConditionMode] =
    useState<NumberConditionMode>('single');
  const [edgeConditionOperator, setEdgeConditionOperator] =
    useState<NumberOperator>('eq');
  const [edgeConditionValue, setEdgeConditionValue] = useState('');
  const [edgeConditionMin, setEdgeConditionMin] = useState('');
  const [edgeConditionMax, setEdgeConditionMax] = useState('');
  const [edgeConditionMinInclusive, setEdgeConditionMinInclusive] =
    useState(true);
  const [edgeConditionMaxInclusive, setEdgeConditionMaxInclusive] =
    useState(true);
  const [message, setMessage] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);

  useEffect(() => {
    async function fetchMe() {
      if (!getToken()) {
        setCurrentUser(null);
        return;
      }

      try {
        const res = await apiFetch('/auth/me');

        if (!res.ok) {
          setCurrentUser(null);
          return;
        }

        const data = (await res.json()) as MeResponse;
        setCurrentUser(data);
      } catch {
        setCurrentUser(null);
      }
    }

    void fetchMe();
  }, []);

  const isOwner = !!currentUser && ownerId === currentUser.id;
  const isEditor =
    !!currentUser &&
    accessList.some(
      (entry) => entry.user.id === currentUser.id && entry.role === 'editor',
    );
  const canEdit = isOwner || isEditor;

  const startNodeCount = useMemo(() => {
    return nodes.filter(
      (node) => (node.data?.nodeType as DomainNodeType) === 'start',
    ).length;
  }, [nodes]);

  const hasStartNode = startNodeCount > 0;

  function resetNumberConditionState() {
    setNumberConditionMode('single');
    setEdgeConditionOperator('eq');
    setEdgeConditionValue('');
    setEdgeConditionMin('');
    setEdgeConditionMax('');
    setEdgeConditionMinInclusive(true);
    setEdgeConditionMaxInclusive(true);
  }

  function setLocalEditorFeedback(text: string) {
    setEditorMessage(text);
    setMessage('');
  }

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const nodeType = (node.data?.nodeType as DomainNodeType) ?? 'question';

        return {
          ...node,
          style: getNodeStyle(nodeType, node.id === selectedNodeId),
        };
      }),
    );
  }, [selectedNodeId, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) {
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label: '',
          },
          eds,
        ),
      );
      setEditorMessage('Edge added in editor. Remember to save the flow.');
      setMessage('');
    },
    [canEdit, setEdges],
  );

  function handleAddNode(nodeType: DomainNodeType) {
    if (!canEdit) {
      return;
    }

    if (nodeType === 'start' && hasStartNode) {
      return;
    }

    const newNode = createNode(nodeType, nodes.length);
    setNodes((nds) => [...nds, newNode]);
    setLocalEditorFeedback('Node added in editor. Remember to save the flow.');
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setEdgeLabel('');
    setNodeLabel(String(node.data?.label ?? ''));
    setIntroText(String(node.data?.introText ?? ''));
    setQuestionText(String(node.data?.questionText ?? ''));
    setResultText(String(node.data?.resultText ?? ''));
    setInfoText(String(node.data?.infoText ?? ''));
    setSelectedNodeType((node.data?.nodeType as DomainNodeType) ?? 'question');
    setQuestionType(
      (node.data?.questionType as QuestionType | undefined) ?? 'singleChoice',
    );
    setSelectedEdgeSourceQuestionType(null);
    resetNumberConditionState();
  }

  function handleEdgeClick(_: React.MouseEvent, edge: Edge) {
    const typedEdge = edge as FlowEditorEdge;
    const sourceNode = nodes.find((node) => node.id === edge.source);
    const sourceQuestionType =
      (sourceNode?.data?.questionType as QuestionType | undefined) ?? null;

    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setNodeLabel('');
    setIntroText('');
    setQuestionText('');
    setResultText('');
    setInfoText('');
    setSelectedNodeType('question');
    setQuestionType('singleChoice');
    setSelectedEdgeSourceQuestionType(sourceQuestionType);

    if (typedEdge.condition?.kind === 'number') {
      setNumberConditionMode('single');
      setEdgeConditionOperator(typedEdge.condition.operator);
      setEdgeConditionValue(String(typedEdge.condition.value));
      setEdgeConditionMin('');
      setEdgeConditionMax('');
      setEdgeConditionMinInclusive(true);
      setEdgeConditionMaxInclusive(true);
      setEdgeLabel(formatNumberConditionLabel(typedEdge.condition));
    } else if (typedEdge.condition?.kind === 'numberRange') {
      setNumberConditionMode('range');
      setEdgeConditionOperator('eq');
      setEdgeConditionValue('');
      setEdgeConditionMin(String(typedEdge.condition.min));
      setEdgeConditionMax(String(typedEdge.condition.max));
      setEdgeConditionMinInclusive(typedEdge.condition.minInclusive);
      setEdgeConditionMaxInclusive(typedEdge.condition.maxInclusive);
      setEdgeLabel(formatNumberConditionLabel(typedEdge.condition));
    } else {
      resetNumberConditionState();
      setEdgeLabel(typeof edge.label === 'string' ? edge.label : '');
    }
  }

  function handleUpdateNodeContent() {
    if (!canEdit || !selectedNodeId) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                questionType:
                  (node.data?.nodeType as DomainNodeType) === 'question'
                    ? questionType
                    : undefined,
                introText,
                questionText,
                resultText,
                infoText,
              },
            }
          : node,
      ),
    );

    setLocalEditorFeedback(
      'Node content updated in editor. Remember to save the flow.',
    );
  }

  function handleUpdateNodeType(newType: DomainNodeType) {
    if (!canEdit || !selectedNodeId) return;

    const currentSelectedNode = nodes.find((node) => node.id === selectedNodeId);
    const currentType =
      (currentSelectedNode?.data?.nodeType as DomainNodeType) ?? 'question';

    if (newType === 'start' && currentType !== 'start' && hasStartNode) {
      setValidationErrors(['Flow can only contain one start node.']);
      return;
    }

    setValidationErrors([]);
    setSelectedNodeType(newType);

    if (newType === 'question') {
      setQuestionType(
        (currentSelectedNode?.data?.questionType as QuestionType | undefined) ??
          'singleChoice',
      );
    }

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              type: mapDomainTypeToReactFlowType(newType),
              data: {
                ...node.data,
                nodeType: newType,
                questionType:
                  newType === 'question'
                    ? ((node.data?.questionType as QuestionType | undefined) ??
                      'singleChoice')
                    : undefined,
              },
              style: getNodeStyle(newType, true),
            }
          : node,
      ),
    );

    setLocalEditorFeedback(
      'Node type updated in editor. Remember to save the flow.',
    );
  }

  function handleUpdateEdgeLabel() {
    if (!canEdit || !selectedEdgeId) return;

    let updatedCondition: EdgeCondition | undefined;
    let updatedLabel = edgeLabel;

    if (selectedEdgeSourceQuestionType === 'number') {
      if (numberConditionMode === 'single') {
        if (edgeConditionValue.trim() === '') {
          setValidationErrors(['Number condition value is required.']);
          return;
        }

        updatedCondition = {
          kind: 'number',
          operator: edgeConditionOperator,
          value: Number(edgeConditionValue),
        };
      } else {
        if (
          edgeConditionMin.trim() === '' ||
          edgeConditionMax.trim() === ''
        ) {
          setValidationErrors(['Number range min and max are required.']);
          return;
        }

        updatedCondition = {
          kind: 'numberRange',
          min: Number(edgeConditionMin),
          max: Number(edgeConditionMax),
          minInclusive: edgeConditionMinInclusive,
          maxInclusive: edgeConditionMaxInclusive,
        };
      }

      updatedLabel = formatNumberConditionLabel(updatedCondition);
    }

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id !== selectedEdgeId) {
          return edge;
        }

        return {
          ...edge,
          label: updatedLabel,
          condition: updatedCondition,
        } as FlowEditorEdge;
      }),
    );

    setEdgeLabel(updatedLabel);
    setValidationErrors([]);
    setLocalEditorFeedback(
      'Edge updated in editor. Remember to save the flow.',
    );
  }

  function handleDeleteNode() {
    if (!canEdit || !selectedNodeId) return;

    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));

    setEdges((eds) =>
      eds.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );

    setSelectedNodeId(null);
    setNodeLabel('');
    setIntroText('');
    setQuestionText('');
    setResultText('');
    setInfoText('');
    setSelectedNodeType('question');
    setQuestionType('singleChoice');

    setLocalEditorFeedback('Node deleted in editor. Remember to save the flow.');
  }

  function handleDeleteEdge() {
    if (!canEdit || !selectedEdgeId) return;

    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setEdgeLabel('');
    setSelectedEdgeSourceQuestionType(null);
    resetNumberConditionState();

    setLocalEditorFeedback('Edge deleted in editor. Remember to save the flow.');
  }

  async function handleSaveFlow() {
    setIsSaving(true);
    setMessage('');
    setValidationErrors([]);

    if (!getToken()) {
      setValidationErrors(['Du skal være logget ind for at gemme flowet.']);
      setIsSaving(false);
      return;
    }

    if (!canEdit) {
      setValidationErrors(['You do not have permission to edit this flow.']);
      setIsSaving(false);
      return;
    }

    try {
      const graph = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: (node.data?.nodeType as DomainNodeType) ?? 'question',
          label: String(node.data?.label ?? ''),
          position: {
            x: node.position.x,
            y: node.position.y,
          },
          questionType:
            (node.data?.nodeType as DomainNodeType) === 'question'
              ? ((node.data?.questionType as QuestionType | undefined) ??
                'singleChoice')
              : undefined,
          introText:
            typeof node.data?.introText === 'string' &&
            node.data.introText.trim() !== ''
              ? node.data.introText
              : undefined,
          questionText:
            typeof node.data?.questionText === 'string' &&
            node.data.questionText.trim() !== ''
              ? node.data.questionText
              : undefined,
          resultText:
            typeof node.data?.resultText === 'string' &&
            node.data.resultText.trim() !== ''
              ? node.data.resultText
              : undefined,
          infoText:
            typeof node.data?.infoText === 'string' &&
            node.data.infoText.trim() !== ''
              ? node.data.infoText
              : undefined,
        })),
        edges: edges.map((edge) => {
          const typedEdge = edge as FlowEditorEdge;
          const label = typedEdge.condition
            ? formatNumberConditionLabel(typedEdge.condition)
            : edge.label;

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: label ? String(label) : undefined,
            condition: typedEdge.condition,
          };
        }),
      };

      const response = await apiFetch(`/flows/${flowId}`, {
        method: 'PATCH',
        body: JSON.stringify({ graph }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          errors?: string[];
          message?: string;
        };

        if (Array.isArray(errorData.errors)) {
          setValidationErrors(errorData.errors);
        } else if (typeof errorData.message === 'string') {
          setValidationErrors([errorData.message]);
        } else {
          setValidationErrors(['Kunne ikke gemme flow graph.']);
        }

        setMessage('');
        return;
      }

      setMessage('Flow graph gemt');
      setEditorMessage('');
      setValidationErrors([]);
    } catch (error) {
      console.error('Error saving flow graph:', error);
      setValidationErrors(['Der opstod en uventet fejl ved gemning.']);
      setMessage('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="rounded-lg border border-amber-800 bg-amber-950 px-4 py-3 text-amber-300">
          {!currentUser
            ? 'You can view this flow graph, but you must be logged in with editor or owner access to modify it.'
            : 'You can view this flow graph, but only the owner or a shared editor can modify it.'}
        </div>
      )}

      {canEdit && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAddNode('start')}
              disabled={hasStartNode}
              className="rounded bg-emerald-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Start Node
            </button>

            <button
              onClick={() => handleAddNode('question')}
              className="rounded bg-green-600 px-4 py-2 text-white"
            >
              Add Question Node
            </button>

            <button
              onClick={() => handleAddNode('info')}
              className="rounded bg-amber-600 px-4 py-2 text-white"
            >
              Add Info Node
            </button>

            <button
              onClick={() => handleAddNode('end')}
              className="rounded bg-purple-600 px-4 py-2 text-white"
            >
              Add End Node
            </button>

            <button
              onClick={handleSaveFlow}
              disabled={isSaving}
              className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Flow'}
            </button>
          </div>

          <p className="mt-3 text-sm text-neutral-400">
            A flow can only contain one start node.
          </p>
        </div>
      )}

      {editorMessage && (
        <div className="rounded-lg border border-amber-800 bg-amber-950 p-3 text-amber-300">
          {editorMessage}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-800 bg-green-950 p-3 text-green-300">
          {message}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          <h3 className="mb-2 font-semibold">Flow validation errors</h3>
          <ul className="list-disc pl-5">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-2 shadow-sm">
          <div className="h-[650px] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={canEdit ? onNodesChange : undefined}
              onEdgesChange={canEdit ? onEdgesChange : undefined}
              onConnect={canEdit ? onConnect : undefined}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              nodesDraggable={canEdit}
              nodesConnectable={canEdit}
              elementsSelectable
              fitView
            >
              <Background color="#525252" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        </div>

        <FlowPropertiesPanel
          canEdit={canEdit}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          nodeLabel={nodeLabel}
          setNodeLabel={setNodeLabel}
          introText={introText}
          setIntroText={setIntroText}
          questionText={questionText}
          setQuestionText={setQuestionText}
          resultText={resultText}
          setResultText={setResultText}
          infoText={infoText}
          setInfoText={setInfoText}
          edgeLabel={edgeLabel}
          setEdgeLabel={setEdgeLabel}
          selectedNodeType={selectedNodeType}
          questionType={questionType}
          setQuestionType={setQuestionType}
          selectedEdgeSourceQuestionType={selectedEdgeSourceQuestionType}
          numberConditionMode={numberConditionMode}
          setNumberConditionMode={setNumberConditionMode}
          edgeConditionOperator={edgeConditionOperator}
          setEdgeConditionOperator={setEdgeConditionOperator}
          edgeConditionValue={edgeConditionValue}
          setEdgeConditionValue={setEdgeConditionValue}
          edgeConditionMin={edgeConditionMin}
          setEdgeConditionMin={setEdgeConditionMin}
          edgeConditionMax={edgeConditionMax}
          setEdgeConditionMax={setEdgeConditionMax}
          edgeConditionMinInclusive={edgeConditionMinInclusive}
          setEdgeConditionMinInclusive={setEdgeConditionMinInclusive}
          edgeConditionMaxInclusive={edgeConditionMaxInclusive}
          setEdgeConditionMaxInclusive={setEdgeConditionMaxInclusive}
          handleUpdateNodeType={handleUpdateNodeType}
          handleUpdateNodeContent={handleUpdateNodeContent}
          handleDeleteNode={handleDeleteNode}
          handleUpdateEdgeLabel={handleUpdateEdgeLabel}
          handleDeleteEdge={handleDeleteEdge}
        />
      </div>
    </div>
  );
}