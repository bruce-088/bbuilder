import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  position?: [number, number];
}

export interface WorkflowSnapshot {
  id?: string;
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  connections?: Record<string, unknown>;
  capturedAt?: string;
  source?: string;
}

export interface WorkflowContextState {
  currentSnapshot: WorkflowSnapshot | null;
  previousSnapshot: WorkflowSnapshot | null;
  isLoading: boolean;
  lastRefreshed: Date | null;
  error: string | null;
}

interface AnalysisResult {
  status: "configured" | "incomplete" | "missing";
  issues: string[];
  suggestions: string[];
  nodeDetails?: {
    name: string;
    type: string;
    hasCredentials: boolean;
    parameters: Record<string, unknown>;
  };
}

interface AnalyzeIssueResponse {
  workflowName: string;
  analysis: Record<string, AnalysisResult>;
  summary: {
    totalNodes: number;
    configured: number;
    incomplete: number;
    missing: number;
    criticalIssues: string[];
  };
}

interface CompareResult {
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesModified: Array<{ name: string; changes: string[] }>;
  credentialsAdded: string[];
  summary: string;
}

const CACHE_KEY = "n8n_cached_workflows";

export function useN8nWorkflowContext(conversationId?: string) {
  const { user } = useAuth();
  const [state, setState] = useState<WorkflowContextState>({
    currentSnapshot: null,
    previousSnapshot: null,
    isLoading: false,
    lastRefreshed: null,
    error: null,
  });

  // Load snapshot from localStorage cache
  const loadFromLocalCache = useCallback((workflowId?: string): WorkflowSnapshot | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const workflows = JSON.parse(cached);
      if (workflowId && workflows[workflowId]) {
        return {
          workflowId,
          workflowName: workflows[workflowId].name,
          nodes: workflows[workflowId].nodes || [],
          connections: workflows[workflowId].connections,
          capturedAt: workflows[workflowId].capturedAt,
          source: "localStorage",
        };
      }

      // Return the first workflow if no specific ID
      const firstKey = Object.keys(workflows)[0];
      if (firstKey) {
        return {
          workflowId: firstKey,
          workflowName: workflows[firstKey].name,
          nodes: workflows[firstKey].nodes || [],
          connections: workflows[firstKey].connections,
          capturedAt: workflows[firstKey].capturedAt,
          source: "localStorage",
        };
      }

      return null;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return null;
    }
  }, []);

  // Save snapshot to database
  const saveSnapshot = useCallback(async (snapshot: WorkflowSnapshot): Promise<boolean> => {
    if (!user) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-data-proxy/save-snapshot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workflowId: snapshot.workflowId,
            workflowName: snapshot.workflowName,
            nodes: snapshot.nodes,
            connections: snapshot.connections,
            conversationId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save snapshot");
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        previousSnapshot: prev.currentSnapshot,
        currentSnapshot: {
          ...snapshot,
          id: result.snapshot?.id,
          capturedAt: new Date().toISOString(),
        },
        lastRefreshed: new Date(),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error saving snapshot:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to save snapshot",
      }));
      return false;
    }
  }, [user, conversationId]);

  // Refresh context from localStorage cache and save to DB
  const refreshContext = useCallback(async (workflowId?: string): Promise<WorkflowSnapshot | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const localSnapshot = loadFromLocalCache(workflowId);
    if (!localSnapshot) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "No cached workflow data found. Use the n8n Automation Guide to cache workflows first.",
      }));
      return null;
    }

    // Save to database for persistence
    await saveSnapshot(localSnapshot);

    return localSnapshot;
  }, [loadFromLocalCache, saveSnapshot]);

  // Load snapshot from database
  const loadFromDatabase = useCallback(async (workflowId?: string): Promise<WorkflowSnapshot | null> => {
    if (!user) return null;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-data-proxy/get-snapshot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workflowId,
            conversationId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch snapshot");
      }

      const result = await response.json();

      if (result.snapshot) {
        const snapshot: WorkflowSnapshot = {
          id: result.snapshot.id,
          workflowId: result.snapshot.workflow_id,
          workflowName: result.snapshot.workflow_name,
          nodes: result.snapshot.nodes,
          connections: result.snapshot.connections,
          capturedAt: result.snapshot.captured_at,
          source: result.snapshot.source,
        };

        setState(prev => ({
          ...prev,
          currentSnapshot: snapshot,
          lastRefreshed: new Date(result.snapshot.captured_at),
          isLoading: false,
        }));

        return snapshot;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    } catch (error) {
      console.error("Error loading from database:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load snapshot",
      }));
      return null;
    }
  }, [user, conversationId]);

  // Analyze issues in the current snapshot
  const analyzeIssues = useCallback(async (
    nodeName?: string,
    issueDescription?: string
  ): Promise<AnalyzeIssueResponse | null> => {
    if (!state.currentSnapshot) {
      setState(prev => ({ ...prev, error: "No workflow snapshot available for analysis" }));
      return null;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-data-proxy/analyze-issue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workflowSnapshot: state.currentSnapshot,
            nodeName,
            issueDescription,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze issues");
      }

      return await response.json();
    } catch (error) {
      console.error("Error analyzing issues:", error);
      return null;
    }
  }, [state.currentSnapshot]);

  // Compare before and after snapshots
  const compareSnapshots = useCallback(async (): Promise<CompareResult | null> => {
    if (!state.currentSnapshot?.id || !state.previousSnapshot?.id) {
      return null;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-data-proxy/compare-snapshots`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            snapshotIdBefore: state.previousSnapshot.id,
            snapshotIdAfter: state.currentSnapshot.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to compare snapshots");
      }

      const result = await response.json();
      return result.diff;
    } catch (error) {
      console.error("Error comparing snapshots:", error);
      return null;
    }
  }, [state.currentSnapshot, state.previousSnapshot]);

  // Get context for AI (formatted for chat)
  const getContextForAI = useCallback(() => {
    if (!state.currentSnapshot) return null;

    return {
      workflowName: state.currentSnapshot.workflowName,
      workflowId: state.currentSnapshot.workflowId,
      nodes: state.currentSnapshot.nodes.map(node => ({
        name: node.name,
        type: node.type,
        parameters: node.parameters,
        credentials: node.credentials ? { configured: true } : undefined,
      })),
      capturedAt: state.currentSnapshot.capturedAt,
    };
  }, [state.currentSnapshot]);

  // Load initial snapshot on mount if conversationId is provided
  useEffect(() => {
    if (conversationId && user) {
      loadFromDatabase();
    }
  }, [conversationId, user]);

  return {
    ...state,
    refreshContext,
    saveSnapshot,
    loadFromDatabase,
    loadFromLocalCache,
    analyzeIssues,
    compareSnapshots,
    getContextForAI,
  };
}
