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
  authPersisted?: boolean;
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
  contextId?: string;
  debugUrl?: string;
  connectUrl?: string;
  status?: string;
  actions?: BrowserAction[];
  message?: string;
  error?: string;
  credentialsConfigured?: boolean;
  authPersisted?: boolean;
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

interface ContextResponse {
  success: boolean;
  contextId?: string;
  exists?: boolean;
  message?: string;
  error?: string;
}

// Helper to get context key for localStorage
function getContextStorageKey(n8nUrl: string): string {
  // Normalize URL to create a consistent key
  const normalized = n8nUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `browserbase_context_${normalized}`;
}

export function useBrowserbaseAutomation() {
  const [status, setStatus] = useState<AutomationStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [authPersisted, setAuthPersisted] = useState<boolean>(false);
  
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

  // Create a new persistent context
  const createContext = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke<ContextResponse>(
        "browserbase-automation",
        {
          body: { action: "create-context" },
        }
      );

      if (fnError || !data?.success) {
        console.error("Failed to create context:", fnError || data?.error);
        return null;
      }

      return data.contextId || null;
    } catch (err) {
      console.error("Context creation failed:", err);
      return null;
    }
  }, []);

  // Verify an existing context is still valid
  const verifyContext = useCallback(async (ctxId: string): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke<ContextResponse>(
        "browserbase-automation",
        {
          body: { action: "get-context", contextId: ctxId },
        }
      );

      if (fnError) {
        console.error("Context verification error:", fnError);
        return false;
      }

      return data?.exists === true;
    } catch (err) {
      console.error("Context verification failed:", err);
      return false;
    }
  }, []);

  // Get or create a context for a specific n8n instance
  const getOrCreateContext = useCallback(async (n8nUrl: string): Promise<string | null> => {
    const storageKey = getContextStorageKey(n8nUrl);
    const storedContextId = localStorage.getItem(storageKey);

    // Check if we have a stored context and verify it's still valid
    if (storedContextId) {
      const isValid = await verifyContext(storedContextId);
      if (isValid) {
        console.log(`Using existing context for ${n8nUrl}: ${storedContextId}`);
        return storedContextId;
      } else {
        // Context expired or deleted, remove from storage
        localStorage.removeItem(storageKey);
      }
    }

    // Create a new context
    const newContextId = await createContext();
    if (newContextId) {
      localStorage.setItem(storageKey, newContextId);
      console.log(`Created new context for ${n8nUrl}: ${newContextId}`);
      toast.success("Created persistent auth context for n8n");
    }

    return newContextId;
  }, [createContext, verifyContext]);

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
    setAuthPersisted(false);

    try {
      // Get or create a persistent context for this n8n instance
      const ctxId = await getOrCreateContext(params.n8nInstanceUrl);
      setContextId(ctxId);

      const { data, error: fnError } = await supabase.functions.invoke<StartResponse>(
        "browserbase-automation",
        {
          body: {
            action: "start",
            fixPrompt: params.fixPrompt,
            n8nInstanceUrl: params.n8nInstanceUrl,
            workflowId: params.workflowId,
            workflowName: params.workflowName,
            contextId: ctxId, // Include context for auth persistence
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
      setAuthPersisted(!!data.authPersisted);

      // Update context ID if returned from server
      if (data.contextId) {
        setContextId(data.contextId);
        const storageKey = getContextStorageKey(params.n8nInstanceUrl);
        localStorage.setItem(storageKey, data.contextId);
      }

      setResult({
        sessionId: data.sessionId!,
        status: "running",
        totalActions: data.actions?.length || 0,
        startedAt: new Date().toISOString(),
        authPersisted: !!data.authPersisted,
      });

      // Start polling for status
      startPolling(data.sessionId!);

      const authMessage = data.authPersisted 
        ? "Automation started with persistent auth! Click 'Watch Live' to see it."
        : "Automation started! Click 'Watch Live' to see it. Log in once to persist auth.";
      toast.success(authMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setStatus("failed");
      toast.error(errorMessage);
    }
  }, [startPolling, getOrCreateContext]);

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
    setContextId(null);
    setAuthPersisted(false);
  }, []);

  // Clear the stored context for a specific n8n instance (useful if user wants to re-login)
  const clearStoredContext = useCallback((n8nUrl: string) => {
    const storageKey = getContextStorageKey(n8nUrl);
    localStorage.removeItem(storageKey);
    setContextId(null);
    setAuthPersisted(false);
    toast.info("Auth context cleared. You'll need to log in again on next run.");
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
    contextId,
    authPersisted,
    
    // Computed
    isRunning: status === "running" || status === "starting",
    isIdle: status === "idle",
    
    // Actions
    startAutomation,
    stopAutomation,
    checkStatus: sessionId ? () => checkStatus(sessionId) : undefined,
    reset,
    clearStoredContext,
    getOrCreateContext,
  };
}
