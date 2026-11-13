import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type DiagramValue = { nodes: Node[]; edges: Edge[] };
export function Diagram({
  value,
  onChange,
  readOnly = false,
}: {
  value: DiagramValue;
  onChange: (value: DiagramValue) => void;
  readOnly?: boolean;
}) {
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      onChange({ ...value, nodes: applyNodeChanges(changes, value.nodes) }),
    [value, onChange],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      onChange({ ...value, edges: applyEdgeChanges(changes, value.edges) }),
    [value, onChange],
  );
  const connect = useCallback(
    (connection: Connection) =>
      onChange({
        ...value,
        edges: addEdge({ ...connection, label: "request" }, value.edges),
      }),
    [value, onChange],
  );
  function add(type: string) {
    const count = value.nodes.length;
    onChange({
      ...value,
      nodes: [
        ...value.nodes,
        {
          id: crypto.randomUUID(),
          position: {
            x: 80 + (count % 3) * 200,
            y: 80 + Math.floor(count / 3) * 120,
          },
          data: { label: type },
          type: "default",
        },
      ],
    });
  }
  return (
    <div className="st-diagram">
      <div className="st-diagram-toolbar" aria-label="Diagram components">
        {[
          "Service",
          "Database",
          "Load balancer",
          "Cache",
          "Queue",
          "Client",
          "Class / interface",
        ].map((type) => (
          <button
            key={type}
            disabled={readOnly || value.nodes.length >= 100}
            onClick={() => add(type)}
          >
            + {type}
          </button>
        ))}
      </div>
      <div style={{ height: 420 }}>
        <ReactFlow
          nodes={value.nodes}
          edges={value.edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : connect}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          edgesReconnectable={!readOnly}
          onNodeDoubleClick={
            readOnly
              ? undefined
              : (_, node) => {
                  const label = window.prompt(
                    "Component name",
                    String(node.data.label),
                  );
                  if (label)
                    onChange({
                      ...value,
                      nodes: value.nodes.map((n) =>
                        n.id === node.id
                          ? {
                              ...n,
                              data: { ...n.data, label: label.slice(0, 100) },
                            }
                          : n,
                      ),
                    });
                }
          }
          onEdgeDoubleClick={
            readOnly
              ? undefined
              : (_, edge) => {
                  const label = window.prompt(
                    "Connection label",
                    String(edge.label || ""),
                  );
                  if (label !== null)
                    onChange({
                      ...value,
                      edges: value.edges.map((e) =>
                        e.id === edge.id
                          ? { ...e, label: label.slice(0, 100) }
                          : e,
                      ),
                    });
                }
          }
          fitView
        >
          <Background gap={20} color="#E4E9F2" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <p className="st-fine">
        Drag components to arrange. Connect the handles to draw flows.
        Double-click a component or connection to rename it. Select and press
        Backspace to remove.
      </p>
    </div>
  );
}
