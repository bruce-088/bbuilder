import { useState, useCallback, useEffect } from "react";

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: Array<{ name: string; type: string }>;
  createdAt: string;
  updatedAt: string;
}

interface N8nMcpState {
  isConnected: boolean;
  isChecking: boolean;
  workflows: N8nWorkflow[];
  instanceUrl: string | null;
  workflowPath: string | null;
  error: string | null;
}

export function useN8nMcpConnection() {
  const [state, setState] = useState<N8nMcpState>({
    isConnected: false,
    isChecking: true,
    workflows: [],
    instanceUrl: null,
    workflowPath: null,
    error: null,
  });

  // Load cached instance settings from localStorage
  useEffect(() => {
    const instanceUrl = localStorage.getItem("n8n_instance_url");
    const workflowPath = localStorage.getItem("n8n_workflow_path");
    setState(prev => ({ ...prev, instanceUrl, workflowPath }));
  }, []);

  // Check for cached workflows from MCP
  const loadCachedWorkflows = useCallback(() => {
    try {
      const cached = localStorage.getItem("n8n_cached_workflows");
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // Handle both array format and object wrapper format
        let workflows: N8nWorkflow[] = [];
        if (Array.isArray(parsed)) {
          workflows = parsed;
        } else if (parsed && typeof parsed === "object") {
          // Try common wrapper patterns
          if (Array.isArray(parsed.workflows)) {
            workflows = parsed.workflows;
          } else if (Array.isArray(parsed.data)) {
            workflows = parsed.data;
          } else if (Array.isArray(parsed.items)) {
            workflows = parsed.items;
          }
        }
        
        if (workflows.length > 0) {
          setState(prev => ({
            ...prev,
            isConnected: true,
            isChecking: false,
            workflows,
          }));
          return workflows;
        }
      }
    } catch (error) {
      console.error("Error loading cached workflows:", error);
    }
    return null;
  }, []);

  // Cache workflows from MCP search results
  const cacheWorkflows = useCallback((workflows: N8nWorkflow[]) => {
    try {
      localStorage.setItem("n8n_cached_workflows", JSON.stringify(workflows));
      setState(prev => ({
        ...prev,
        isConnected: true,
        workflows,
      }));
    } catch (error) {
      console.error("Error caching workflows:", error);
    }
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    // First try to load from cache
    const cached = loadCachedWorkflows();
    if (cached && cached.length > 0) {
      return true;
    }

    // If no cache, mark as disconnected but not an error
    // The MCP tools are only available to the Lovable agent, not runtime code
    setState(prev => ({
      ...prev,
      isChecking: false,
      isConnected: false,
    }));
    
    return false;
  }, [loadCachedWorkflows]);

  // Get deep link to n8n workflow editor
  const getWorkflowEditUrl = useCallback((workflowId?: string) => {
    const baseUrl = state.workflowPath || state.instanceUrl;
    if (!baseUrl) return null;
    
    // Clean up the URL
    const cleanUrl = baseUrl.replace(/\/+$/, "");
    
    if (workflowId) {
      return `${cleanUrl}/workflow/${workflowId}`;
    }
    return `${cleanUrl}/workflow/new`;
  }, [state.instanceUrl, state.workflowPath]);

  // Get deep link to n8n import page
  const getImportUrl = useCallback(() => {
    const baseUrl = state.workflowPath || state.instanceUrl;
    if (!baseUrl) return null;
    
    const cleanUrl = baseUrl.replace(/\/+$/, "");
    return `${cleanUrl}/workflow/new`;
  }, [state.instanceUrl, state.workflowPath]);

  // Find matching workflow by name pattern
  const findWorkflowByStage = useCallback((stage: number) => {
    const patterns: Record<number, string[]> = {
      1: ["Lead Prospecting", "Discovery Engine", "Stage 1"],
      2: ["Outreach", "Follow-up", "Stage 2"],
      3: ["Qualification", "Discovery Call", "Stage 3"],
      4: ["Proposal", "Stage 4"],
      5: ["Closing", "Invoicing", "Stage 5"],
      6: ["Retention", "Client Success", "Stage 6"],
    };

    const stagePatterns = patterns[stage] || [];
    
    return state.workflows.find(wf => 
      stagePatterns.some(pattern => 
        wf.name.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  }, [state.workflows]);

  // Check if workflow has required nodes for a stage
  const validateWorkflowNodes = useCallback((workflowId: string, requiredNodeTypes: string[]) => {
    const workflow = state.workflows.find(wf => wf.id === workflowId);
    if (!workflow) return { valid: false, missing: requiredNodeTypes };

    const existingTypes = workflow.nodes.map(n => n.type.toLowerCase());
    const missing = requiredNodeTypes.filter(
      required => !existingTypes.some(existing => existing.includes(required.toLowerCase()))
    );

    return {
      valid: missing.length === 0,
      missing,
      found: requiredNodeTypes.filter(
        required => existingTypes.some(existing => existing.includes(required.toLowerCase()))
      ),
    };
  }, [state.workflows]);

  // Initialize on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    ...state,
    checkConnection,
    cacheWorkflows,
    loadCachedWorkflows,
    getWorkflowEditUrl,
    getImportUrl,
    findWorkflowByStage,
    validateWorkflowNodes,
  };
}
