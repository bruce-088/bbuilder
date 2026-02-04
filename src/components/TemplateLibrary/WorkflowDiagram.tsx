import { useMemo } from 'react';
import { WorkflowNode, WorkflowConnection } from '@/lib/workflowTemplates/types';
import { cn } from '@/lib/utils';

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

  if (nodes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-32 text-muted-foreground text-sm", className)}>
        No nodes to display
      </div>
    );
  }

  return (
    <div className={cn("relative bg-muted/30 rounded-lg border overflow-hidden", className)}>
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
  );
}
