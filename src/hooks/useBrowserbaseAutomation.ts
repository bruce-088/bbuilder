import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AutomationStatus = "idle" | "starting" | "running" | "completed" | "failed" | "stopped";

export interface BrowserAction {
  type: "navigate" | "wait" | "act" | "screenshot" | "extract";
  url?: string;
  selector?: string;
  instruction?: string;
  timeout?: number;
}

export interface AutomationResult {
  sessionId: string;
  status: AutomationStatus;
  actionsCompleted?: number;
  totalActions?: number;
  screenshots?: string[];
  errors?: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface AutomationParams {
  fixPrompt: string;
  n8nInstanceUrl: string;
  workflowId?: string;
  workflowName?: string;
}

interface StartResponse {
  success: boolean;
  sessionId?: string;
  debugUrl?: string;
  connectUrl?: string;
  status?: string;
  actions?: BrowserAction[];
  message?: string;
  error?: string;
  credentialsConfigured?: boolean;
}

interface StatusResponse {
  success: boolean;
  sessionId?: string;
  debugUrl?: string;
  status?: string;
  browserbaseStatus?: string;
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

export function useBrowserbaseAutomation() {
  const [status, setStatus] = useState<AutomationStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const checkStatus = useCallback(async (sid: string): Promise<StatusResponse | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke<StatusResponse>(
        "browserbase-automation",
        {
          body: {
            action: "status",
            sessionId: sid,
          },
        }
      );

      if (fnError) {
        console.error("Status check error:", fnError);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Status check failed:", err);
      return null;
    }
  }, []);

  const startPolling = useCallback((sid: string) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    sessionIdRef.current = sid;

    pollingRef.current = setInterval(async () => {
      if (!sessionIdRef.current) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }

      const statusData = await checkStatus(sessionIdRef.current);
      
      if (statusData) {
        const newStatus = statusData.status as AutomationStatus;
        
        if (newStatus === "completed" || newStatus === "failed") {
          setStatus(newStatus);
          setResult((prev) => ({
            ...prev!,
            status: newStatus,
            completedAt: statusData.endedAt || new Date().toISOString(),
          }));

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          if (newStatus === "completed") {
            toast.success("Automation completed successfully!");
          } else {
            toast.error("Automation failed. Check the live session for details.");
          }
        }
      }
    }, 5000); // Poll every 5 seconds
  }, [checkStatus]);

  const startAutomation = useCallback(async (params: AutomationParams): Promise<void> => {
    setStatus("starting");
    setError(null);
    setResult(null);
    setSessionId(null);
    setDebugUrl(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<StartResponse>(
        "browserbase-automation",
        {
          body: {
            action: "start",
            fixPrompt: params.fixPrompt,
            n8nInstanceUrl: params.n8nInstanceUrl,
            workflowId: params.workflowId,
            workflowName: params.workflowName,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to start automation");
      }

      if (!data?.success) {
        if (data?.credentialsConfigured === false) {
          setCredentialsConfigured(false);
          throw new Error("Browserbase credentials not configured. Please add your API key and Project ID in settings.");
        }
        throw new Error(data?.error || "Failed to start automation");
      }

      setCredentialsConfigured(true);
      setSessionId(data.sessionId!);
      setDebugUrl(data.debugUrl!);
      setActions(data.actions || []);
      setStatus("running");

      setResult({
        sessionId: data.sessionId!,
        status: "running",
        totalActions: data.actions?.length || 0,
        startedAt: new Date().toISOString(),
      });

      // Start polling for status
      startPolling(data.sessionId!);

      toast.success("Automation started! Click 'Watch Live' to see it in action.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setStatus("failed");
      toast.error(errorMessage);
    }
  }, [startPolling]);

  const stopAutomation = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      toast.error("No active session to stop");
      return;
    }

    try {
      // Stop polling first
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      sessionIdRef.current = null;

      const { data, error: fnError } = await supabase.functions.invoke(
        "browserbase-automation",
        {
          body: {
            action: "stop",
            sessionId,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to stop automation");
      }

      setStatus("stopped");
      setResult((prev) => prev ? { ...prev, status: "stopped" } : null);
      toast.info("Automation stopped");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to stop automation";
      toast.error(errorMessage);
    }
  }, [sessionId]);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    sessionIdRef.current = null;
    setStatus("idle");
    setSessionId(null);
    setDebugUrl(null);
    setResult(null);
    setError(null);
    setActions([]);
  }, []);

  return {
    // State
    status,
    sessionId,
    debugUrl,
    result,
    error,
    actions,
    credentialsConfigured,
    
    // Computed
    isRunning: status === "running" || status === "starting",
    isIdle: status === "idle",
    
    // Actions
    startAutomation,
    stopAutomation,
    checkStatus: sessionId ? () => checkStatus(sessionId) : undefined,
    reset,
  };
}
