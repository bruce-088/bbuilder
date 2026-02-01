import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseResult, AutomationPhase } from "@/hooks/useAutomationRun";

interface SimpleProgressBarProps {
  phases: AutomationPhase[];
  currentPhase: string | null;
  phaseResults: PhaseResult[];
  isRunning: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function SimpleProgressBar({
  phases,
  currentPhase,
  phaseResults,
  isRunning,
  isExpanded,
  onToggleExpand,
}: SimpleProgressBarProps) {
  // Calculate progress percentage
  const completedPhases = phaseResults.filter(
    (r) => r.status === "success" || r.status === "warning" || r.status === "error"
  ).length;
  const progressPercent = Math.round((completedPhases / phases.length) * 100);

  // Determine current status message
  const getCurrentMessage = () => {
    if (!isRunning && completedPhases === 0) {
      return "Ready to start...";
    }
    
    if (isRunning && currentPhase) {
      const phase = phases.find((p) => p.id === currentPhase);
      return phase?.name || "Processing...";
    }
    
    if (!isRunning && completedPhases === phases.length) {
      const hasErrors = phaseResults.some((r) => r.status === "error");
      const hasWarnings = phaseResults.some((r) => r.status === "warning");
      if (hasErrors) return "Completed with errors";
      if (hasWarnings) return "Completed with warnings";
      return "All phases complete!";
    }
    
    return "Processing...";
  };

  // Determine status indicator
  const hasErrors = phaseResults.some((r) => r.status === "error");
  const hasWarnings = phaseResults.some((r) => r.status === "warning");
  const isComplete = !isRunning && completedPhases === phases.length;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status indicator */}
          {isRunning ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          ) : isComplete && !hasErrors && !hasWarnings ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          ) : hasErrors || hasWarnings ? (
            <AlertTriangle className={cn(
              "h-5 w-5 shrink-0",
              hasErrors ? "text-destructive" : "text-warning"
            )} />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground shrink-0" />
          )}

          {/* Progress info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate">
                {getCurrentMessage()}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        {/* Expand/collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="shrink-0"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show Details
            </>
          )}
        </Button>
      </div>

      {/* Quick phase summary when collapsed */}
      {!isExpanded && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {phases.map((phase) => {
            const result = phaseResults.find((r) => r.phase === phase.id);
            const isCurrent = currentPhase === phase.id;
            
            return (
              <div
                key={phase.id}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all",
                  result?.status === "success" && "bg-success",
                  result?.status === "warning" && "bg-warning",
                  result?.status === "error" && "bg-destructive",
                  isCurrent && "bg-primary animate-pulse",
                  !result && !isCurrent && "bg-muted"
                )}
                title={phase.name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
