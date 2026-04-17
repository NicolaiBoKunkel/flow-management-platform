'use client';

import { useCallback, useState } from 'react';
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

const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 100, y: 100 },
    data: { label: 'Start' },
  },
  {
    id: '2',
    position: { x: 300, y: 100 },
    data: { label: 'Question' },
  },
];

const initialEdges: Edge[] = [];

export default function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeLabel, setNodeLabel] = useState('');

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  function handleAddNode() {
    const newNode: Node = {
      id: crypto.randomUUID(),
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

  return (
    <div>
      <button
        onClick={handleAddNode}
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
      >
        Add Node
      </button>

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