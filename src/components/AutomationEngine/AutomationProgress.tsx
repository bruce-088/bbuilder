import { CheckCircle2, Circle, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseResult, AutomationPhase } from "@/hooks/useAutomationRun";

interface AutomationProgressProps {
  phases: AutomationPhase[];
  currentPhase: string | null;
  phaseResults: PhaseResult[];
  isRunning: boolean;
}

export function AutomationProgress({
  phases,
  currentPhase,
  phaseResults,
}: AutomationProgressProps) {
  const getPhaseStatus = (phaseId: string) => {
    const result = phaseResults.find((r) => r.phase === phaseId);
    if (result) return result.status;
    if (currentPhase === phaseId) return "running";
    const currentIndex = phases.findIndex((p) => p.id === currentPhase);
    const thisIndex = phases.findIndex((p) => p.id === phaseId);
    if (currentIndex > thisIndex) return "complete";
    return "pending";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Automation Progress</h3>
      
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-[14px] top-6 bottom-6 w-0.5 bg-border" />
        
        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase) => {
            const status = getPhaseStatus(phase.id);
            const result = phaseResults.find((r) => r.phase === phase.id);
            
            return (
              <div
                key={phase.id}
                className={cn(
                  "relative flex items-start gap-4 pl-8",
                  status === "running" && "animate-pulse"
                )}
              >
                {/* Status icon */}
                <div className="absolute left-0 flex items-center justify-center w-7 h-7 rounded-full bg-background border-2 border-border">
                  {getStatusIcon(status)}
                </div>
                
                {/* Phase content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={cn(
                        "text-sm font-medium",
                        status === "pending" && "text-muted-foreground",
                        status === "running" && "text-primary",
                        status === "success" && "text-foreground",
                        status === "warning" && "text-warning",
                        status === "error" && "text-destructive"
                      )}
                    >
                      {phase.name}
                    </h4>
                    {result && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result?.message || phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
