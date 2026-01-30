import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Workflow,
  FileJson,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useN8nMcpConnection } from "@/hooks/useN8nMcpConnection";
import { useToast } from "@/hooks/use-toast";
import { PhaseResult } from "@/hooks/useAutomationRun";

interface DeploymentPanelProps {
  phaseResults: PhaseResult[];
  businessName: string;
}

export function DeploymentPanel({ phaseResults, businessName }: DeploymentPanelProps) {
  const { toast } = useToast();
  const {
    isConnected,
    workflows,
    getImportUrl,
    findWorkflowByStage,
  } = useN8nMcpConnection();

  const [copied, setCopied] = useState(false);

  // Extract generated workflows from phase results
  const generateResult = phaseResults.find(r => r.phase === "generate");
  const deployResult = phaseResults.find(r => r.phase === "deploy");
  const generatedWorkflows = generateResult?.data?.workflows as Record<string, unknown> | undefined;

  const handleCopyJson = async () => {
    if (!generatedWorkflows) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedWorkflows, null, 2));
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Workflow JSON ready to paste into n8n",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please try downloading the file instead",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!generatedWorkflows) return;

    const blob = new Blob([JSON.stringify(generatedWorkflows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.replace(/\s+/g, "_")}_workflows.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Import this file into your n8n instance",
    });
  };

  // Check which stages have existing workflows
  const stageStatus = [1, 2, 3, 4, 5, 6].map(stage => {
    const existing = findWorkflowByStage(stage);
    return {
      stage,
      hasExisting: !!existing,
      workflowName: existing?.name,
      workflowActive: existing?.active,
    };
  });

  const existingCount = stageStatus.filter(s => s.hasExisting).length;

  if (!generatedWorkflows) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Workflow className="h-5 w-5" />
              Deploy Workflows
            </CardTitle>
            <CardDescription>
              {isConnected
                ? `${existingCount}/6 stages detected in your n8n instance`
                : "Generated workflows ready for import"}
            </CardDescription>
          </div>
          {deployResult?.status === "success" && (
            <Badge variant="default" className="bg-primary/10 text-primary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing workflow detection */}
        {isConnected && existingCount > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Existing GhostWriter Workflows Detected
            </div>
            <div className="grid grid-cols-3 gap-2">
              {stageStatus.map(({ stage, hasExisting, workflowActive }) => (
                <div
                  key={stage}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                    hasExisting
                      ? workflowActive
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hasExisting ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  Stage {stage}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Generated workflows will complement your existing setup
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopyJson} variant="outline" size="sm">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </>
            )}
          </Button>

          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          {getImportUrl() && (
            <Button asChild variant="default" size="sm">
              <a href={getImportUrl()!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open n8n
              </a>
            </Button>
          )}
        </div>

        {/* Import instructions */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <FileJson className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Quick Import Instructions</p>
              <ol className="text-muted-foreground text-xs list-decimal list-inside space-y-0.5">
                <li>Click "Open n8n" or go to your n8n instance</li>
                <li>Create a new workflow (+ button)</li>
                <li>Use ⌘/Ctrl + V to paste, or Import from file</li>
                <li>Configure credentials for each service</li>
                <li>Activate the workflow</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
