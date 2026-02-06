import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Loader2, SkipForward } from "lucide-react";
import type { NodeExecutionLog } from "@/hooks/useWorkflowExecution";
import { NODE_TYPE_CONFIG } from "./types";
import type { WorkflowNode } from "./types";

interface ExecutionLogPanelProps {
  executing: boolean;
  nodeLogs: Map<string, NodeExecutionLog>;
  nodes: WorkflowNode[];
  onNodeClick: (nodeId: string) => void;
}

const STATUS_ICON = {
  pending: <Clock className="h-3.5 w-3.5 text-yellow-500/60" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  skipped: <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />,
} as const;

export function ExecutionLogPanel({ executing, nodeLogs, nodes, onNodeClick }: ExecutionLogPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (nodeLogs.size === 0 && !executing) return null;

  const sortedLogs = nodes
    .map((n) => ({ node: n, log: nodeLogs.get(n.id) }))
    .filter(({ log }) => log);

  const completedCount = sortedLogs.filter(({ log }) => log?.status === "completed").length;
  const failedCount = sortedLogs.filter(({ log }) => log?.status === "failed").length;

  const getDuration = (log: NodeExecutionLog) => {
    if (!log.started_at || !log.completed_at) return null;
    return Math.round(new Date(log.completed_at).getTime() - new Date(log.started_at).getTime());
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm transition-all">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {executing ? (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          ) : failedCount > 0 ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="text-xs font-medium text-foreground">
            {executing ? "Executing..." : failedCount > 0 ? "Execution Failed" : "Execution Complete"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {completedCount}/{sortedLogs.length} nodes
          </span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Log entries */}
      {expanded && (
        <ScrollArea className="max-h-48">
          <div className="px-4 pb-3 space-y-1">
            {sortedLogs.map(({ node, log }) => {
              if (!log) return null;
              const cfg = NODE_TYPE_CONFIG[node.type];
              const duration = getDuration(log);
              return (
                <button
                  key={node.id}
                  onClick={() => onNodeClick(node.id)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors text-left"
                >
                  {STATUS_ICON[log.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending}
                  <span className="text-sm">{cfg?.icon}</span>
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{node.name}</span>
                  {log.error && (
                    <span className="text-[10px] text-destructive truncate max-w-[200px]">{log.error}</span>
                  )}
                  {duration !== null && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{duration}ms</span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
