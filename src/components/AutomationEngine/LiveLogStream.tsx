import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { PhaseResult } from "@/hooks/useAutomationRun";

interface LiveLogStreamProps {
  logs: PhaseResult[];
  isRunning: boolean;
}

export function LiveLogStream({ logs, isRunning }: LiveLogStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Live Log</h3>
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      <ScrollArea className="h-48 rounded-md border bg-muted/30" ref={scrollRef}>
        <div className="p-3 space-y-2 font-mono text-xs">
          {logs.length === 0 && !isRunning && (
            <p className="text-muted-foreground italic">No logs yet...</p>
          )}

          {logs.map((log, index) => (
            <div
              key={`${log.phase}-${index}`}
              className="flex items-start gap-2 pb-2 border-b border-border/50 last:border-0"
            >
              <span className="text-muted-foreground shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span className="uppercase font-semibold text-primary shrink-0">
                [{log.phase}]
              </span>
              <span className="flex-1 text-foreground">{log.message}</span>
              {getStatusBadge(log.status)}
            </div>
          ))}

          {isRunning && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="animate-pulse">Waiting for next phase...</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
