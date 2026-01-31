import { useMemo, useState } from "react";
import { 
  Globe, 
  Clock, 
  MousePointer, 
  Camera, 
  Download,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Minus
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BrowserAction, ActionResult, AutomationStatus } from "@/hooks/useBrowserbaseAutomation";

interface BrowserbaseExecutionPanelProps {
  actions: BrowserAction[];
  executionResults: ActionResult[];
  currentActionIndex: number;
  status: AutomationStatus;
  isRunning: boolean;
  debugUrl?: string | null;
  finalScreenshot?: string;
  totalExecutionTime?: number;
  onViewScreenshot?: (screenshot: string) => void;
}

// Action type to icon mapping
function getActionIcon(type: BrowserAction["type"]) {
  switch (type) {
    case "navigate":
      return Globe;
    case "wait":
      return Clock;
    case "act":
      return MousePointer;
    case "screenshot":
      return Camera;
    case "extract":
      return Download;
    default:
      return Circle;
  }
}

// Action type to label mapping
function getActionLabel(action: BrowserAction): string {
  switch (action.type) {
    case "navigate":
      const url = action.url || "";
      const displayUrl = url.length > 50 ? url.substring(0, 50) + "..." : url;
      return `Navigate to ${displayUrl}`;
    case "wait":
      if (action.timeout) {
        return `Wait ${action.timeout}ms`;
      }
      const selector = action.selector || "";
      const displaySelector = selector.length > 30 ? selector.substring(0, 30) + "..." : selector;
      return `Wait for ${displaySelector}`;
    case "act":
      const instruction = action.instruction || "Execute action";
      return instruction.length > 60 ? instruction.substring(0, 60) + "..." : instruction;
    case "screenshot":
      return "Capture screenshot";
    case "extract":
      return "Extract data from page";
    default:
      return action.type;
  }
}

// Status styling configuration
const statusConfig = {
  pending: {
    icon: Circle,
    iconClass: "text-muted-foreground/50",
    textClass: "text-muted-foreground",
    bgClass: "",
    borderClass: "border-transparent",
  },
  running: {
    icon: Loader2,
    iconClass: "text-primary animate-spin",
    textClass: "text-foreground",
    bgClass: "bg-primary/5",
    borderClass: "border-primary/30 animate-pulse",
  },
  completed: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    textClass: "text-foreground",
    bgClass: "",
    borderClass: "border-transparent",
  },
  failed: {
    icon: XCircle,
    iconClass: "text-destructive",
    textClass: "text-destructive",
    bgClass: "bg-destructive/5",
    borderClass: "border-destructive/30",
  },
  skipped: {
    icon: Minus,
    iconClass: "text-muted-foreground/50",
    textClass: "text-muted-foreground line-through",
    bgClass: "",
    borderClass: "border-transparent",
  },
};

type ActionStatus = "pending" | "running" | "completed" | "failed" | "skipped";

function getActionStatus(
  index: number,
  currentActionIndex: number,
  executionResults: ActionResult[],
  isRunning: boolean
): ActionStatus {
  const result = executionResults[index];
  
  if (result) {
    return result.status as ActionStatus;
  }
  
  if (isRunning && index === currentActionIndex) {
    return "running";
  }
  
  return "pending";
}

interface ActionCardProps {
  action: BrowserAction;
  result?: ActionResult;
  index: number;
  status: ActionStatus;
  onViewScreenshot?: (screenshot: string) => void;
}

function ActionCard({ action, result, index, status, onViewScreenshot }: ActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const ActionIcon = getActionIcon(action.type);
  
  const hasDetails = result?.error || result?.selectorUsed || result?.screenshot;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          "border rounded-lg transition-all duration-200",
          config.bgClass,
          config.borderClass
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
            disabled={!hasDetails}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <StatusIcon className={cn("h-4 w-4", config.iconClass)} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <ActionIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className={cn("text-sm font-medium truncate", config.textClass)}>
                  {getActionLabel(action)}
                </span>
              </div>
              
              {/* Timing badge */}
              {result?.executionTimeMs && (
                <span className="text-[10px] text-muted-foreground">
                  {result.executionTimeMs < 1000 
                    ? `${result.executionTimeMs}ms` 
                    : `${(result.executionTimeMs / 1000).toFixed(1)}s`
                  }
                </span>
              )}
              
              {/* Error preview */}
              {status === "failed" && result?.error && (
                <p className="text-xs text-destructive/80 line-clamp-1">
                  {result.error}
                </p>
              )}
            </div>
            
            {/* Expand/screenshot indicators */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {result?.screenshot && (
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {hasDetails && (
                isExpanded 
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/50 mt-1">
            {/* Error details */}
            {result?.error && (
              <div className="bg-destructive/10 rounded-md p-2 mt-2">
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Error Details
                </p>
                <p className="text-xs text-destructive/80 mt-1 break-words">
                  {result.error}
                </p>
              </div>
            )}
            
            {/* Selector debugging info */}
            {result?.selectorUsed && (
              <div className="bg-muted/50 rounded-md p-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Selector Used
                </p>
                <code className="text-xs text-foreground/80 break-all">
                  {result.selectorUsed}
                </code>
                {result.fallbacksAttempted && result.fallbacksAttempted > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {result.fallbacksAttempted} fallbacks attempted
                  </p>
                )}
              </div>
            )}
            
            {/* Screenshot preview */}
            {result?.screenshot && onViewScreenshot && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewScreenshot(result.screenshot!);
                }}
              >
                <Eye className="h-3 w-3 mr-1.5" />
                View Screenshot
              </Button>
            )}
            
            {/* Timing breakdown */}
            {result?.startTime && result?.endTime && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Started: {new Date(result.startTime).toLocaleTimeString()}</span>
                <span>Ended: {new Date(result.endTime).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function BrowserbaseExecutionPanel({
  actions,
  executionResults,
  currentActionIndex,
  status,
  isRunning,
  debugUrl,
  finalScreenshot,
  totalExecutionTime,
  onViewScreenshot,
}: BrowserbaseExecutionPanelProps) {
  const [showScreenshot, setShowScreenshot] = useState<string | null>(null);
  
  const handleViewScreenshot = (screenshot: string) => {
    if (onViewScreenshot) {
      onViewScreenshot(screenshot);
    } else {
      setShowScreenshot(screenshot);
    }
  };
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const completed = executionResults.filter(r => r.status === "completed").length;
    const failed = executionResults.filter(r => r.status === "failed").length;
    const skipped = executionResults.filter(r => r.status === "skipped").length;
    const total = actions.length;
    const progress = total > 0 ? (executionResults.length / total) * 100 : 0;
    
    return { completed, failed, skipped, total, progress };
  }, [actions, executionResults]);
  
  // No actions state
  if (actions.length === 0 && !isRunning) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Circle className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No actions planned</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Start an automation to see detailed execution breakdown
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-primary" />
              Browserbase Execution Details
            </CardTitle>
            {debugUrl && (
              <a
                href={debugUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                Watch Live
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          
          {/* Progress Summary */}
          <div className="space-y-2 mt-3">
            <Progress value={stats.progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {executionResults.length}/{stats.total} actions 
                {stats.completed > 0 && (
                  <span className="text-emerald-500 ml-1">• {stats.completed} completed</span>
                )}
                {stats.failed > 0 && (
                  <span className="text-destructive ml-1">• {stats.failed} failed</span>
                )}
              </span>
              {totalExecutionTime && (
                <span>{(totalExecutionTime / 1000).toFixed(1)}s elapsed</span>
              )}
            </div>
          </div>
          
          {/* Error summary banner */}
          {stats.failed > 0 && !isRunning && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 mt-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">
                {stats.failed} action{stats.failed > 1 ? "s" : ""} failed. 
                Expand failed items for details.
              </p>
            </div>
          )}
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-4">
          <ScrollArea className="max-h-[400px] pr-2">
            <div className="space-y-2">
              {actions.map((action, index) => {
                const actionStatus = getActionStatus(
                  index, 
                  currentActionIndex, 
                  executionResults, 
                  isRunning
                );
                const result = executionResults[index];
                
                return (
                  <ActionCard
                    key={index}
                    action={action}
                    result={result}
                    index={index}
                    status={actionStatus}
                    onViewScreenshot={handleViewScreenshot}
                  />
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Final Screenshot Section */}
          {finalScreenshot && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Final Screenshot
              </p>
              <button
                onClick={() => handleViewScreenshot(finalScreenshot)}
                className="w-full relative group overflow-hidden rounded-lg border hover:border-primary/50 transition-colors"
              >
                <img
                  src={`data:image/png;base64,${finalScreenshot}`}
                  alt="Final automation state"
                  className="w-full h-40 object-cover object-top"
                />
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-foreground text-sm flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    View Full Size
                  </span>
                </div>
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Screenshot Dialog (if no external handler) */}
      {!onViewScreenshot && (
        <Dialog open={!!showScreenshot} onOpenChange={() => setShowScreenshot(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Automation Screenshot</DialogTitle>
            </DialogHeader>
            {showScreenshot && (
              <div className="relative">
                <img
                  src={`data:image/png;base64,${showScreenshot}`}
                  alt="Automation screenshot"
                  className="w-full rounded-lg border"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
