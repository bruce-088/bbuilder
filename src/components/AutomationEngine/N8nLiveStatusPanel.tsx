import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Activity, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Bell,
  Loader2,
  BarChart3
} from "lucide-react";
import { useN8nLiveStatus, WorkflowChange } from "@/hooks/useN8nLiveStatus";
import { WorkflowHealthCard } from "./WorkflowHealthCard";
import { ExecutionMonitor } from "./ExecutionMonitor";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { openExternalUrl } from "@/lib/openExternalUrl";

interface N8nLiveStatusPanelProps {
  pollingInterval?: number;
  onTestWorkflow?: (workflowId: string) => void;
  className?: string;
  showExecutionMonitor?: boolean;
}

export function N8nLiveStatusPanel({
  pollingInterval = 30000,
  onTestWorkflow,
  className,
  showExecutionMonitor = true,
}: N8nLiveStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showChanges, setShowChanges] = useState(false);
  const [testingWorkflowId, setTestingWorkflowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workflows" | "executions">("workflows");
  const {
    workflows,
    lastChecked,
    isPolling,
    changes,
    webhookHealth,
    refresh,
    clearChanges,
    getWorkflowUrl,
  } = useN8nLiveStatus({
    pollingInterval,
    enabled: true,
    onChangesDetected: (newChanges) => {
      if (newChanges.length > 0) {
        setShowChanges(true);
      }
    },
  });

  const handleTestRun = async (workflowId: string) => {
    setTestingWorkflowId(workflowId);
    try {
      await onTestWorkflow?.(workflowId);
    } finally {
      setTestingWorkflowId(null);
    }
  };

  const handleOpenInN8n = (workflowId: string) => {
    const url = getWorkflowUrl(workflowId);
    if (url) openExternalUrl(url);
  };

  const activeCount = workflows.filter((w) => w.active).length;
  const changesCount = changes.length;

  if (workflows.length === 0) {
    return null;
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">n8n Live Status</CardTitle>
            {changesCount > 0 && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground border-accent">
                <Bell className="h-3 w-3 mr-1" />
                {changesCount} change{changesCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lastChecked && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(lastChecked, { addSuffix: true })}
              </span>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh()}
              disabled={isPolling}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isPolling && "animate-spin")} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{workflows.length}</strong> workflow{workflows.length !== 1 ? "s" : ""}
          </span>
          <span>
            <strong className="text-primary">{activeCount}</strong> active
          </span>
          {isPolling && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing...
            </span>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Change alerts */}
          {changesCount > 0 && (
            <Collapsible open={showChanges} onOpenChange={setShowChanges}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between bg-accent/50 border-accent hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    {changesCount} recent change{changesCount !== 1 ? "s" : ""} detected
                  </span>
                  {showChanges ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2 pl-4 border-l-2 border-accent">
                  {changes.slice(0, 5).map((change, index) => (
                    <ChangeItem key={index} change={change} />
                  ))}
                  {changesCount > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{changesCount - 5} more changes
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => clearChanges()}
                  >
                    Clear all
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Tabs for workflows and executions */}
          {showExecutionMonitor ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "workflows" | "executions")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="workflows" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Workflows ({workflows.length})
                </TabsTrigger>
                <TabsTrigger value="executions" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Executions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workflows" className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {workflows.map((workflow) => (
                    <WorkflowHealthCard
                      key={workflow.id}
                      workflow={workflow}
                      webhookHealth={webhookHealth}
                      onTestRun={handleTestRun}
                      onOpenInN8n={handleOpenInN8n}
                      isTestRunning={testingWorkflowId === workflow.id}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="executions" className="mt-4">
                <ExecutionMonitor />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {workflows.map((workflow) => (
                <WorkflowHealthCard
                  key={workflow.id}
                  workflow={workflow}
                  webhookHealth={webhookHealth}
                  onTestRun={handleTestRun}
                  onOpenInN8n={handleOpenInN8n}
                  isTestRunning={testingWorkflowId === workflow.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ChangeItem({ change }: { change: WorkflowChange }) {
  const typeConfig = {
    node_added: { icon: "➕", color: "text-primary" },
    node_removed: { icon: "➖", color: "text-destructive" },
    status_changed: { icon: "🔄", color: "text-accent-foreground" },
    config_changed: { icon: "⚙️", color: "text-muted-foreground" },
  };

  const config = typeConfig[change.type];

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={config.color}>{config.icon}</span>
      <div className="min-w-0">
        <p className="font-medium truncate">{change.workflowName}</p>
        <p className="text-xs text-muted-foreground">{change.details}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(change.timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
