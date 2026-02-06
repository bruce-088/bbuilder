import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NodeExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  status: string;
  input_data: unknown;
  output_data: unknown;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  trigger_data: unknown;
  started_at: string;
  completed_at: string | null;
}

export function useWorkflowExecution(workflowId?: string) {
  const [executing, setExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  const [nodeLogs, setNodeLogs] = useState<Map<string, NodeExecutionLog>>(new Map());

  // Subscribe to realtime execution log updates
  useEffect(() => {
    if (!currentExecution) return;

    const channel = supabase
      .channel(`exec-${currentExecution.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_execution_logs",
          filter: `execution_id=eq.${currentExecution.id}`,
        },
        (payload) => {
          const log = payload.new as NodeExecutionLog;
          setNodeLogs((prev) => {
            const next = new Map(prev);
            next.set(log.node_id, log);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentExecution?.id]);

  // Also subscribe to execution status changes
  useEffect(() => {
    if (!currentExecution) return;

    const channel = supabase
      .channel(`exec-status-${currentExecution.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflow_executions",
          filter: `id=eq.${currentExecution.id}`,
        },
        (payload) => {
          const updated = payload.new as WorkflowExecution;
          setCurrentExecution(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            setExecuting(false);
            if (updated.status === "completed") {
              toast.success("Workflow completed successfully");
            } else {
              toast.error("Workflow execution failed");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentExecution?.id]);

  const runWorkflow = useCallback(
    async (triggerData?: Record<string, unknown>) => {
      if (!workflowId || executing) return;
      setExecuting(true);
      setNodeLogs(new Map());
      setCurrentExecution(null);

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-executor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              workflow_id: workflowId,
              trigger_data: triggerData ?? {},
            }),
          }
        );

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Execution failed");

        // Load final logs
        const { data: logs } = await supabase
          .from("workflow_execution_logs")
          .select("*")
          .eq("execution_id", data.execution_id);

        if (logs) {
          const map = new Map<string, NodeExecutionLog>();
          for (const l of logs) map.set(l.node_id, l as unknown as NodeExecutionLog);
          setNodeLogs(map);
        }

        setCurrentExecution({
          id: data.execution_id,
          workflow_id: workflowId,
          status: data.status,
          trigger_data: triggerData ?? {},
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        if (data.status === "completed") {
          toast.success("Workflow completed successfully");
        } else {
          toast.error("Workflow execution failed");
        }
      } catch (e) {
        console.error("Run workflow error:", e);
        toast.error(e instanceof Error ? e.message : "Failed to run workflow");
      } finally {
        setExecuting(false);
      }
    },
    [workflowId, executing]
  );

  const getNodeStatus = useCallback(
    (nodeId: string) => nodeLogs.get(nodeId)?.status ?? "idle",
    [nodeLogs]
  );

  const getNodeLog = useCallback(
    (nodeId: string) => nodeLogs.get(nodeId) ?? null,
    [nodeLogs]
  );

  const clearExecution = useCallback(() => {
    setCurrentExecution(null);
    setNodeLogs(new Map());
  }, []);

  return {
    executing,
    currentExecution,
    nodeLogs,
    runWorkflow,
    getNodeStatus,
    getNodeLog,
    clearExecution,
  };
}
