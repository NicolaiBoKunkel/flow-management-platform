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
import type {
  DomainNodeType,
  FlowEditorProps,
  QuestionType,
} from './flow-editor.types';
import {
  createNode,
  getNodeStyle,
  mapDomainTypeToReactFlowType,
} from './flow-editor.utils';

export default function FlowEditor({
  flowId,
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

  const fallbackEdges: Edge[] = useMemo(() => [], []);

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

  const initialEdges: Edge[] = useMemo(() => {
    if (!initialGraph?.edges || initialGraph.edges.length === 0) {
      return fallbackEdges;
    }

    return initialGraph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
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
  const [message, setMessage] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const startNodeCount = useMemo(() => {
    return nodes.filter(
      (node) => (node.data?.nodeType as DomainNodeType) === 'start',
    ).length;
  }, [nodes]);

  const hasStartNode = startNodeCount > 0;

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
    [setEdges],
  );

  function handleAddNode(nodeType: DomainNodeType) {
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
  }

  function handleEdgeClick(_: React.MouseEvent, edge: Edge) {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setNodeLabel('');
    setIntroText('');
    setQuestionText('');
    setResultText('');
    setInfoText('');
    setSelectedNodeType('question');
    setQuestionType('singleChoice');
    setEdgeLabel(typeof edge.label === 'string' ? edge.label : '');
  }

  function handleUpdateNodeContent() {
    if (!selectedNodeId) return;

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
    if (!selectedNodeId) return;

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
      setQuestionType('singleChoice');
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
    if (!selectedEdgeId) return;

    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              label: edgeLabel,
            }
          : edge,
      ),
    );

    setLocalEditorFeedback(
      'Edge label updated in editor. Remember to save the flow.',
    );
  }

  function handleDeleteNode() {
    if (!selectedNodeId) return;

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
    if (!selectedEdgeId) return;

    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setEdgeLabel('');

    setLocalEditorFeedback('Edge deleted in editor. Remember to save the flow.');
  }

  async function handleSaveFlow() {
    setIsSaving(true);
    setMessage('');
    setValidationErrors([]);

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
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label ? String(edge.label) : undefined,
        })),
      };

      const response = await fetch(`http://localhost:3001/flows/${flowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph }),
      });

      if (!response.ok) {
        const errorData = await response.json();

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
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              fitView
            >
              <Background color="#525252" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        </div>

        <FlowPropertiesPanel
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