import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TriggerInfo {
  type: string;
  webhookUrl?: string;
  schedule?: string;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  active: boolean;
  nodeCount: number;
  lastUpdated: string;
  triggers: TriggerInfo[];
  hasChangedSinceLastCheck: boolean;
  nodes?: Array<{ name: string; type: string }>;
}

export interface WorkflowChange {
  workflowId: string;
  workflowName: string;
  type: "node_added" | "node_removed" | "status_changed" | "config_changed";
  details: string;
  timestamp: Date;
}

interface N8nLiveStatus {
  workflows: WorkflowStatus[];
  lastChecked: Date | null;
  isPolling: boolean;
  changes: WorkflowChange[];
  webhookHealth: Record<string, "healthy" | "unhealthy" | "unknown">;
}

interface UseN8nLiveStatusOptions {
  pollingInterval?: number;
  enabled?: boolean;
  onChangesDetected?: (changes: WorkflowChange[]) => void;
}

// Diff utilities for detecting workflow changes
function diffWorkflows(
  previous: WorkflowStatus[],
  current: WorkflowStatus[]
): WorkflowChange[] {
  const changes: WorkflowChange[] = [];
  const prevMap = new Map(previous.map((w) => [w.id, w]));

  for (const curr of current) {
    const prev = prevMap.get(curr.id);

    if (!prev) {
      // New workflow appeared
      changes.push({
        workflowId: curr.id,
        workflowName: curr.name,
        type: "node_added",
        details: `New workflow detected with ${curr.nodeCount} nodes`,
        timestamp: new Date(),
      });
      continue;
    }

    // Check status change
    if (prev.active !== curr.active) {
      changes.push({
        workflowId: curr.id,
        workflowName: curr.name,
        type: "status_changed",
        details: `Workflow ${curr.active ? "activated" : "deactivated"}`,
        timestamp: new Date(),
      });
    }

    // Check node count changes
    const nodeDiff = curr.nodeCount - prev.nodeCount;
    if (nodeDiff > 0) {
      changes.push({
        workflowId: curr.id,
        workflowName: curr.name,
        type: "node_added",
        details: `${nodeDiff} node${nodeDiff > 1 ? "s" : ""} added`,
        timestamp: new Date(),
      });
    } else if (nodeDiff < 0) {
      changes.push({
        workflowId: curr.id,
        workflowName: curr.name,
        type: "node_removed",
        details: `${Math.abs(nodeDiff)} node${Math.abs(nodeDiff) > 1 ? "s" : ""} removed`,
        timestamp: new Date(),
      });
    }

    // Check if updated timestamp changed (config modified)
    if (prev.lastUpdated !== curr.lastUpdated && nodeDiff === 0) {
      changes.push({
        workflowId: curr.id,
        workflowName: curr.name,
        type: "config_changed",
        details: "Configuration updated",
        timestamp: new Date(),
      });
    }
  }

  return changes;
}

export function useN8nLiveStatus(options: UseN8nLiveStatusOptions = {}) {
  const {
    pollingInterval = 30000, // 30 seconds default
    enabled = true,
    onChangesDetected,
  } = options;

  const [state, setState] = useState<N8nLiveStatus>({
    workflows: [],
    lastChecked: null,
    isPolling: false,
    changes: [],
    webhookHealth: {},
  });

  const previousWorkflowsRef = useRef<WorkflowStatus[]>([]);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);
  const lastPollTimeRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Extract trigger info from nodes
  function extractTriggers(nodes?: Array<{ name: string; type: string; parameters?: any }>): TriggerInfo[] {
    if (!nodes) return [];
    
    return nodes
      .filter((n) => n.type.toLowerCase().includes("trigger") || n.type.toLowerCase().includes("webhook"))
      .map((n) => ({
        type: n.type,
        webhookUrl: n.parameters?.path ? `${localStorage.getItem("n8n_instance_url") || ""}/webhook/${n.parameters.path}` : undefined,
        schedule: n.parameters?.cronExpression,
      }));
  }

  // Convert database snapshot to WorkflowStatus
  const snapshotToWorkflowStatus = useCallback((snapshot: any): WorkflowStatus => {
    const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    return {
      id: snapshot.workflow_id,
      name: snapshot.workflow_name,
      active: true, // Snapshots are from active workflows
      nodeCount: nodes.length,
      lastUpdated: snapshot.captured_at ?? new Date().toISOString(),
      triggers: extractTriggers(nodes),
      hasChangedSinceLastCheck: false,
      nodes: nodes,
    };
  }, []);

  // Load workflows from database
  const loadFromDatabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("n8n_workflow_snapshots")
        .select("*")
        .order("captured_at", { ascending: false });

      if (error) {
        console.error("Error loading workflow snapshots:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Deduplicate by workflow_id, keeping most recent
      const uniqueWorkflows = new Map<string, any>();
      for (const snapshot of data) {
        if (!uniqueWorkflows.has(snapshot.workflow_id)) {
          uniqueWorkflows.set(snapshot.workflow_id, snapshot);
        }
      }

      const mapped = Array.from(uniqueWorkflows.values()).map(snapshotToWorkflowStatus);
      return mapped;
    } catch (error) {
      console.error("Error loading from database:", error);
      return [];
    }
  }, [snapshotToWorkflowStatus]);

  // Load cached workflows from localStorage (fallback)
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem("n8n_cached_workflows");
      if (cached) {
        const workflows = JSON.parse(cached);
        const mapped: WorkflowStatus[] = workflows.map((wf: any) => ({
          id: wf.id,
          name: wf.name,
          active: wf.active ?? false,
          nodeCount: wf.nodes?.length ?? 0,
          lastUpdated: wf.updatedAt ?? wf.createdAt ?? new Date().toISOString(),
          triggers: extractTriggers(wf.nodes),
          hasChangedSinceLastCheck: false,
          nodes: wf.nodes,
        }));

        return mapped;
      }
    } catch (error) {
      console.error("Error loading cached workflows:", error);
    }
    return [];
  }, []);

  // Check webhook health via edge function
  const checkWebhookHealth = useCallback(async (webhookUrls: string[]) => {
    if (webhookUrls.length === 0) return {};

    try {
      const { data, error } = await supabase.functions.invoke("n8n-webhook-health", {
        body: { urls: webhookUrls },
      });

      if (error) {
        console.error("Webhook health check failed:", error);
        return {};
      }

      return data?.health ?? {};
    } catch (error) {
      console.error("Error checking webhook health:", error);
      return {};
    }
  }, []);

  // Process workflow updates and detect changes
  const processWorkflowUpdate = useCallback((workflows: WorkflowStatus[]) => {
    // Detect changes
    if (previousWorkflowsRef.current.length > 0 && workflows.length > 0) {
      const detectedChanges = diffWorkflows(previousWorkflowsRef.current, workflows);

      if (detectedChanges.length > 0) {
        // Mark workflows with changes
        const workflowsWithChanges = workflows.map((wf) => ({
          ...wf,
          hasChangedSinceLastCheck: detectedChanges.some((c) => c.workflowId === wf.id),
        }));

        setState((prev) => ({
          ...prev,
          workflows: workflowsWithChanges,
          changes: [...detectedChanges, ...prev.changes].slice(0, 20),
          lastChecked: new Date(),
        }));

        // Notify about changes
        if (onChangesDetected) {
          onChangesDetected(detectedChanges);
        }

        // Show toast for significant changes
        toast.info(`${detectedChanges.length} change${detectedChanges.length > 1 ? "s" : ""} detected in n8n workflows`);
        
        previousWorkflowsRef.current = workflowsWithChanges;
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      workflows,
      lastChecked: new Date(),
    }));
    previousWorkflowsRef.current = workflows;
  }, [onChangesDetected]);

  // Refresh workflow data from database and cache
  const refresh = useCallback(async () => {
    const now = Date.now();
    // Rate limit: minimum 10 seconds between polls
    if (now - lastPollTimeRef.current < 10000) {
      return;
    }
    lastPollTimeRef.current = now;

    setState((prev) => ({ ...prev, isPolling: true }));

    try {
      // Try database first, then fall back to cache
      let workflows = await loadFromDatabase();
      
      if (workflows.length === 0) {
        workflows = loadFromCache();
      }

      processWorkflowUpdate(workflows);

      // Check webhook health
      const webhookUrls = workflows.flatMap((wf) =>
        wf.triggers
          .filter((t) => t.webhookUrl)
          .map((t) => t.webhookUrl!)
      );

      if (webhookUrls.length > 0) {
        const health = await checkWebhookHealth(webhookUrls);
        setState((prev) => ({
          ...prev,
          webhookHealth: health,
        }));
      }

      setState((prev) => ({
        ...prev,
        isPolling: false,
      }));
    } catch (error) {
      console.error("Error refreshing workflow status:", error);
      setState((prev) => ({ ...prev, isPolling: false }));
    }
  }, [loadFromDatabase, loadFromCache, checkWebhookHealth, processWorkflowUpdate]);

  // Clear change indicators for a workflow
  const clearChanges = useCallback((workflowId?: string) => {
    setState((prev) => ({
      ...prev,
      workflows: prev.workflows.map((wf) =>
        workflowId ? (wf.id === workflowId ? { ...wf, hasChangedSinceLastCheck: false } : wf) : { ...wf, hasChangedSinceLastCheck: false }
      ),
      changes: workflowId
        ? prev.changes.filter((c) => c.workflowId !== workflowId)
        : [],
    }));
  }, []);

  // Get n8n workflow editor URL
  const getWorkflowUrl = useCallback((workflowId: string) => {
    const baseUrl = localStorage.getItem("n8n_workflow_path") || localStorage.getItem("n8n_instance_url");
    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/+$/, "")}/workflow/${workflowId}`;
  }, []);

  // Setup Supabase Realtime subscription
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to realtime changes on n8n_workflow_snapshots
    channelRef.current = supabase
      .channel("n8n-workflow-snapshots-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "n8n_workflow_snapshots",
        },
        async (payload) => {
          console.log("Realtime update received:", payload.eventType);
          
          // Reload all workflows from database on any change
          const workflows = await loadFromDatabase();
          if (workflows.length > 0) {
            processWorkflowUpdate(workflows);
            
            // Check webhook health for updated workflows
            const webhookUrls = workflows.flatMap((wf) =>
              wf.triggers
                .filter((t) => t.webhookUrl)
                .map((t) => t.webhookUrl!)
            );

            if (webhookUrls.length > 0) {
              const health = await checkWebhookHealth(webhookUrls);
              setState((prev) => ({
                ...prev,
                webhookHealth: health,
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, loadFromDatabase, processWorkflowUpdate, checkWebhookHealth]);

  // Setup polling as fallback with visibility awareness
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) {
        // Resume polling when tab becomes visible
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial load
    refresh();

    // Start fallback polling (less frequent since we have realtime)
    const poll = () => {
      if (isVisibleRef.current) {
        refresh();
      }
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
    };

    pollingTimeoutRef.current = setTimeout(poll, pollingInterval);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [enabled, pollingInterval, refresh]);

  return {
    ...state,
    refresh,
    clearChanges,
    getWorkflowUrl,
  };
}
