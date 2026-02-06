import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { WorkflowNode, WorkflowEdge, Workflow, NodeType } from "@/components/WorkflowBuilder/types";
import type { Json } from "@/integrations/supabase/types";
import { NODE_TYPE_CONFIG } from "@/components/WorkflowBuilder/types";

export function useWorkflowBuilder(workflowId?: string) {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);

  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const loadWorkflow = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [wfRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from("workflows").select("*").eq("id", id).single(),
        supabase.from("workflow_nodes").select("*").eq("workflow_id", id),
        supabase.from("workflow_edges").select("*").eq("workflow_id", id),
      ]);
      if (wfRes.data) setWorkflow(wfRes.data as unknown as Workflow);
      if (nodesRes.data) setNodes(nodesRes.data as unknown as WorkflowNode[]);
      if (edgesRes.data) setEdges(edgesRes.data as unknown as WorkflowEdge[]);
    } catch (e) {
      console.error("Failed to load workflow", e);
      toast.error("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (name = "Untitled Workflow") => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("workflows")
      .insert({ user_id: user.id, name })
      .select()
      .single();
    if (error) {
      toast.error("Failed to create workflow");
      return null;
    }
    setWorkflow(data as unknown as Workflow);
    return data.id as string;
  }, [user]);

  const saveWorkflow = useCallback(async () => {
    if (!workflow) return;
    setSaving(true);
    try {
      // Update workflow metadata
      await supabase.from("workflows").update({ name: workflow.name, description: workflow.description }).eq("id", workflow.id);

      // Delete existing nodes/edges and re-insert (simple upsert strategy)
      await supabase.from("workflow_edges").delete().eq("workflow_id", workflow.id);
      await supabase.from("workflow_nodes").delete().eq("workflow_id", workflow.id);

      if (nodes.length > 0) {
        const { error: nodesErr } = await supabase.from("workflow_nodes").insert(
          nodes.map((n) => ({
            id: n.id,
            workflow_id: workflow.id,
            type: n.type,
            name: n.name,
            position_x: n.position_x,
            position_y: n.position_y,
            config: n.config as unknown as Json,
            ai_prompt: n.ai_prompt,
            ai_model: n.ai_model,
          }))
        );
        if (nodesErr) throw nodesErr;
      }

      if (edges.length > 0) {
        const { error: edgesErr } = await supabase.from("workflow_edges").insert(
          edges.map((e) => ({
            id: e.id,
            workflow_id: workflow.id,
            source_node_id: e.source_node_id,
            target_node_id: e.target_node_id,
            source_handle: e.source_handle,
            target_handle: e.target_handle,
          }))
        );
        if (edgesErr) throw edgesErr;
      }

      toast.success("Workflow saved");
    } catch (e) {
      console.error("Save failed", e);
      toast.error("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }, [workflow, nodes, edges]);

  const addNode = useCallback((type: NodeType, x: number, y: number) => {
    if (!workflow) return;
    const cfg = NODE_TYPE_CONFIG[type];
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      workflow_id: workflow.id,
      type,
      name: cfg.label,
      position_x: Math.round((x - pan.x) / zoom),
      position_y: Math.round((y - pan.y) / zoom),
      config: { ...cfg.defaultConfig },
      ai_prompt: type === "ai_agent" ? "You are a helpful assistant." : null,
      ai_model: type === "ai_agent" ? "google/gemini-2.5-flash" : null,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  }, [workflow, pan, zoom]);

  const updateNode = useCallback((id: string, updates: Partial<WorkflowNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source_node_id !== id && e.target_node_id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const addEdge = useCallback((sourceId: string, targetId: string) => {
    if (!workflow) return;
    // Prevent duplicates
    const exists = edges.some((e) => e.source_node_id === sourceId && e.target_node_id === targetId);
    if (exists || sourceId === targetId) return;
    const newEdge: WorkflowEdge = {
      id: crypto.randomUUID(),
      workflow_id: workflow.id,
      source_node_id: sourceId,
      target_node_id: targetId,
      source_handle: "output",
      target_handle: "input",
    };
    setEdges((prev) => [...prev, newEdge]);
  }, [workflow, edges]);

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position_x: x, position_y: y } : n)));
  }, []);

  return {
    workflow, setWorkflow, nodes, edges, selectedNode, selectedNodeId,
    loading, saving, pan, setPan, zoom, setZoom,
    connectingFrom, setConnectingFrom,
    connectingMousePos, setConnectingMousePos,
    loadWorkflow, createWorkflow, saveWorkflow,
    addNode, updateNode, deleteNode, addEdge, deleteEdge, moveNode,
    setSelectedNodeId,
  };
}
