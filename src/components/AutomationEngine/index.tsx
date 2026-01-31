import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rocket, Loader2, X } from "lucide-react";
import { useAutomationRun } from "@/hooks/useAutomationRun";
import { AutomationProgress } from "./AutomationProgress";
import { LiveLogStream } from "./LiveLogStream";
import { ExceptionReview } from "./ExceptionReview";
import { ProviderSelector } from "./ProviderSelector";
import { N8nConnectionStatus } from "./N8nConnectionStatus";
import { DeploymentPanel } from "./DeploymentPanel";
import { N8nLiveStatusPanel } from "./N8nLiveStatusPanel";
import { AISettingsDialog } from "@/components/AISettingsDialog";
import { toast } from "sonner";

interface AutomationEngineProps {
  businessIdeaId: string;
  businessName: string;
  onComplete?: () => void;
}

export function AutomationEngine({ businessIdeaId, businessName, onComplete }: AutomationEngineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("lovable");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    isRunning,
    currentPhase,
    phaseResults,
    startAutomation,
    applyAIFixes,
    executeAIFix,
    cancelAutomation,
    phases,
  } = useAutomationRun();

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

          <div className="flex-1 overflow-auto space-y-6 py-4">
            {/* n8n Connection Status */}
            <N8nConnectionStatus />

            <AutomationProgress
              phases={phases}
              currentPhase={currentPhase}
              phaseResults={phaseResults}
              isRunning={isRunning}
              activeProvider={selectedProvider}
            />

            {/* Live Status Panel - shows real-time workflow health */}
            <N8nLiveStatusPanel
              pollingInterval={isRunning ? 5000 : 30000}
              onTestWorkflow={handleTestWorkflow}
            />

            <LiveLogStream logs={phaseResults} isRunning={isRunning} />

            {/* Deployment Panel - show after generate phase */}
            {phaseResults.some(r => r.phase === "generate" && r.status === "success") && (
              <DeploymentPanel 
                phaseResults={phaseResults} 
                businessName={businessName} 
              />
            )}

            {isComplete && (hasErrors || hasWarnings) && (
              <ExceptionReview
                exceptions={phaseResults.filter(
                  (r) => r.status === "error" || r.status === "warning"
                )}
                onApplyAIFixes={handleApplyAIFixes}
                onExecuteFix={handleExecuteFix}
                businessIdeaId={businessIdeaId}
              />
            )}

            {isComplete && !hasErrors && !hasWarnings && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                  <Rocket className="h-8 w-8 text-green-600 dark:text-green-400" />
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
