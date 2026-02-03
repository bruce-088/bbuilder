import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Workflow,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Clock,
  Sparkles,
  Copy,
  Check,
  Play,
  Zap,
} from "lucide-react";
import { useN8nDeployment, DeploymentRequest } from "@/hooks/useN8nDeployment";
import { useN8nMcpConnection } from "@/hooks/useN8nMcpConnection";
import { toast } from "sonner";

interface MCPDeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  workflowJson: Record<string, unknown>;
  nodeCount: number;
  stageCount: number;
  businessIdeaId?: string;
}

type DeploymentMode = "create" | "overwrite";

export function MCPDeploymentModal({
  open,
  onOpenChange,
  workflowName,
  workflowJson,
  nodeCount,
  stageCount,
  businessIdeaId,
}: MCPDeploymentModalProps) {
  const {
    createDeploymentRequest,
    cancelDeployment,
    activeDeployment,
    isLoading,
  } = useN8nDeployment();
  
  const { workflows, getWorkflowEditUrl } = useN8nMcpConnection();

  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("create");
  const [localDeployment, setLocalDeployment] = useState<DeploymentRequest | null>(null);
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(() => {
    return localStorage.getItem("mya_auto_deploy_workflows") === "true";
  });
  const [promptCopied, setPromptCopied] = useState(false);

  // Check for existing workflow with similar name
  const existingWorkflow = workflows.find(
    wf => wf.name.toLowerCase().includes(workflowName.toLowerCase().split(" ")[0])
  );

  // Track deployment for this modal session
  useEffect(() => {
    if (activeDeployment && localDeployment?.id === activeDeployment.id) {
      setLocalDeployment(activeDeployment);
    }
  }, [activeDeployment, localDeployment?.id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setLocalDeployment(null);
      setDeploymentMode("create");
    }
  }, [open]);

  const handleRequestDeployment = async () => {
    const finalName = deploymentMode === "create" && existingWorkflow
      ? `${workflowName} (${new Date().toLocaleDateString()})`
      : workflowName;

    const deployment = await createDeploymentRequest({
      workflowName: finalName,
      workflowJson,
      businessIdeaId,
    });

    if (deployment) {
      setLocalDeployment(deployment);
    }
  };

  const handleCancel = async () => {
    if (localDeployment) {
      await cancelDeployment(localDeployment.id);
      setLocalDeployment(null);
    }
    onOpenChange(false);
  };

  const handleToggleAutoDeploy = (checked: boolean) => {
    setAutoDeployEnabled(checked);
    localStorage.setItem("mya_auto_deploy_workflows", checked ? "true" : "false");
    toast.success(checked ? "Auto-deploy enabled for future workflows" : "Auto-deploy disabled");
  };

  const deployPromptMessage = "Deploy my pending workflow to n8n";

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(deployPromptMessage);
    setPromptCopied(true);
    toast.success("Prompt copied! Paste in the chat to deploy.");
    setTimeout(() => setPromptCopied(false), 3000);
  };

  const getStatusDisplay = () => {
    if (!localDeployment) return null;

    switch (localDeployment.status) {
      case "pending":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <Badge className="absolute -bottom-1 -right-1 bg-secondary text-secondary-foreground">
                Pending
              </Badge>
            </div>
            <div className="text-center space-y-3">
              <h3 className="font-semibold">Deployment Requested</h3>
              <p className="text-sm text-muted-foreground">
                Click below to copy the prompt, then paste it in the chat:
              </p>
              <Button
                onClick={handleCopyPrompt}
                variant={promptCopied ? "secondary" : "default"}
                className="w-full max-w-xs"
              >
                {promptCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy deploy prompt
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Or say: <span className="font-medium text-foreground">"{deployPromptMessage}"</span>
              </p>
            </div>
          </div>
        );

      case "deploying":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Deploying to n8n...</h3>
              <p className="text-sm text-muted-foreground">
                The assistant is deploying your workflow. This usually takes a few moments.
              </p>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-primary">Deployment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Your workflow has been deployed to n8n.
              </p>
              {localDeployment.n8n_workflow_id && (
                <Badge variant="outline" className="font-mono">
                  ID: {localDeployment.n8n_workflow_id}
                </Badge>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-4 w-full max-w-sm space-y-3">
              <h4 className="text-sm font-medium">Next steps:</h4>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Configure credentials in n8n</li>
                <li>Test the workflow with sample data</li>
                <li>Activate for production use</li>
              </ol>
              {localDeployment.n8n_workflow_id && getWorkflowEditUrl(localDeployment.n8n_workflow_id) && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const url = getWorkflowEditUrl(localDeployment.n8n_workflow_id!);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open in n8n
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      toast.info("Use the n8n editor to test workflow execution");
                      const url = getWorkflowEditUrl(localDeployment.n8n_workflow_id!);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Test Workflow
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case "failed":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-foreground">Deployment Failed</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {localDeployment.error_message || "An error occurred during deployment."}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const showStatusView = localDeployment && ["pending", "deploying", "success", "failed"].includes(localDeployment.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Deploy to n8n
          </DialogTitle>
          <DialogDescription>
            {showStatusView
              ? "Deployment status"
              : "Deploy your generated workflow directly to n8n via the MCP connector."}
          </DialogDescription>
        </DialogHeader>

        {showStatusView ? (
          <>
            {getStatusDisplay()}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {localDeployment?.status === "pending" && (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel Request
                  </Button>
                  <Button onClick={handleCopyPrompt} variant={promptCopied ? "secondary" : "default"}>
                    {promptCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Prompt
                      </>
                    )}
                  </Button>
                </>
              )}
              {localDeployment?.status === "success" && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              )}
              {localDeployment?.status === "failed" && (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button onClick={() => setLocalDeployment(null)}>
                    Try Again
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              {/* Workflow preview */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <span className="font-medium truncate">{workflowName}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{nodeCount} nodes</Badge>
                  <Badge variant="outline">{stageCount} stages</Badge>
                </div>
              </div>

              {/* Conflict warning */}
              {existingWorkflow && (
                <div className="rounded-lg bg-secondary border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Existing workflow detected
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A workflow named "{existingWorkflow.name}" already exists in your n8n instance.
                  </p>
                  <RadioGroup
                    value={deploymentMode}
                    onValueChange={(v) => setDeploymentMode(v as DeploymentMode)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create" id="create" />
                      <Label htmlFor="create" className="text-sm cursor-pointer">
                        Create as new workflow
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="overwrite" id="overwrite" />
                      <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                        Overwrite existing workflow
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Auto-deploy preference */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-deploy workflows</p>
                    <p className="text-xs text-muted-foreground">Skip this dialog for future deployments</p>
                  </div>
                </div>
                <Switch
                  checked={autoDeployEnabled}
                  onCheckedChange={handleToggleAutoDeploy}
                />
              </div>

              {/* Info note */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p>
                  After requesting deployment, paste the copied prompt in chat or ask the assistant directly.
                  The workflow will be created in your connected n8n instance.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestDeployment} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Request Deployment
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
