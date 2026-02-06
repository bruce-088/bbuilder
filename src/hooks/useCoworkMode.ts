import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrowserbaseAutomation, BrowserAction, ActionResult } from "./useBrowserbaseAutomation";
import { useUserPreferences } from "./useUserPreferences";
import { toast } from "sonner";

export type CoworkStatus = "idle" | "interpreting" | "executing" | "completed" | "failed";

export interface CoworkAction {
  action: BrowserAction;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

export interface CoworkExecution {
  id: string;
  userMessage: string;
  narration: string;
  summary: string;
  actions: CoworkAction[];
  status: CoworkStatus;
  debugUrl?: string;
  screenshots: string[];
  startedAt: string;
  completedAt?: string;
}

export function useCoworkMode() {
  const [isActive, setIsActive] = useState(false);
  const [coworkStatus, setCoworkStatus] = useState<CoworkStatus>("idle");
  const [currentExecution, setCurrentExecution] = useState<CoworkExecution | null>(null);
  const [executionHistory, setExecutionHistory] = useState<CoworkExecution[]>([]);
  const executionIdRef = useRef(0);

  const browserbase = useBrowserbaseAutomation();
  const { preferences } = useUserPreferences();

  const n8nInstanceUrl = preferences?.n8n_instance_url || "";

  const toggleCoworkMode = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      if (!next) {
        // Deactivating — reset
        setCoworkStatus("idle");
        setCurrentExecution(null);
        if (browserbase.isRunning) {
          browserbase.stopAutomation();
        }
      }
      return next;
    });
  }, [browserbase]);

  const interpretMessage = useCallback(
    async (
      message: string,
      conversationHistory?: Array<{ role: string; content: string }>,
      n8nContext?: { workflowName?: string; workflowId?: string; nodes?: Array<{ name: string; type: string }> }
    ): Promise<{
      actions: BrowserAction[];
      narration: string;
      summary: string;
    } | null> => {
      try {
        const { data, error } = await supabase.functions.invoke("cowork-interpret", {
          body: {
            message,
            n8nInstanceUrl,
            n8nContext,
            conversationHistory: conversationHistory?.slice(-6),
          },
        });

        if (error) {
          console.error("Cowork interpret error:", error);
          return null;
        }

        return data as { actions: BrowserAction[]; narration: string; summary: string };
      } catch (err) {
        console.error("Cowork interpret failed:", err);
        return null;
      }
    },
    [n8nInstanceUrl]
  );

  const executeCoworkMessage = useCallback(
    async (
      message: string,
      conversationHistory?: Array<{ role: string; content: string }>,
      n8nContext?: { workflowName?: string; workflowId?: string; nodes?: Array<{ name: string; type: string }> }
    ): Promise<CoworkExecution | null> => {
      if (!n8nInstanceUrl) {
        toast.error("Please configure your n8n instance URL in settings first.");
        return null;
      }

      const execId = `cowork-${++executionIdRef.current}`;
      setCoworkStatus("interpreting");

      const execution: CoworkExecution = {
        id: execId,
        userMessage: message,
        narration: "Let me figure out what to do...",
        summary: "",
        actions: [],
        status: "interpreting",
        screenshots: [],
        startedAt: new Date().toISOString(),
      };
      setCurrentExecution(execution);

      // Step 1: Interpret the message into browser actions
      const interpreted = await interpretMessage(message, conversationHistory, n8nContext);

      if (!interpreted || interpreted.actions.length === 0) {
        const failedExec: CoworkExecution = {
          ...execution,
          narration: interpreted?.narration || "I couldn't figure out how to do that in n8n. Could you try rephrasing?",
          summary: interpreted?.summary || "Could not interpret",
          status: "failed",
          completedAt: new Date().toISOString(),
        };
        setCurrentExecution(failedExec);
        setCoworkStatus("failed");
        setExecutionHistory((prev) => [...prev, failedExec]);
        return failedExec;
      }

      // Step 2: Set up the execution with actions
      const coworkActions: CoworkAction[] = interpreted.actions.map((a) => ({
        action: a,
        status: "pending" as const,
      }));

      const executingExec: CoworkExecution = {
        ...execution,
        narration: interpreted.narration,
        summary: interpreted.summary,
        actions: coworkActions,
        status: "executing",
      };
      setCurrentExecution(executingExec);
      setCoworkStatus("executing");

      // Step 3: Start the Browserbase automation
      try {
        // Build a combined fixPrompt from the actions for the automation engine
        const fixPrompt = interpreted.actions
          .map((a, i) => {
            if (a.type === "navigate") return `Step ${i + 1}: Navigate to ${a.url}`;
            if (a.type === "act") return `Step ${i + 1}: ${a.instruction}`;
            if (a.type === "wait") return `Step ${i + 1}: Wait ${a.timeout || 2000}ms`;
            if (a.type === "screenshot") return `Step ${i + 1}: Take a screenshot`;
            if (a.type === "extract") return `Step ${i + 1}: Extract: ${a.instruction}`;
            return `Step ${i + 1}: ${a.type}`;
          })
          .join("\n");

        await browserbase.startAutomation({
          fixPrompt,
          n8nInstanceUrl,
        });

        // Update execution with debug URL
        const updatedExec: CoworkExecution = {
          ...executingExec,
          debugUrl: browserbase.debugUrl || undefined,
        };
        setCurrentExecution(updatedExec);

        return updatedExec;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Automation failed";
        const failedExec: CoworkExecution = {
          ...executingExec,
          status: "failed",
          completedAt: new Date().toISOString(),
        };
        setCurrentExecution(failedExec);
        setCoworkStatus("failed");
        setExecutionHistory((prev) => [...prev, failedExec]);
        toast.error(errorMsg);
        return failedExec;
      }
    },
    [n8nInstanceUrl, interpretMessage, browserbase]
  );

  // Sync browserbase status changes back to cowork execution
  const syncBrowserbaseStatus = useCallback(() => {
    if (!currentExecution) return;

    const updatedActions = currentExecution.actions.map((ca, i) => {
      if (i < browserbase.currentActionIndex) {
        const result = browserbase.executionResults[i];
        return {
          ...ca,
          status: (result?.status || "completed") as CoworkAction["status"],
          error: result?.error,
        };
      }
      if (i === browserbase.currentActionIndex && browserbase.isExecuting) {
        return { ...ca, status: "running" as const };
      }
      return ca;
    });

    const screenshots = browserbase.executionResults
      .filter((r) => r.screenshot)
      .map((r) => r.screenshot!);

    let newStatus: CoworkStatus = "executing";
    if (browserbase.status === "completed") newStatus = "completed";
    else if (browserbase.status === "failed" || browserbase.status === "auth_expired") newStatus = "failed";

    setCurrentExecution((prev) =>
      prev
        ? {
            ...prev,
            actions: updatedActions,
            screenshots,
            status: newStatus,
            debugUrl: browserbase.debugUrl || prev.debugUrl,
            completedAt: newStatus === "completed" || newStatus === "failed" ? new Date().toISOString() : undefined,
          }
        : null
    );

    if (newStatus === "completed" || newStatus === "failed") {
      setCoworkStatus(newStatus);
      setExecutionHistory((prev) => [
        ...prev,
        {
          ...currentExecution,
          actions: updatedActions,
          screenshots,
          status: newStatus,
          debugUrl: browserbase.debugUrl || currentExecution.debugUrl,
          completedAt: new Date().toISOString(),
        },
      ]);
    }
  }, [currentExecution, browserbase]);

  return {
    // State
    isActive,
    coworkStatus,
    currentExecution,
    executionHistory,
    n8nInstanceUrl,
    debugUrl: browserbase.debugUrl,
    isRunning: browserbase.isRunning,

    // Browserbase passthrough
    browserbaseStatus: browserbase.status,
    currentActionIndex: browserbase.currentActionIndex,
    executionResults: browserbase.executionResults,

    // Actions
    toggleCoworkMode,
    executeCoworkMessage,
    syncBrowserbaseStatus,
    reset: () => {
      setCoworkStatus("idle");
      setCurrentExecution(null);
      browserbase.reset();
    },
  };
}
