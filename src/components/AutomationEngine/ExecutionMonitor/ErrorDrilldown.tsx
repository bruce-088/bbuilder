import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  MessageSquare, 
  Copy, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ExecutionLog } from "@/hooks/useExecutionMonitor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { openExternalUrl } from "@/lib/openExternalUrl";

interface ErrorDrilldownProps {
  errors: ExecutionLog[];
  onChatWithMya?: (error: ExecutionLog) => void;
  className?: string;
}

export function ErrorDrilldown({ 
  errors, 
  onChatWithMya,
  className 
}: ErrorDrilldownProps) {
  const navigate = useNavigate();
  const [selectedError, setSelectedError] = useState<ExecutionLog | null>(null);

  const handleCopyError = (error: ExecutionLog) => {
    const errorText = `
Workflow: ${error.workflow_name}
Execution ID: ${error.execution_id}
Failed Node: ${error.error_node || "Unknown"}
Error: ${error.error_message || "No error message"}
Time: ${new Date(error.started_at).toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorText);
    toast.success("Error details copied to clipboard");
  };

  const handleChatWithMya = (error: ExecutionLog) => {
    // Build context message for Mya
    const contextMessage = `I'm having an issue with my n8n workflow "${error.workflow_name}". 

**Error Details:**
- Execution ID: ${error.execution_id}
- Failed Node: ${error.error_node || "Unknown"}
- Error Message: ${error.error_message || "No error message available"}
- Duration: ${error.duration_ms ? `${error.duration_ms}ms` : "N/A"}

Can you help me understand what went wrong and how to fix it?`;

    // Store context and navigate to chat
    sessionStorage.setItem("mya_error_context", JSON.stringify({
      workflowName: error.workflow_name,
      executionId: error.execution_id,
      errorNode: error.error_node,
      errorMessage: error.error_message,
      contextMessage,
    }));

    onChatWithMya?.(error);
  };

  const handleOpenInN8n = (error: ExecutionLog) => {
    const baseUrl = localStorage.getItem("n8n_instance_url");
    if (baseUrl) {
      const executionUrl = `${baseUrl.replace(/\/+$/, "")}/execution/${error.execution_id}`;
      openExternalUrl(executionUrl);
    } else {
      toast.error("n8n instance URL not configured");
    }
  };

  if (errors.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium text-primary">No Recent Errors</p>
          <p className="text-sm text-muted-foreground mt-1">All workflows are running smoothly</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Recent Errors
            <Badge variant="destructive" className="ml-1">
              {errors.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="divide-y">
            {errors.map((error) => (
              <div
                key={error.id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                  selectedError?.id === error.id && "bg-muted/50"
                )}
                onClick={() => setSelectedError(
                  selectedError?.id === error.id ? null : error
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{error.workflow_name}</p>
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          selectedError?.id === error.id && "rotate-90"
                        )} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(error.started_at), { addSuffix: true })}
                    </p>
                    {error.error_node && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Node: {error.error_node}
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedError?.id === error.id && (
                  <div className="mt-3 space-y-3">
                    {/* Error message */}
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive/90 break-words">
                        {error.error_message || "No error message available"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChatWithMya(error);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Ask Mya to Fix
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInN8n(error);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View in n8n
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyError(error);
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
