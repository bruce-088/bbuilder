import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw, ExternalLink, Workflow } from "lucide-react";
import { useN8nMcpConnection } from "@/hooks/useN8nMcpConnection";

interface N8nConnectionStatusProps {
  onWorkflowsFound?: (count: number) => void;
}

export function N8nConnectionStatus({ onWorkflowsFound }: N8nConnectionStatusProps) {
  const {
    isConnected,
    isChecking,
    workflows,
    instanceUrl,
    error,
    checkConnection,
    getImportUrl,
  } = useN8nMcpConnection();

  const [showWorkflows, setShowWorkflows] = useState(false);

  useEffect(() => {
    if (workflows.length > 0) {
      onWorkflowsFound?.(workflows.length);
    }
  }, [workflows.length, onWorkflowsFound]);

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking n8n connection...
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <span className="font-medium">n8n Integration</span>
          {isConnected ? (
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Not Detected
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => checkConnection()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {isConnected && workflows.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowWorkflows(!showWorkflows)}
          >
            <span className="text-sm">
              {workflows.length} GhostWriter workflow{workflows.length !== 1 ? 's' : ''} found
            </span>
            <Badge variant="secondary">{workflows.length}</Badge>
          </Button>

          {showWorkflows && (
            <div className="space-y-1 pl-2 border-l-2 border-primary/20">
              {workflows.slice(0, 5).map((wf) => (
                <div key={wf.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {wf.name}
                  </span>
                  <Badge variant={wf.active ? "default" : "secondary"} className="text-xs">
                    {wf.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            n8n MCP not detected. Workflows will be generated as JSON for manual import.
          </p>
          {instanceUrl ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const url = getImportUrl();
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open n8n Instance
            </Button>
          ) : (
            <p className="text-xs">
              Tip: Configure your n8n instance URL in the Automation Guide to enable deep links.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
