'use client';

import { useCallback, useMemo, useState } from 'react';
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
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 100 },
        data: { label: 'Question', nodeType: 'question' },
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
  const [nodeLabel, setNodeLabel] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  function handleAddNode(nodeType: DomainNodeType) {
    const newNode = createNode(nodeType, nodes.length);

    setNodes((nds) => [...nds, newNode]);
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNodeId(node.id);
    setNodeLabel(String(node.data.label ?? ''));
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
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => handleAddNode('start')}
          className="bg-emerald-700 text-white px-4 py-2 rounded"
        >
          Add Start Node
        </button>

        <button
          onClick={() => handleAddNode('question')}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Question Node
        </button>

        <button
          onClick={() => handleAddNode('end')}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Add End Node
        </button>

        <button
          onClick={handleSaveFlow}
          disabled={isSaving}
          className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Flow'}
        </button>
      </div>

      {message && <p className="mb-4">{message}</p>}

      {validationErrors.length > 0 && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-4">
          <h3 className="mb-2 font-semibold text-red-700">Flow validation errors</h3>
          <ul className="list-disc pl-5 text-red-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ width: '100%', height: '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {selectedNodeId && (
        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-semibold">Edit Selected Node</h3>

          <input
            className="border p-2 w-full"
            value={nodeLabel}
            onChange={(e) => setNodeLabel(e.target.value)}
            placeholder="Node label"
          />

          <button
            onClick={handleUpdateLabel}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Update Label
          </button>

          <button
            onClick={handleDeleteNode}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
}