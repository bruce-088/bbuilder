import type { WorkflowEdge, WorkflowNode } from "./types";

interface EdgeRendererProps {
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
  onDelete?: (edgeId: string) => void;
  connectingFromId?: string | null;
  connectingMousePos?: { x: number; y: number } | null;
}

const NODE_WIDTH = 192; // w-48 = 12rem = 192px
const NODE_HEIGHT = 72;

function getNodeCenter(node: WorkflowNode, side: "left" | "right") {
  return {
    x: side === "right" ? node.position_x + NODE_WIDTH + 8 : node.position_x - 8,
    y: node.position_y + NODE_HEIGHT / 2,
  };
}

export function EdgeRenderer({ edges, nodes, onDelete, connectingFromId, connectingMousePos }: EdgeRendererProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Render the temporary "connecting" line
  let connectingPath: string | null = null;
  if (connectingFromId && connectingMousePos) {
    const sourceNode = nodeMap.get(connectingFromId);
    if (sourceNode) {
      const start = getNodeCenter(sourceNode, "right");
      const end = connectingMousePos;
      const dx = Math.abs(end.x - start.x) * 0.5;
      connectingPath = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="hsl(215, 20%, 35%)" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const source = nodeMap.get(edge.source_node_id);
        const target = nodeMap.get(edge.target_node_id);
        if (!source || !target) return null;

        const start = getNodeCenter(source, "right");
        const end = getNodeCenter(target, "left");
        const dx = Math.abs(end.x - start.x) * 0.5;

        const path = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;

        return (
          <g key={edge.id}>
            <path d={path} fill="none" stroke="transparent" strokeWidth={16} className="pointer-events-auto cursor-pointer" onClick={() => onDelete?.(edge.id)} />
            <path d={path} fill="none" stroke="hsl(215, 20%, 35%)" strokeWidth={2} markerEnd="url(#arrowhead)" className="transition-colors" />
          </g>
        );
      })}
      {connectingPath && (
        <path d={connectingPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 4" className="pointer-events-none" />
      )}
    </svg>
  );
}
