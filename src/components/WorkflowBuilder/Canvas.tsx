import { useRef, useCallback, useState } from "react";
import { NodeRenderer } from "./NodeRenderer";
import { EdgeRenderer } from "./EdgeRenderer";
import type { WorkflowNode, WorkflowEdge, NodeType } from "./types";

interface CanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  pan: { x: number; y: number };
  zoom: number;
  executionStatuses?: Record<string, string>;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onAddNode: (type: NodeType, x: number, y: number) => void;
  onConnectStart: (id: string) => void;
  onConnectEnd: (id: string) => void;
}

export function Canvas({
  nodes, edges, selectedNodeId, pan, zoom, executionStatuses,
  onPanChange, onZoomChange, onSelectNode, onMoveNode, onDeleteNode, onDeleteEdge,
  onAddNode, onConnectStart, onConnectEnd,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan if clicking on the canvas background
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      onSelectNode(null);
      setIsPanning(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, [onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    onPanChange({ x: pan.x + dx, y: pan.y + dy });
  }, [isPanning, pan, onPanChange]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.3, Math.min(2, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("node-type") as NodeType;
    if (!type || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    onAddNode(type, x, y);
  }, [pan, zoom, onAddNode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-background cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Grid pattern */}
      <div
        className="canvas-bg absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(215 20% 25% / 0.3) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 z-20 text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded-md border border-border">
        {Math.round(zoom * 100)}%
      </div>

      {/* Transform layer */}
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <EdgeRenderer edges={edges} nodes={nodes} onDelete={onDeleteEdge} />
        {nodes.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            executionStatus={executionStatuses?.[node.id]}
            zoom={zoom}
            onSelect={onSelectNode}
            onMove={onMoveNode}
            onDelete={onDeleteNode}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
          />
        ))}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Drag nodes from the palette to get started</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Connect them by dragging from output to input handles</p>
          </div>
        )}
      </div>
    </div>
  );
}
