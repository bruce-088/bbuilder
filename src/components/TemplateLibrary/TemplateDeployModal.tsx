import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Workflow,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Copy,
  Check,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { useN8nDeployment, DeploymentRequest } from '@/hooks/useN8nDeployment';
import { useN8nMcpConnection } from '@/hooks/useN8nMcpConnection';
import { WorkflowTemplate, INDUSTRY_LABELS, COMPLEXITY_CONFIG } from '@/lib/workflowTemplates';
import { toast } from 'sonner';

interface TemplateDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkflowTemplate;
}

export function TemplateDeployModal({
  open,
  onOpenChange,
  template,
}: TemplateDeployModalProps) {
  const {
    createDeploymentRequest,
    cancelDeployment,
    activeDeployment,
    isLoading,
  } = useN8nDeployment();
  
  const { getWorkflowEditUrl } = useN8nMcpConnection();

  const [localDeployment, setLocalDeployment] = useState<DeploymentRequest | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Generate n8n-compatible workflow JSON
  const workflowJson = {
    name: template.name,
    nodes: template.nodes,
    connections: template.connections,
    settings: { executionOrder: 'v1' },
    active: false
  };

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
    }
  }, [open]);

  const handleRequestDeployment = async () => {
    const deployment = await createDeploymentRequest({
      workflowName: template.name,
      workflowJson,
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

  const deployPromptMessage = `Deploy the pending workflow "${template.name}" to n8n`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(deployPromptMessage);
    setPromptCopied(true);
    toast.success("Prompt copied! Paste in the chat to deploy.");
    setTimeout(() => setPromptCopied(false), 3000);
  };

  const complexityConfig = COMPLEXITY_CONFIG[template.complexity];

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
                The assistant is deploying your template. This usually takes a few moments.
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
              <h3 className="font-semibold text-primary">Template Deployed!</h3>
              <p className="text-sm text-muted-foreground">
                "{template.name}" is now in your n8n instance.
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
                {template.requiredCredentials.map((cred, i) => (
                  <li key={i}>Configure {cred} credentials</li>
                ))}
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
                      if (url) openExternalUrl(url);
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
                      if (url) openExternalUrl(url);
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
            Deploy Template to n8n
          </DialogTitle>
          <DialogDescription>
            {showStatusView
              ? "Deployment status"
              : "Deploy this template directly to your n8n instance via MCP."}
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
              {/* Template preview */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <span className="font-medium truncate">{template.name}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{template.nodes.length} nodes</Badge>
                  <Badge variant="outline">{INDUSTRY_LABELS[template.industry]}</Badge>
                  <Badge className={complexityConfig.color}>{complexityConfig.label}</Badge>
                </div>
              </div>

              {/* Credentials warning */}
              {template.requiredCredentials.length > 0 && (
                <div className="rounded-lg bg-secondary border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Credentials Required
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After deployment, you'll need to configure these credentials in n8n:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.requiredCredentials.map((cred, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {cred}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Info note */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p>
                  After requesting deployment, paste the copied prompt in chat or ask the assistant directly.
                  The template will be created as a new workflow in your connected n8n instance.
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
