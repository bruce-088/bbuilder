import { useRef, useState, useCallback } from "react";
import { NODE_TYPE_CONFIG, type WorkflowNode } from "./types";
import { Trash2 } from "lucide-react";

interface NodeRendererProps {
  node: WorkflowNode;
  isSelected: boolean;
  executionStatus?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onConnectStart: (id: string) => void;
  onConnectEnd: (id: string) => void;
  zoom: number;
}

export function NodeRenderer({
  node, isSelected, executionStatus, onSelect, onMove, onDelete, onConnectStart, onConnectEnd, zoom,
}: NodeRendererProps) {
  const cfg = NODE_TYPE_CONFIG[node.type];
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".node-handle") || (e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    onSelect(node.id);
    setDragging(true);
    dragOffset.current = {
      x: e.clientX / zoom - node.position_x,
      y: e.clientY / zoom - node.position_y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const newX = Math.round(ev.clientX / zoom - dragOffset.current.x);
      const newY = Math.round(ev.clientY / zoom - dragOffset.current.y);
      onMove(node.id, newX, newY);
    };

    const handleMouseUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [node.id, node.position_x, node.position_y, zoom, onSelect, onMove]);

  const statusColor = executionStatus === "completed" ? "border-green-500" :
    executionStatus === "running" ? "border-blue-500 animate-pulse" :
    executionStatus === "failed" ? "border-destructive" :
    executionStatus === "pending" ? "border-yellow-500/50" : "";

  return (
    <div
      data-node-id={node.id}
      className={`absolute select-none group ${dragging ? "z-50" : "z-10"}`}
      style={{
        left: node.position_x,
        top: node.position_y,
        transform: `scale(${1})`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Input handle */}
      {!node.type.includes("trigger") && (
        <div
          className="node-handle absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-muted-foreground/40 bg-background hover:border-primary hover:bg-primary/20 transition-colors cursor-crosshair z-20"
          onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(node.id); }}
        />
      )}

      {/* Node body */}
      <div
        className={`w-48 rounded-xl border-2 bg-card shadow-lg transition-all cursor-grab active:cursor-grabbing
          ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/40"}
          ${statusColor}
        `}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
          <span className="text-lg">{cfg.icon}</span>
          <span className="text-xs font-semibold text-foreground truncate flex-1">{node.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
          {executionStatus && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                executionStatus === "completed" ? "bg-green-500" :
                executionStatus === "running" ? "bg-blue-500 animate-pulse" :
                executionStatus === "failed" ? "bg-destructive" : "bg-yellow-500/50"
              }`} />
              <span className="text-[10px] text-muted-foreground capitalize">{executionStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Output handle */}
      <div
        className="node-handle absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-muted-foreground/40 bg-background hover:border-primary hover:bg-primary/20 transition-colors cursor-crosshair z-20"
        onMouseDown={(e) => { e.stopPropagation(); onConnectStart(node.id); }}
      />
    </div>
  );
}
