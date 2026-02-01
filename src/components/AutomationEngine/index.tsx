import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Rocket, Loader2, X } from "lucide-react";
import { useAutomationRun } from "@/hooks/useAutomationRun";
import { SimpleProgressBar } from "./SimpleProgressBar";
import { AutomationProgress } from "./AutomationProgress";
import { LiveLogStream } from "./LiveLogStream";
import { ExceptionReview } from "./ExceptionReview";
import { ProviderSelector } from "./ProviderSelector";
import { N8nConnectionStatus } from "./N8nConnectionStatus";
import { DeploymentPanel } from "./DeploymentPanel";
import { N8nLiveStatusPanel } from "./N8nLiveStatusPanel";
import { BrowserbaseExecutionPanel } from "./BrowserbaseExecutionPanel";
import { AISettingsDialog } from "@/components/AISettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBrowserbaseAutomation } from "@/hooks/useBrowserbaseAutomation";
import type { BusinessContext } from "@/lib/directorAiFixPromptGenerator";
import type { DirectorAiOptions } from "@/lib/directorAiPromptGenerator";

interface AutomationEngineProps {
  businessIdeaId: string;
  businessName: string;
  onComplete?: () => void;
}

export function AutomationEngine({ businessIdeaId, businessName, onComplete }: AutomationEngineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("lovable");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [businessContext, setBusinessContext] = useState<BusinessContext | undefined>();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  
  // Browserbase automation state for detailed execution panel
  const browserbaseAutomation = useBrowserbaseAutomation();
  
  const {
    isRunning,
    currentPhase,
    phaseResults,
    startAutomation,
    retryFromPhase,
    applyAIFixes,
    executeAIFix,
    cancelAutomation,
    phases,
  } = useAutomationRun();

  // Fetch business idea details for context
  useEffect(() => {
    const fetchBusinessContext = async () => {
      if (!businessIdeaId) return;
      
      const { data, error } = await supabase
        .from("business_ideas")
        .select("business_name, niche, target_audience, service_offering, value_proposition")
        .eq("id", businessIdeaId)
        .single();
      
      if (data && !error) {
        setBusinessContext({
          businessName: data.business_name,
          niche: data.niche,
          targetAudience: data.target_audience,
          serviceOffering: data.service_offering,
          valueProposition: data.value_proposition,
        });
      }
    };
    
    fetchBusinessContext();
  }, [businessIdeaId]);

  // Get n8n options from localStorage
  const n8nOptions = useMemo<DirectorAiOptions>(() => {
    const hostingType = localStorage.getItem("n8n_hosting_type") as "cloud" | "self-hosted" | undefined;
    const deploymentMethod = localStorage.getItem("n8n_deployment_method") as "hostinger" | "docker" | "npm" | "other" | undefined;
    const instanceUrl = localStorage.getItem("n8n_instance_url") || undefined;
    const workflowPath = localStorage.getItem("n8n_workflow_path") || undefined;
    
    return {
      hostingType: hostingType || undefined,
      deploymentMethod: deploymentMethod || undefined,
      n8nInstanceUrl: instanceUrl,
      n8nWorkflowPath: workflowPath,
    };
  }, []);

  const handleStart = async () => {
    setIsOpen(true);
    await startAutomation(businessIdeaId, selectedProvider);
  };

  const handleClose = () => {
    if (isRunning) {
      cancelAutomation();
    }
    setIsOpen(false);
    if (!isRunning && onComplete) {
      onComplete();
    }
  };

  const hasErrors = phaseResults.some((r) => r.status === "error");
  const hasWarnings = phaseResults.some((r) => r.status === "warning");
  const isComplete = !isRunning && phaseResults.length > 0;

  // Auto-expand details when there are errors or warnings
  useEffect(() => {
    if (hasErrors || hasWarnings) {
      setIsDetailsExpanded(true);
    }
  }, [hasErrors, hasWarnings]);

  const handleTestWorkflow = async (workflowId: string) => {
    toast.info(`Test run requested for workflow ${workflowId}. Use the n8n editor to trigger manual executions.`);
  };

  const handleApplyAIFixes = async () => {
    const exceptions = phaseResults.filter(
      (r) => r.status === "error" || r.status === "warning"
    );
    return await applyAIFixes(businessIdeaId, exceptions, selectedProvider);
  };

  const handleExecuteFix = async (fix: import("@/hooks/useAutomationRun").AIFix) => {
    return await executeAIFix(businessIdeaId, fix, selectedProvider);
  };

  const handleRetryFromPhase = async (phaseId: string) => {
    await retryFromPhase(businessIdeaId, phaseId, selectedProvider);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <ProviderSelector 
          value={selectedProvider} 
          onChange={setSelectedProvider}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <Button
          onClick={handleStart}
          disabled={isRunning}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Automating...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Automate Everything
            </>
          )}
        </Button>
      </div>

      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Automation Engine: {businessName}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Simple Progress Bar - Always visible */}
            <SimpleProgressBar
              phases={phases}
              currentPhase={currentPhase}
              phaseResults={phaseResults}
              isRunning={isRunning}
              isExpanded={isDetailsExpanded}
              onToggleExpand={() => setIsDetailsExpanded(!isDetailsExpanded)}
            />

            {/* Collapsible detailed sections */}
            {isDetailsExpanded && (
              <div className="space-y-4">
                {/* n8n Connection Status */}
                <N8nConnectionStatus />

                <AutomationProgress
                  phases={phases}
                  currentPhase={currentPhase}
                  phaseResults={phaseResults}
                  isRunning={isRunning}
                  activeProvider={selectedProvider}
                  onRetryFromPhase={handleRetryFromPhase}
                />

                {/* Live Status Panel - shows real-time workflow health */}
                <N8nLiveStatusPanel
                  pollingInterval={isRunning ? 5000 : 30000}
                  onTestWorkflow={handleTestWorkflow}
                />

                <LiveLogStream logs={phaseResults} isRunning={isRunning} />

                {/* Browserbase Execution Panel - shows detailed action breakdown */}
                {(browserbaseAutomation.actions.length > 0 || browserbaseAutomation.executionResults.length > 0) && (
                  <BrowserbaseExecutionPanel
                    actions={browserbaseAutomation.actions}
                    executionResults={browserbaseAutomation.executionResults}
                    currentActionIndex={browserbaseAutomation.currentActionIndex}
                    status={browserbaseAutomation.status}
                    isRunning={browserbaseAutomation.isRunning}
                    debugUrl={browserbaseAutomation.debugUrl}
                    finalScreenshot={browserbaseAutomation.result?.finalScreenshot}
                    totalExecutionTime={browserbaseAutomation.result?.executionTimeMs}
                  />
                )}
              </div>
            )}

            {/* Deployment Panel - show after generate phase (always visible when applicable) */}
            {phaseResults.some(r => r.phase === "generate" && r.status === "success") && (
              <DeploymentPanel 
                phaseResults={phaseResults} 
                businessName={businessName} 
              />
            )}

            {/* Exception Review - always visible when there are issues */}
            {isComplete && (hasErrors || hasWarnings) && (
              <ExceptionReview
                exceptions={phaseResults.filter(
                  (r) => r.status === "error" || r.status === "warning"
                )}
                onApplyAIFixes={handleApplyAIFixes}
                onExecuteFix={handleExecuteFix}
                businessIdeaId={businessIdeaId}
                businessContext={businessContext}
                n8nOptions={n8nOptions}
              />
            )}

            {/* Success state */}
            {isComplete && !hasErrors && !hasWarnings && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                  <Rocket className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Automation Complete!
                </h3>
                <p className="text-muted-foreground mt-2">
                  All 6 automation stages have been processed successfully.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
