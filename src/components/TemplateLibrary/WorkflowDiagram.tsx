import { useMemo, useState, useRef, useCallback } from 'react';
import { WorkflowNode, WorkflowConnection } from '@/lib/workflowTemplates/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface WorkflowDiagramProps {
  nodes: WorkflowNode[];
  connections: Record<string, { main: WorkflowConnection[][] }>;
  className?: string;
}

// Node type to icon/color mapping
const NODE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  'webhook': { bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: '🔗' },
  'scheduleTrigger': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '⏰' },
  'shopifyTrigger': { bg: 'bg-green-500/20', border: 'border-green-500/50', icon: '🛒' },
  'wait': { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: '⏳' },
  'if': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: '❓' },
  'switch': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: '🔀' },
  'filter': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: '🔍' },
  'sendGrid': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '✉️' },
  'slack': { bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: '💬' },
  'airtable': { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', icon: '📊' },
  'notion': { bg: 'bg-slate-500/20', border: 'border-slate-500/50', icon: '📝' },
  'googleCalendar': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '📅' },
  'googleAnalytics': { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: '📈' },
  'postgres': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '🗄️' },
  'hubspot': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: '🎯' },
  'code': { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: '💻' },
  'set': { bg: 'bg-slate-500/20', border: 'border-slate-500/50', icon: '⚙️' },
  'httpRequest': { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', icon: '🌐' },
  'twitter': { bg: 'bg-sky-500/20', border: 'border-sky-500/50', icon: '🐦' },
  'linkedIn': { bg: 'bg-blue-600/20', border: 'border-blue-600/50', icon: '💼' },
  'stripe': { bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: '💳' },
};

function getNodeStyle(type: string) {
  // Extract the base node type from full type string
  const baseType = type.replace('n8n-nodes-base.', '');
  return NODE_STYLES[baseType] || { bg: 'bg-muted', border: 'border-border', icon: '📦' };
}

export function WorkflowDiagram({ nodes, connections, className }: WorkflowDiagramProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate positions and normalize to fit diagram
  const { normalizedNodes, svgPaths, bounds } = useMemo(() => {
    if (nodes.length === 0) return { normalizedNodes: [], svgPaths: [], bounds: { width: 0, height: 0 } };

    // Get bounds of all positions
    const positions = nodes.map(n => n.position);
    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));

    const padding = 60;
    const nodeWidth = 120;
    const nodeHeight = 40;
    const diagramWidth = 500;
    const diagramHeight = 200;

    // Scale positions to fit diagram
    const scaleX = (maxX - minX) > 0 ? (diagramWidth - padding * 2 - nodeWidth) / (maxX - minX) : 1;
    const scaleY = (maxY - minY) > 0 ? (diagramHeight - padding * 2 - nodeHeight) / (maxY - minY) : 1;
    const scale = Math.min(scaleX, scaleY, 1);

    const normalized = nodes.map(node => ({
      ...node,
      x: padding + (node.position[0] - minX) * scale,
      y: padding + (node.position[1] - minY) * scale,
      style: getNodeStyle(node.type),
    }));

    // Create lookup by name
    const nodesByName = new Map(normalized.map(n => [n.name, n]));

    // Generate connection paths
    const paths: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
    
    Object.entries(connections).forEach(([sourceName, conn]) => {
      const sourceNode = nodesByName.get(sourceName);
      if (!sourceNode || !conn.main) return;

      conn.main.forEach(outputs => {
        outputs.forEach(target => {
          const targetNode = nodesByName.get(target.node);
          if (!targetNode) return;

          paths.push({
            from: { x: sourceNode.x + nodeWidth, y: sourceNode.y + nodeHeight / 2 },
            to: { x: targetNode.x, y: targetNode.y + nodeHeight / 2 },
          });
        });
      });
    });

    return {
      normalizedNodes: normalized,
      svgPaths: paths,
      bounds: { width: diagramWidth, height: diagramHeight },
    };
  }, [nodes, connections]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPanPoint.current.x;
    const dy = e.clientY - lastPanPoint.current.y;
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  if (nodes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-32 text-muted-foreground text-sm", className)}>
        No nodes to display
      </div>
    );
  }

  return (
    <div className={cn("relative bg-muted/30 rounded-lg border overflow-hidden", className)}>
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleReset}
          title="Reset View"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Pan indicator */}
      {isPanning && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-xs">
          <Move className="h-3 w-3" />
          Panning
        </div>
      )}

      {/* Zoomable/Pannable container */}
      <div
        ref={containerRef}
        className={cn("cursor-grab", isPanning && "cursor-grabbing")}
        style={{ width: bounds.width, height: bounds.height }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: bounds.width,
            height: bounds.height,
            position: 'relative',
          }}
        >
          <svg
            width={bounds.width}
            height={bounds.height}
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 8 3, 0 6"
                  className="fill-muted-foreground/50"
                />
              </marker>
            </defs>
            {svgPaths.map((path, i) => {
              // Create curved path
              const midX = (path.from.x + path.to.x) / 2;
              const d = `M ${path.from.x} ${path.from.y} C ${midX} ${path.from.y}, ${midX} ${path.to.y}, ${path.to.x} ${path.to.y}`;
              
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  className="stroke-muted-foreground/40"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>

          <div className="relative" style={{ width: bounds.width, height: bounds.height }}>
            {normalizedNodes.map((node) => (
              <div
                key={node.id}
                className={cn(
                  "absolute flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium truncate shadow-sm",
                  node.style.bg,
                  node.style.border
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: 120,
                  height: 40,
                }}
                title={node.name}
              >
                <span className="text-sm flex-shrink-0">{node.style.icon}</span>
                <span className="truncate text-foreground">{node.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
