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

type DomainNodeType = 'start' | 'question' | 'end';

type FlowGraph = {
  nodes: {
    id: string;
    type: DomainNodeType;
    label: string;
    position: {
      x: number;
      y: number;
    };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
};

type FlowEditorProps = {
  flowId: string;
  initialGraph?: FlowGraph | null;
};

function mapDomainTypeToReactFlowType(type: DomainNodeType): string {
  switch (type) {
    case 'start':
      return 'input';
    case 'end':
      return 'output';
    case 'question':
    default:
      return 'default';
  }
}

function getNodeStyle(
  nodeType: DomainNodeType,
  isSelected: boolean,
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    borderRadius: '12px',
    padding: '10px 14px',
    border: '2px solid',
    fontWeight: 600,
    minWidth: 120,
    textAlign: 'center',
    boxShadow: isSelected
      ? '0 0 0 4px rgba(59, 130, 246, 0.25)'
      : '0 1px 3px rgba(0, 0, 0, 0.12)',
    transition: 'all 0.15s ease',
  };

  switch (nodeType) {
    case 'start':
      return {
        ...baseStyle,
        backgroundColor: '#dcfce7',
        borderColor: isSelected ? '#2563eb' : '#16a34a',
        color: '#166534',
      };
    case 'end':
      return {
        ...baseStyle,
        backgroundColor: '#f3e8ff',
        borderColor: isSelected ? '#2563eb' : '#9333ea',
        color: '#6b21a8',
      };
    case 'question':
    default:
      return {
        ...baseStyle,
        backgroundColor: '#dbeafe',
        borderColor: isSelected ? '#2563eb' : '#2563eb',
        color: '#1e3a8a',
      };
  }
}

function createNode(
  nodeType: DomainNodeType,
  index: number,
  label?: string,
): Node {
  return {
    id: crypto.randomUUID(),
    type: mapDomainTypeToReactFlowType(nodeType),
    position: {
      x: 150 + index * 50,
      y: 150 + index * 50,
    },
    data: {
      label:
        label ??
        (nodeType === 'start'
          ? 'Start'
          : nodeType === 'end'
            ? 'End'
            : `Question ${index + 1}`),
      nodeType,
    },
    style: getNodeStyle(nodeType, false),
  };
}

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
        data: { label: 'Start', nodeType: 'start' },
        style: getNodeStyle('start', false),
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 100 },
        data: { label: 'Question', nodeType: 'question' },
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
  const [edgeLabel, setEdgeLabel] = useState('');
  const [selectedNodeType, setSelectedNodeType] =
    useState<DomainNodeType>('question');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const startNodeCount = useMemo(() => {
    return nodes.filter(
      (node) => (node.data?.nodeType as DomainNodeType) === 'start',
    ).length;
  }, [nodes]);

  const hasStartNode = startNodeCount > 0;

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
    },
    [setEdges],
  );

  function handleAddNode(nodeType: DomainNodeType) {
    if (nodeType === 'start' && hasStartNode) {
      return;
    }

    const newNode = createNode(nodeType, nodes.length);
    setNodes((nds) => [...nds, newNode]);
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setEdgeLabel('');
    setNodeLabel(String(node.data?.label ?? ''));
    setSelectedNodeType(
      (node.data?.nodeType as DomainNodeType) ?? 'question',
    );
  }

  function handleEdgeClick(_: React.MouseEvent, edge: Edge) {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setNodeLabel('');
    setSelectedNodeType('question');
    setEdgeLabel(typeof edge.label === 'string' ? edge.label : '');
  }

  function handleUpdateLabel() {
    if (!selectedNodeId) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
              },
            }
          : node,
      ),
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

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              type: mapDomainTypeToReactFlowType(newType),
              data: {
                ...node.data,
                nodeType: newType,
              },
              style: getNodeStyle(newType, true),
            }
          : node,
      ),
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
    setSelectedNodeType('question');
  }

  function handleDeleteEdge() {
    if (!selectedEdgeId) return;

    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setEdgeLabel('');
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
                  <option value="end">End</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUpdateLabel}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  Update Node Label
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

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUpdateEdgeLabel}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  Update Edge Label
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
      </div>
    </div>
  );
}