import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ExecutionLog } from "@/hooks/useExecutionMonitor";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ExecutionTimelineProps {
  executions: ExecutionLog[];
  onSelectExecution?: (execution: ExecutionLog) => void;
  className?: string;
}

const statusConfig = {
  running: {
    icon: Loader2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "Running",
    animate: true,
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Success",
    animate: false,
  },
  error: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Error",
    animate: false,
  },
  waiting: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    label: "Waiting",
    animate: false,
  },
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function ExecutionTimeline({
  executions,
  onSelectExecution,
  className,
}: ExecutionTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (executions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
        <Clock className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No executions yet</p>
        <p className="text-xs mt-1">Workflow executions will appear here in real-time</p>
      </div>
    );
  }

  // Group executions by date
  const groupedByDate = executions.reduce<Record<string, ExecutionLog[]>>((acc, exec) => {
    const date = format(new Date(exec.started_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(exec);
    return acc;
  }, {});

  return (
    <ScrollArea className={cn("h-[400px]", className)}>
      <div className="space-y-6 pr-4">
        {Object.entries(groupedByDate).map(([date, dateExecutions]) => (
          <div key={date}>
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {format(new Date(date), "EEEE, MMMM d")}
              </h4>
            </div>
            
            <div className="space-y-2">
              {dateExecutions.map((execution) => {
                const config = statusConfig[execution.status];
                const Icon = config.icon;
                const isExpanded = expandedId === execution.id;

                return (
                  <Collapsible
                    key={execution.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedId(isExpanded ? null : execution.id)}
                  >
                    <div 
                      className={cn(
                        "relative border rounded-lg transition-all",
                        isExpanded && "ring-2 ring-primary/20",
                        execution.status === "error" && "border-destructive/50"
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start p-3 h-auto hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3 w-full">
                            {/* Status icon */}
                            <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                              <Icon 
                                className={cn(
                                  "h-4 w-4", 
                                  config.color,
                                  config.animate && "animate-spin"
                                )} 
                              />
                            </div>

                            {/* Main info */}
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium truncate">{execution.workflow_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{format(new Date(execution.started_at), "HH:mm:ss")}</span>
                                <span>•</span>
                                <span>{formatDuration(execution.duration_ms)}</span>
                                {execution.trigger_type && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {execution.trigger_type}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Status badge */}
                            <Badge 
                              variant={execution.status === "error" ? "destructive" : "secondary"}
                              className="shrink-0"
                            >
                              {config.label}
                            </Badge>

                            {/* Expand icon */}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-3 border-t">
                          {/* Error details */}
                          {execution.status === "error" && execution.error_message && (
                            <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  {execution.error_node && (
                                    <p className="text-xs font-medium text-destructive mb-1">
                                      Failed at: {execution.error_node}
                                    </p>
                                  )}
                                  <p className="text-sm text-destructive/90 break-words">
                                    {execution.error_message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Execution details */}
                          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Execution ID</p>
                              <p className="font-mono text-xs truncate">{execution.execution_id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Started</p>
                              <p className="text-xs">
                                {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Nodes Executed</p>
                              <p className="text-xs">{execution.node_execution_count}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Retry Count</p>
                              <p className="text-xs">{execution.retry_count}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => onSelectExecution?.(execution)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
