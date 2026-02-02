import { useState, useMemo } from "react";
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
  AlertTriangle,
  ChevronDown,
  KeyRound,
  Sparkles,
  Clock
} from "lucide-react";
import { useN8nMcpConnection } from "@/hooks/useN8nMcpConnection";
import { useN8nDeployment } from "@/hooks/useN8nDeployment";
import { useToast } from "@/hooks/use-toast";
import { PhaseResult } from "@/hooks/useAutomationRun";
import {
  formatForN8nImport,
  formatSingleStage,
  validateWorkflowForExport,
  getAvailableStages
} from "@/lib/n8nWorkflowFormatter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CredentialPreFillModal } from "./CredentialPreFillModal";
import { MCPDeploymentModal } from "./MCPDeploymentModal";

interface DeploymentPanelProps {
  phaseResults: PhaseResult[];
  businessName: string;
  businessIdeaId?: string;
}

export function DeploymentPanel({ phaseResults, businessName, businessIdeaId }: DeploymentPanelProps) {
  const { toast } = useToast();
  const {
    isConnected,
    workflows,
    findWorkflowByStage,
    getImportUrl,
  } = useN8nMcpConnection();

  const { activeDeployment, getPendingDeployment } = useN8nDeployment();

  const [copied, setCopied] = useState(false);
  const [credentialsExpanded, setCredentialsExpanded] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"download" | "copy" | null>(null);

  // Extract generated workflows from phase results
  const generateResult = phaseResults.find(r => r.phase === "generate");
  const deployResult = phaseResults.find(r => r.phase === "deploy");
  const generatedWorkflows = generateResult?.data?.workflows as Record<string, unknown> | undefined;

  // Validate and get workflow status
  const workflowStatus = useMemo(() => 
    validateWorkflowForExport(generatedWorkflows, businessName),
    [generatedWorkflows, businessName]
  );

  // Get available stages for individual downloads
  const availableStages = useMemo(() => 
    getAvailableStages(generatedWorkflows),
    [generatedWorkflows]
  );

  // Check if we should show credential modal before export
  const hasCredentialWarnings = workflowStatus.credentialWarnings.length > 0;

  const handleExportWithCredentialCheck = (action: "download" | "copy") => {
    if (hasCredentialWarnings) {
      setPendingAction(action);
      setShowCredentialModal(true);
    } else if (action === "download") {
      executeDownload();
    } else {
      executeCopy();
    }
  };

  const handleCredentialModalComplete = () => {
    if (pendingAction === "download") {
      executeDownload();
    } else if (pendingAction === "copy") {
      executeCopy();
    }
    setPendingAction(null);
  };

  const executeCopy = async () => {
    if (!generatedWorkflows) return;

    const formattedWorkflow = formatForN8nImport(generatedWorkflows, businessName);
    
    if (!formattedWorkflow) {
      toast({
        title: "Invalid workflow format",
        description: "Could not convert to n8n format. Try regenerating the workflow.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(formattedWorkflow, null, 2));
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `${workflowStatus.nodeCount} nodes ready to paste into n8n`,
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

  const executeDownload = () => {
    if (!generatedWorkflows) return;

    const formattedWorkflow = formatForN8nImport(generatedWorkflows, businessName);
    
    if (!formattedWorkflow) {
      toast({
        title: "Invalid workflow format",
        description: "Could not convert to n8n format. Try regenerating the workflow.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([JSON.stringify(formattedWorkflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.replace(/\s+/g, "_")}_workflow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `${workflowStatus.nodeCount} nodes ready for import into n8n`,
    });
  };

  const handleDownloadStage = (stageKey: string) => {
    if (!generatedWorkflows) return;

    const stage = generatedWorkflows[stageKey];
    const formatted = formatSingleStage(stage, stageKey, businessName);
    
    if (!formatted) {
      toast({
        title: "Invalid stage format",
        description: `Could not format ${stageKey} for n8n import.`,
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([JSON.stringify(formatted, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stageNumber = stageKey.replace(/\D/g, '') || '1';
    a.download = `${businessName.replace(/\s+/g, "_")}_stage${stageNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Stage download started",
      description: `Stage ${stageNumber} ready for import into n8n`,
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
          <div className="flex items-center gap-2">
            {workflowStatus.valid ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {workflowStatus.nodeCount} nodes
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Invalid
              </Badge>
            )}
            {deployResult?.status === "success" && (
              <Badge variant="default" className="bg-primary/10 text-primary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation status */}
        {!workflowStatus.valid && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {workflowStatus.message}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              The generated workflow data couldn't be parsed. Try running the generation phase again.
            </p>
          </div>
        )}

        {/* Credential warnings */}
        {workflowStatus.credentialWarnings.length > 0 && (
          <Collapsible open={credentialsExpanded} onOpenChange={setCredentialsExpanded}>
            <div className="rounded-lg bg-secondary border border-border p-3 space-y-2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <KeyRound className="h-4 w-4" />
                    {workflowStatus.credentialWarnings.length} node{workflowStatus.credentialWarnings.length > 1 ? 's' : ''} need credentials
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${credentialsExpanded ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <p className="text-xs text-muted-foreground">
                After importing, configure credentials in n8n for these nodes
              </p>
              <CollapsibleContent className="space-y-1.5 pt-2">
                {workflowStatus.credentialWarnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1.5"
                  >
                    <span className="font-medium truncate max-w-[180px]" title={warning.nodeName}>
                      {warning.nodeName}
                    </span>
                    <Badge variant="outline" className="text-xs bg-secondary text-foreground border-border">
                      {warning.missingCredential}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

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
          <Button 
            onClick={() => handleExportWithCredentialCheck("copy")} 
            variant="outline" 
            size="sm"
            disabled={!workflowStatus.valid}
          >
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

          <Button 
            onClick={() => handleExportWithCredentialCheck("download")} 
            variant="outline" 
            size="sm"
            disabled={!workflowStatus.valid}
          >
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>

          {/* Individual stage downloads */}
          {availableStages.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!workflowStatus.valid}>
                  <FileJson className="h-4 w-4 mr-2" />
                  By Stage
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {availableStages.map((stageKey) => {
                  const stageNum = stageKey.replace(/\D/g, '') || stageKey;
                  return (
                    <DropdownMenuItem
                      key={stageKey}
                      onClick={() => handleDownloadStage(stageKey)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Stage {stageNum}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Deploy to n8n via MCP - primary action when connected */}
          {isConnected && workflows.length > 0 && (
            <Button 
              onClick={() => setShowDeploymentModal(true)}
              size="sm"
              disabled={!workflowStatus.valid || !!getPendingDeployment(businessIdeaId)}
              className="relative"
            >
              {getPendingDeployment(businessIdeaId) ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Pending...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Deploy to n8n
                </>
              )}
            </Button>
          )}

          {getImportUrl() && !isConnected && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                const url = getImportUrl();
                if (url) {
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open n8n
            </Button>
          )}
        </div>

        {/* Pending deployment notice */}
        {getPendingDeployment(businessIdeaId) && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-medium">Deployment pending</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ask the assistant: "Deploy my pending workflow to n8n"
            </p>
          </div>
        )}

        {/* Import instructions */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <FileJson className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Quick Import Instructions</p>
              <ol className="text-muted-foreground text-xs list-decimal list-inside space-y-0.5">
                <li>Click "Deploy to n8n" or use "Open n8n" for manual import</li>
                <li>If manual: Create new workflow and paste JSON</li>
                <li>Configure credentials for each service</li>
                <li>Activate the workflow</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Credential Pre-fill Modal */}
        <CredentialPreFillModal
          open={showCredentialModal}
          onOpenChange={setShowCredentialModal}
          credentialWarnings={workflowStatus.credentialWarnings}
          onComplete={handleCredentialModalComplete}
        />

        {/* MCP Deployment Modal */}
        {generatedWorkflows && (
          <MCPDeploymentModal
            open={showDeploymentModal}
            onOpenChange={setShowDeploymentModal}
            workflowName={`${businessName} - Complete Automation`}
            workflowJson={(formatForN8nImport(generatedWorkflows, businessName) || {}) as Record<string, unknown>}
            nodeCount={workflowStatus.nodeCount}
            stageCount={availableStages.length}
            businessIdeaId={businessIdeaId}
          />
        )}
      </CardContent>
    </Card>
  );
}
