import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ExecutionLog {
  id: string;
  workflow_id: string;
  workflow_name: string;
  execution_id: string;
  status: "running" | "success" | "error" | "waiting";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  error_node: string | null;
  trigger_type: string | null;
  node_execution_count: number;
  retry_count: number;
  execution_data: Record<string, unknown>;
}

export interface WorkflowStats {
  id: string;
  workflow_id: string;
  workflow_name: string;
  total_executions: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_execution_at: string | null;
  last_status: string | null;
  success_rate: number;
}

interface UseExecutionMonitorOptions {
  workflowId?: string;
  limit?: number;
  pollingInterval?: number;
}

export function useExecutionMonitor(options: UseExecutionMonitorOptions = {}) {
  const { workflowId, limit = 50, pollingInterval = 30000 } = options;
  const { user } = useAuth();

  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [stats, setStats] = useState<WorkflowStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch execution logs
  const fetchExecutions = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("n8n_execution_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setExecutions((data as ExecutionLog[]) || []);
    } catch (err) {
      console.error("Error fetching executions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch executions");
    }
  }, [user, workflowId, limit]);

  // Fetch workflow stats
  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("n8n_workflow_stats")
        .select("*")
        .order("last_execution_at", { ascending: false });

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setStats((data as WorkflowStats[]) || []);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [user, workflowId]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchExecutions(), fetchStats()]);
    setIsLoading(false);
  }, [fetchExecutions, fetchStats]);

  // Log a new execution
  const logExecution = useCallback(
    async (execution: Omit<ExecutionLog, "id">) => {
      if (!user) return null;

      try {
        const insertData = {
          workflow_id: execution.workflow_id,
          workflow_name: execution.workflow_name,
          execution_id: execution.execution_id,
          status: execution.status,
          started_at: execution.started_at,
          finished_at: execution.finished_at,
          duration_ms: execution.duration_ms,
          error_message: execution.error_message,
          error_node: execution.error_node,
          trigger_type: execution.trigger_type,
          node_execution_count: execution.node_execution_count,
          retry_count: execution.retry_count,
          execution_data: execution.execution_data as Record<string, unknown>,
        };

        const { data, error: insertError } = await supabase
          .from("n8n_execution_logs")
          .insert(insertData as never)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        return data;
      } catch (err) {
        console.error("Error logging execution:", err);
        return null;
      }
    },
    [user]
  );

  // Update an execution status
  const updateExecution = useCallback(
    async (
      executionId: string,
      updates: Partial<Pick<ExecutionLog, "status" | "finished_at" | "duration_ms" | "error_message" | "error_node">>
    ) => {
      if (!user) return null;

      try {
        const { data, error: updateError } = await supabase
          .from("n8n_execution_logs")
          .update(updates)
          .eq("execution_id", executionId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return data;
      } catch (err) {
        console.error("Error updating execution:", err);
        return null;
      }
    },
    [user]
  );

  // Get aggregate statistics
  const getAggregateStats = useCallback(() => {
    const totalExecutions = stats.reduce((sum, s) => sum + s.total_executions, 0);
    const totalSuccess = stats.reduce((sum, s) => sum + s.success_count, 0);
    const totalErrors = stats.reduce((sum, s) => sum + s.error_count, 0);
    const avgSuccessRate = stats.length > 0
      ? stats.reduce((sum, s) => sum + Number(s.success_rate), 0) / stats.length
      : 0;

    const runningCount = executions.filter((e) => e.status === "running").length;

    return {
      totalExecutions,
      totalSuccess,
      totalErrors,
      avgSuccessRate,
      runningCount,
      workflowCount: stats.length,
    };
  }, [stats, executions]);

  // Get recent errors
  const getRecentErrors = useCallback(() => {
    return executions
      .filter((e) => e.status === "error")
      .slice(0, 10);
  }, [executions]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel("n8n-execution-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "n8n_execution_logs",
        },
        (payload) => {
          console.log("Execution log update:", payload.eventType);

          if (payload.eventType === "INSERT") {
            const newExecution = payload.new as ExecutionLog;
            if (!workflowId || newExecution.workflow_id === workflowId) {
              setExecutions((prev) => [newExecution, ...prev].slice(0, limit));
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedExecution = payload.new as ExecutionLog;
            setExecutions((prev) =>
              prev.map((e) =>
                e.execution_id === updatedExecution.execution_id ? updatedExecution : e
              )
            );
          }

          // Refresh stats on any change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, workflowId, limit, fetchStats]);

  // Initial load and polling
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    refresh();

    const intervalId = setInterval(refresh, pollingInterval);

    return () => clearInterval(intervalId);
  }, [user, refresh, pollingInterval]);

  return {
    executions,
    stats,
    isLoading,
    error,
    refresh,
    logExecution,
    updateExecution,
    getAggregateStats,
    getRecentErrors,
  };
}
