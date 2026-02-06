import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkflowBuilder } from "@/hooks/useWorkflowBuilder";
import { Canvas } from "@/components/WorkflowBuilder/Canvas";
import { NodePalette } from "@/components/WorkflowBuilder/NodePalette";
import { NodeInspector } from "@/components/WorkflowBuilder/NodeInspector";
import { WorkflowToolbar } from "@/components/WorkflowBuilder/WorkflowToolbar";
import type { NodeType } from "@/components/WorkflowBuilder/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  const {
    workflow, setWorkflow, nodes, edges, selectedNode, selectedNodeId,
    loading, saving, pan, setPan, zoom, setZoom,
    connectingFrom, setConnectingFrom,
    loadWorkflow, createWorkflow, saveWorkflow,
    addNode, updateNode, deleteNode, addEdge, deleteEdge, moveNode,
    setSelectedNodeId,
  } = useWorkflowBuilder();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    if (id && id !== "new") {
      loadWorkflow(id);
    } else {
      createWorkflow().then((newId) => {
        if (newId) navigate(`/workflows/${newId}`, { replace: true });
      });
    }
  }, [id, user, authLoading]);

  const handleConnectStart = (nodeId: string) => {
    setConnectingFrom(nodeId);
  };

  const handleConnectEnd = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      addEdge(connectingFrom, nodeId);
    }
    setConnectingFrom(null);
  };

  const handleRun = async () => {
    if (!workflow || nodes.length === 0) {
      toast.error("Add some nodes before running");
      return;
    }
    setRunning(true);
    toast.info("Workflow execution coming in the next phase!");
    setTimeout(() => setRunning(false), 1500);
  };

  const handleAddNode = (type: NodeType, x: number, y: number) => {
    addNode(type, x, y);
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workflow) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <WorkflowToolbar
        name={workflow.name}
        onNameChange={(name) => setWorkflow({ ...workflow, name })}
        onSave={saveWorkflow}
        onRun={handleRun}
        saving={saving}
        running={running}
      />
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onDragStart={() => {}} />
        <Canvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          pan={pan}
          zoom={zoom}
          onPanChange={setPan}
          onZoomChange={setZoom}
          onSelectNode={setSelectedNodeId}
          onMoveNode={moveNode}
          onDeleteNode={deleteNode}
          onDeleteEdge={deleteEdge}
          onAddNode={handleAddNode}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
        />
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            onUpdate={updateNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
