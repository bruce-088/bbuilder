import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type AutomationStatus = "idle" | "starting" | "running" | "executing" | "completed" | "failed" | "stopped" | "auth_expired";

export interface BrowserAction {
  type: "navigate" | "wait" | "act" | "screenshot" | "extract";
  url?: string;
  selector?: string;
  instruction?: string;
  timeout?: number;
}

export interface ActionResult {
  action: BrowserAction;
  status: "completed" | "failed" | "skipped";
  screenshot?: string;
  extractedData?: unknown;
  error?: string;
  executionTimeMs?: number;
  // Enhanced tracking fields
  selectorUsed?: string;
  fallbacksAttempted?: number;
  startTime?: string;
  endTime?: string;
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
  executionResults?: ActionResult[];
  finalScreenshot?: string;
  executionTimeMs?: number;
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

interface ExecuteResponse {
  success: boolean;
  sessionId?: string;
  jobId?: string;
  status?: string;
  actionsExecuted?: ActionResult[];
  finalScreenshot?: string;
  executionTimeMs?: number;
  error?: string;
}

interface JobStatusResponse {
  success: boolean;
  job?: {
    id: string;
    sessionId: string;
    status: "pending" | "running" | "completed" | "failed" | "auth_expired";
    totalActions: number;
    completedActions: number;
    currentAction: string | null;
    results: ActionResult[];
    error: string | null;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
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
  const normalized = n8nUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `browserbase_context_${normalized}`;
}

export function useBrowserbaseAutomation() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AutomationStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [authPersisted, setAuthPersisted] = useState<boolean>(false);
  const [currentActionIndex, setCurrentActionIndex] = useState<number>(0);
  const [currentActionText, setCurrentActionText] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<ActionResult[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState<boolean>(false);
  const [lastAutomationParams, setLastAutomationParams] = useState<AutomationParams | null>(null);
  
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Clean up polling and realtime on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Subscribe to job updates via realtime
  const subscribeToJobUpdates = useCallback((jobId: string) => {
    // Clean up existing subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    console.log(`Subscribing to realtime updates for job ${jobId}`);

    const channel = supabase
      .channel(`automation-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'automation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Job update received:', payload.new);
          const job = payload.new as {
            id: string;
            status: string;
            completed_actions: number;
            total_actions: number;
            current_action: string | null;
            results: ActionResult[];
            error: string | null;
          };

          setCurrentActionIndex(job.completed_actions);
          setCurrentActionText(job.current_action);
          setExecutionResults(job.results || []);

          if (job.status === 'completed') {
            setStatus('completed');
            setAuthExpired(false);
            setResult((prev) => ({
              ...prev!,
              status: 'completed',
              actionsCompleted: job.completed_actions,
              executionResults: job.results,
              completedAt: new Date().toISOString(),
            }));
            toast.success(`Automation completed! ${job.completed_actions} actions executed.`);
            
            // Cleanup subscription
            if (realtimeChannelRef.current) {
              supabase.removeChannel(realtimeChannelRef.current);
              realtimeChannelRef.current = null;
            }
          } else if (job.status === 'auth_expired') {
            setStatus('auth_expired');
            setAuthExpired(true);
            setError('Your n8n session has expired. Please clear your saved login and re-authenticate.');
            setResult((prev) => ({
              ...prev!,
              status: 'auth_expired',
              actionsCompleted: job.completed_actions,
              executionResults: job.results,
              completedAt: new Date().toISOString(),
            }));
            toast.error('Session expired! Please re-authenticate to n8n.', {
              duration: 6000,
              action: {
                label: 'Clear & Retry',
                onClick: () => {
                  // Will be handled by UI
                },
              },
            });
            
            // Cleanup subscription
            if (realtimeChannelRef.current) {
              supabase.removeChannel(realtimeChannelRef.current);
              realtimeChannelRef.current = null;
            }
          } else if (job.status === 'failed') {
            setStatus('failed');
            setError(job.error || 'Automation failed');
            setResult((prev) => ({
              ...prev!,
              status: 'failed',
              actionsCompleted: job.completed_actions,
              executionResults: job.results,
              completedAt: new Date().toISOString(),
            }));
            toast.error(job.error || 'Automation failed');
            
            // Cleanup subscription
            if (realtimeChannelRef.current) {
              supabase.removeChannel(realtimeChannelRef.current);
              realtimeChannelRef.current = null;
            }
          } else if (job.status === 'running') {
            setStatus('executing');
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for job ${jobId}:`, status);
      });

    realtimeChannelRef.current = channel;
  }, []);

  // Fallback polling for job status
  const pollJobStatus = useCallback(async (jobId: string): Promise<void> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke<JobStatusResponse>(
        "browserbase-automation",
        {
          body: { action: "job-status", jobId },
        }
      );

      if (fnError || !data?.success || !data?.job) {
        console.error("Job status check failed:", fnError || data?.error);
        return;
      }

      const job = data.job;
      setCurrentActionIndex(job.completedActions);
      setCurrentActionText(job.currentAction);
      setExecutionResults(job.results || []);

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'auth_expired') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        if (job.status === 'auth_expired') {
          setStatus('auth_expired');
          setAuthExpired(true);
          setError('Your n8n session has expired. Please clear your saved login and re-authenticate.');
          setResult((prev) => ({
            ...prev!,
            status: 'auth_expired',
            actionsCompleted: job.completedActions,
            executionResults: job.results,
            completedAt: new Date().toISOString(),
          }));
          toast.error('Session expired! Please re-authenticate to n8n.');
        } else {
          const finalStatus: AutomationStatus = job.status === 'completed' ? 'completed' : 'failed';
          setStatus(finalStatus);
          setResult((prev) => ({
            ...prev!,
            status: finalStatus,
            actionsCompleted: job.completedActions,
            executionResults: job.results,
            completedAt: new Date().toISOString(),
          }));

          if (job.status === 'completed') {
            toast.success(`Automation completed! ${job.completedActions} actions executed.`);
          } else {
            setError(job.error || 'Automation failed');
            toast.error(job.error || 'Automation failed');
          }
        }
      }
    } catch (err) {
      console.error("Job polling failed:", err);
    }
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

    if (storedContextId) {
      const isValid = await verifyContext(storedContextId);
      if (isValid) {
        console.log(`Using existing context for ${n8nUrl}: ${storedContextId}`);
        return storedContextId;
      } else {
        localStorage.removeItem(storageKey);
      }
    }

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

  // Execute actions on the session with job-based tracking
  const executeActions = useCallback(async (
    sid: string, 
    wsUrl: string, 
    actionsToExecute: BrowserAction[]
  ): Promise<ExecuteResponse | null> => {
    try {
      console.log(`Executing ${actionsToExecute.length} actions on session ${sid}`);
      
      // Include userId for job-based async execution
      const { data, error: fnError } = await supabase.functions.invoke<ExecuteResponse>(
        "browserbase-automation",
        {
          body: {
            action: "execute",
            sessionId: sid,
            connectUrl: wsUrl,
            actions: actionsToExecute,
            userId: user?.id, // Enable async job tracking
          },
        }
      );

      if (fnError) {
        console.error("Execute error:", fnError);
        return null;
      }

      // If we got a jobId, set up realtime subscription and polling
      if (data?.jobId) {
        console.log(`Job created: ${data.jobId}, setting up realtime subscription`);
        setCurrentJobId(data.jobId);
        
        // Set up realtime subscription for immediate updates
        subscribeToJobUpdates(data.jobId);
        
        // Also set up polling as fallback (every 3 seconds)
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        pollingRef.current = setInterval(() => {
          pollJobStatus(data.jobId!);
        }, 3000);

        // Return a pending response - actual results will come via subscription
        return {
          success: true,
          sessionId: sid,
          jobId: data.jobId,
          status: "pending",
        };
      }

      // Fallback: synchronous execution (no userId provided)
      return data;
    } catch (err) {
      console.error("Execute failed:", err);
      return null;
    }
  }, [user?.id, subscribeToJobUpdates, pollJobStatus]);

  const startPolling = useCallback((sid: string) => {
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
    }, 5000);
  }, [checkStatus]);

  const startAutomation = useCallback(async (params: AutomationParams): Promise<void> => {
    setStatus("starting");
    setError(null);
    setResult(null);
    setSessionId(null);
    setDebugUrl(null);
    setConnectUrl(null);
    setAuthPersisted(false);
    setCurrentActionIndex(0);
    setExecutionResults([]);
    setAuthExpired(false);
    setLastAutomationParams(params);

    try {
      // Get or create a persistent context
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
            contextId: ctxId,
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
      setConnectUrl(data.connectUrl!);
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

      toast.success(data.authPersisted 
        ? "Session started with saved auth! Executing actions..."
        : "Session started! Executing actions...");

      // Immediately trigger execution
      if (data.connectUrl && data.actions && data.actions.length > 0) {
        setStatus("executing");
        
        const executeResult = await executeActions(
          data.sessionId!,
          data.connectUrl,
          data.actions
        );

        if (executeResult) {
          // If we got a jobId, the execution is async - updates will come via realtime
          if (executeResult.jobId) {
            console.log(`Async execution started, job: ${executeResult.jobId}`);
            // Status updates will come via realtime subscription
            // Don't update status here - let the subscription handle it
          } else {
            // Synchronous execution completed
            setExecutionResults(executeResult.actionsExecuted || []);
            
            const completedCount = executeResult.actionsExecuted?.filter(r => r.status === "completed").length || 0;
            const failedCount = executeResult.actionsExecuted?.filter(r => r.status === "failed").length || 0;

            setResult((prev) => ({
              ...prev!,
              status: executeResult.success ? "completed" : "failed",
              actionsCompleted: completedCount,
              executionResults: executeResult.actionsExecuted,
              finalScreenshot: executeResult.finalScreenshot,
              executionTimeMs: executeResult.executionTimeMs,
              completedAt: new Date().toISOString(),
            }));

            if (executeResult.success) {
              setStatus("completed");
              toast.success(`Automation completed! ${completedCount} actions executed.`);
            } else {
              setStatus("failed");
              toast.error(`Automation finished with ${failedCount} failed actions.`);
            }
          }
        } else {
          // Fallback to polling if execute fails
          startPolling(data.sessionId!);
        }
      } else {
        // Fallback to polling
        startPolling(data.sessionId!);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setStatus("failed");
      toast.error(errorMessage);
    }
  }, [startPolling, getOrCreateContext, executeActions]);

  const stopAutomation = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      toast.error("No active session to stop");
      return;
    }

    try {
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
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    sessionIdRef.current = null;
    setStatus("idle");
    setSessionId(null);
    setDebugUrl(null);
    setConnectUrl(null);
    setResult(null);
    setError(null);
    setActions([]);
    setContextId(null);
    setAuthPersisted(false);
    setCurrentActionIndex(0);
    setCurrentActionText(null);
    setExecutionResults([]);
    setCurrentJobId(null);
    setAuthExpired(false);
  }, []);

  const clearStoredContext = useCallback((n8nUrl: string) => {
    const storageKey = getContextStorageKey(n8nUrl);
    localStorage.removeItem(storageKey);
    setContextId(null);
    setAuthPersisted(false);
    setAuthExpired(false);
    toast.info("Auth context cleared. You'll need to log in again on next run.");
  }, []);

  // Retry automation after clearing auth
  const retryAfterAuthClear = useCallback(async (n8nUrl: string) => {
    // Clear the stored context first
    const storageKey = getContextStorageKey(n8nUrl);
    localStorage.removeItem(storageKey);
    setContextId(null);
    setAuthPersisted(false);
    setAuthExpired(false);
    
    toast.info("Auth context cleared. Starting fresh session...");
    
    // If we have the last params, retry with them
    if (lastAutomationParams) {
      // Small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      await startAutomation(lastAutomationParams);
    } else {
      toast.error("Cannot retry - no previous automation params stored.");
    }
  }, [lastAutomationParams, startAutomation]);

  return {
    // State
    status,
    sessionId,
    debugUrl,
    connectUrl,
    result,
    error,
    actions,
    credentialsConfigured,
    contextId,
    authPersisted,
    currentActionIndex,
    executionResults,
    authExpired,
    
    // Computed
    isRunning: status === "running" || status === "starting" || status === "executing",
    isIdle: status === "idle",
    isExecuting: status === "executing",
    isAuthExpired: status === "auth_expired",
    
    // Actions
    startAutomation,
    stopAutomation,
    checkStatus: sessionId ? () => checkStatus(sessionId) : undefined,
    reset,
    clearStoredContext,
    getOrCreateContext,
    retryAfterAuthClear,
    
    // New job-based properties
    currentJobId,
    currentActionText,
  };
}
