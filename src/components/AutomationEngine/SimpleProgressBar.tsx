import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseResult, AutomationPhase } from "@/hooks/useAutomationRun";

const EXPAND_PREFERENCE_KEY = "mya_progress_bar_expanded";
const FIRST_RUN_KEY = "mya_automation_first_run";

interface SimpleProgressBarProps {
  phases: AutomationPhase[];
  currentPhase: string | null;
  phaseResults: PhaseResult[];
  isRunning: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  actionRequired?: string | null;
}

export function SimpleProgressBar({
  phases,
  currentPhase,
  phaseResults,
  isRunning,
  isExpanded,
  onToggleExpand,
  actionRequired,
}: SimpleProgressBarProps) {
  // Auto-expand on first run or if user has previously expanded
  useEffect(() => {
    const isFirstRun = localStorage.getItem(FIRST_RUN_KEY) !== "true";
    const previouslyExpanded = localStorage.getItem(EXPAND_PREFERENCE_KEY) === "true";
    
    if (isFirstRun && !isExpanded) {
      // First time user - auto-expand to show them the details
      onToggleExpand();
      localStorage.setItem(FIRST_RUN_KEY, "true");
    } else if (previouslyExpanded && !isExpanded) {
      // User previously expanded - respect their preference
      onToggleExpand();
    }
  }, []); // Only run on mount

  // Save user preference when they toggle
  const handleToggle = () => {
    const newState = !isExpanded;
    localStorage.setItem(EXPAND_PREFERENCE_KEY, newState ? "true" : "false");
    onToggleExpand();
  };
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

  // Count issues for mini-badge
  const errorCount = phaseResults.filter(r => r.status === "error").length;
  const warningCount = phaseResults.filter(r => r.status === "warning").length;

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 space-y-3 transition-all",
      actionRequired && "border-warning/50 ring-1 ring-warning/20"
    )}>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {getCurrentMessage()}
                </span>
                {/* Mini status badges when collapsed */}
                {!isExpanded && (errorCount > 0 || warningCount > 0) && (
                  <div className="flex items-center gap-1">
                    {errorCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-destructive/10 text-destructive border-destructive/30">
                        <AlertCircle className="h-3 w-3 mr-0.5" />
                        {errorCount}
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-warning/10 text-warning border-warning/30">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                        {warningCount}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
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
          onClick={handleToggle}
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

      {/* Action required banner */}
      {actionRequired && !isExpanded && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/20 animate-pulse">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-xs text-warning font-medium">{actionRequired}</span>
          <Button variant="ghost" size="sm" onClick={handleToggle} className="ml-auto text-xs h-6 px-2">
            View
          </Button>
        </div>
      )}

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
