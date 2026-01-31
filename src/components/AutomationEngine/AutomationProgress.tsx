import { CheckCircle2, Circle, Loader2, AlertTriangle, XCircle, Sparkles, Bot, Brain, Search, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PhaseResult, AutomationPhase } from "@/hooks/useAutomationRun";

interface AutomationProgressProps {
  phases: AutomationPhase[];
  currentPhase: string | null;
  phaseResults: PhaseResult[];
  isRunning: boolean;
  activeProvider?: string;
}

const providerConfig: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  lovable: { name: "Lovable AI", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" },
  openai: { name: "OpenAI", icon: Bot, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  claude: { name: "Claude", icon: Brain, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  perplexity: { name: "Perplexity", icon: Search, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  gemini: { name: "Gemini", icon: Gem, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

export function AutomationProgress({
  phases,
  currentPhase,
  phaseResults,
  isRunning,
  activeProvider = "lovable",
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

  const provider = providerConfig[activeProvider] || providerConfig.lovable;
  const ProviderIcon = provider.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Automation Progress</h3>
        
        {/* Active Provider Indicator */}
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 font-medium",
            provider.color,
            isRunning && "animate-pulse"
          )}
        >
          <ProviderIcon className="h-3.5 w-3.5" />
          <span className="text-xs">{provider.name}</span>
          {isRunning && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
            </span>
          )}
        </Badge>
      </div>
      
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
