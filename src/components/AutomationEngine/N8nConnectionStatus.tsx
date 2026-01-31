import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, RefreshCw, ExternalLink, Workflow, Save } from "lucide-react";
import { useN8nMcpConnection } from "@/hooks/useN8nMcpConnection";
import { toast } from "sonner";

interface N8nConnectionStatusProps {
  onWorkflowsFound?: (count: number) => void;
  onUrlConfigured?: (url: string) => void;
}

export function N8nConnectionStatus({ onWorkflowsFound, onUrlConfigured }: N8nConnectionStatusProps) {
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(localStorage.getItem("n8n_instance_url") || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workflows.length > 0) {
      onWorkflowsFound?.(workflows.length);
    }
  }, [workflows.length, onWorkflowsFound]);

  // Show URL input if no URL is configured
  useEffect(() => {
    const storedUrl = localStorage.getItem("n8n_instance_url");
    if (!storedUrl) {
      setShowUrlInput(true);
    }
  }, []);

  const handleSaveUrl = () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a valid n8n instance URL");
      return;
    }

    setIsSaving(true);
    
    // Normalize the URL
    let normalizedUrl = urlInput.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    // Remove trailing slash
    normalizedUrl = normalizedUrl.replace(/\/$/, "");

    // Save to localStorage
    localStorage.setItem("n8n_instance_url", normalizedUrl);
    localStorage.setItem("n8n_workflow_path", `${normalizedUrl}/workflow`);
    
    // Detect hosting type
    if (normalizedUrl.includes(".app.n8n.cloud")) {
      localStorage.setItem("n8n_hosting_type", "cloud");
    } else {
      localStorage.setItem("n8n_hosting_type", "self-hosted");
      if (normalizedUrl.includes(".hstgr.cloud")) {
        localStorage.setItem("n8n_deployment_method", "hostinger");
      }
    }

    toast.success("n8n instance URL saved!");
    setShowUrlInput(false);
    setIsSaving(false);
    onUrlConfigured?.(normalizedUrl);
    
    // Trigger a re-check of the connection
    setTimeout(() => checkConnection(), 500);
  };

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
          ) : instanceUrl ? (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Not Detected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30">
              Not Configured
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

      {/* Inline URL Configuration */}
      {(showUrlInput || !instanceUrl) && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-sm font-medium">Configure n8n Instance</p>
          <p className="text-xs text-muted-foreground">
            Enter your n8n instance URL to enable automated fixes and deep links.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://n8n.your-domain.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSaveUrl()}
            />
            <Button
              size="sm"
              onClick={handleSaveUrl}
              disabled={isSaving || !urlInput.trim()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Examples: n8n.srv1234.hstgr.cloud, your-instance.app.n8n.cloud
          </p>
        </div>
      )}

      {/* Show configured URL */}
      {instanceUrl && !showUrlInput && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate max-w-[200px]">{instanceUrl}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setShowUrlInput(true)}
          >
            Edit
          </Button>
        </div>
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

      {!isConnected && instanceUrl && (
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            n8n MCP not detected. Workflows will be generated as JSON for manual import.
          </p>
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
        </div>
      )}
    </div>
  );
}
