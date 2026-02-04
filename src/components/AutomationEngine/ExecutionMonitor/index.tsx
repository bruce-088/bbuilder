import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  RefreshCw, 
  BarChart3,
  Clock,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useExecutionMonitor, ExecutionLog } from "@/hooks/useExecutionMonitor";
import { ExecutionStats } from "./ExecutionStats";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { WorkflowStatsChart } from "./WorkflowStatsChart";
import { ErrorDrilldown } from "./ErrorDrilldown";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ExecutionMonitorProps {
  workflowId?: string;
  className?: string;
}

export function ExecutionMonitor({ workflowId, className }: ExecutionMonitorProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeline");

  const {
    executions,
    stats,
    isLoading,
    refresh,
    getAggregateStats,
    getRecentErrors,
  } = useExecutionMonitor({
    workflowId,
    limit: 100,
    pollingInterval: 15000, // 15 seconds for more responsiveness
  });

  const aggregateStats = getAggregateStats();
  const recentErrors = getRecentErrors();

  const handleChatWithMya = (error: ExecutionLog) => {
    // Get the context stored by ErrorDrilldown
    const contextData = sessionStorage.getItem("mya_error_context");
    if (contextData) {
      const context = JSON.parse(contextData);
      // Navigate to chat with pre-filled message
      navigate(`/chat?autoSend=true&message=${encodeURIComponent(context.contextMessage)}`);
    } else {
      navigate("/chat");
    }
  };

  const handleSelectExecution = (execution: ExecutionLog) => {
    // Could open a detailed modal or navigate to execution details
    console.log("Selected execution:", execution);
  };

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Execution Monitor</CardTitle>
            {aggregateStats.runningCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                {aggregateStats.runningCount} running
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <ExecutionStats
          totalExecutions={aggregateStats.totalExecutions}
          totalSuccess={aggregateStats.totalSuccess}
          totalErrors={aggregateStats.totalErrors}
          avgSuccessRate={aggregateStats.avgSuccessRate}
          runningCount={aggregateStats.runningCount}
          workflowCount={aggregateStats.workflowCount}
        />

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Errors
              {recentErrors.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-destructive text-destructive-foreground">
                  {recentErrors.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            {isLoading && executions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ExecutionTimeline
                executions={executions}
                onSelectExecution={handleSelectExecution}
              />
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <WorkflowStatsChart stats={stats} />
          </TabsContent>

          <TabsContent value="errors" className="mt-4">
            <ErrorDrilldown
              errors={recentErrors}
              onChatWithMya={handleChatWithMya}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export { ExecutionStats } from "./ExecutionStats";
export { ExecutionTimeline } from "./ExecutionTimeline";
export { WorkflowStatsChart } from "./WorkflowStatsChart";
export { ErrorDrilldown } from "./ErrorDrilldown";
