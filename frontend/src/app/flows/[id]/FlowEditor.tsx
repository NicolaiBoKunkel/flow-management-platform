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

type FlowGraph = {
  nodes: {
    id: string;
    type?: string;
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
        data: { label: 'Start' },
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 100 },
        data: { label: 'Question' },
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
      type: node.type ?? 'default',
      position: node.position,
      data: {
        label: node.label,
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

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  function handleAddNode() {
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'default',
      position: {
        x: 150 + nodes.length * 50,
        y: 150 + nodes.length * 50,
      },
      data: {
        label: `New Node ${nodes.length + 1}`,
      },
    };

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

    try {
      const graph = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type ?? 'default',
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
        throw new Error('Failed to save flow');
      }

      setMessage('Flow graph gemt');
    } catch (error) {
      console.error('Error saving flow graph:', error);
      setMessage('Kunne ikke gemme flow graph');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleAddNode}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Node
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