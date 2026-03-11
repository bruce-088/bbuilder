import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkflowBuilder } from "@/hooks/useWorkflowBuilder";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { useWorkflowSchedule } from "@/hooks/useWorkflowSchedule";
import { useNexusWorkflowStatus } from "@/hooks/useNexusWorkflowStatus";
import { Canvas } from "@/components/WorkflowBuilder/Canvas";
import { NodePalette } from "@/components/WorkflowBuilder/NodePalette";
import { NodeInspector } from "@/components/WorkflowBuilder/NodeInspector";
import { WorkflowToolbar } from "@/components/WorkflowBuilder/WorkflowToolbar";
import { ExecutionLogPanel } from "@/components/WorkflowBuilder/ExecutionLogPanel";
import type { NodeType } from "@/components/WorkflowBuilder/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    workflow, setWorkflow, nodes, edges, selectedNode, selectedNodeId,
    loading, saving, pan, setPan, zoom, setZoom,
    connectingFrom, setConnectingFrom,
    connectingMousePos, setConnectingMousePos,
    loadWorkflow, createWorkflow, saveWorkflow,
    addNode, updateNode, deleteNode, addEdge, deleteEdge, moveNode,
    setSelectedNodeId,
  } = useWorkflowBuilder();

  const {
    executing, runWorkflow, getNodeStatus, getNodeLog, nodeLogs,
  } = useWorkflowExecution(workflow?.id);

  const { schedule, saving: scheduleSaving, saveSchedule, toggleEnabled } = useWorkflowSchedule(workflow?.id);
  const nexusStatus = useNexusWorkflowStatus(workflow?.id);
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

  const handleConnectStart = (nodeId: string) => setConnectingFrom(nodeId);
  const handleConnectEnd = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) addEdge(connectingFrom, nodeId);
    setConnectingFrom(null);
    setConnectingMousePos(null);
  };
  const handleConnectCancel = () => {
    setConnectingFrom(null);
    setConnectingMousePos(null);
  };

  const handleRun = async () => {
    if (!workflow || nodes.length === 0) {
      toast.error("Add some nodes before running");
      return;
    }
    // Auto-save before running
    await saveWorkflow();
    await runWorkflow({});
  };

  const handleAddNode = (type: NodeType, x: number, y: number) => addNode(type, x, y);

  // Build execution statuses map
  const executionStatuses: Record<string, string> = {};
  for (const node of nodes) {
    executionStatuses[node.id] = getNodeStatus(node.id);
  }

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
        running={executing}
        schedule={schedule}
        scheduleSaving={scheduleSaving}
        onScheduleSave={saveSchedule}
        onScheduleToggle={toggleEnabled}
        nexusStatus={nexusStatus}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <NodePalette onDragStart={() => {}} />
        <div className="flex-1 relative">
          <Canvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            pan={pan}
            zoom={zoom}
            executionStatuses={executionStatuses}
            connectingFrom={connectingFrom}
            connectingMousePos={connectingMousePos}
            onPanChange={setPan}
            onZoomChange={setZoom}
            onSelectNode={setSelectedNodeId}
            onMoveNode={moveNode}
            onDeleteNode={deleteNode}
            onDeleteEdge={deleteEdge}
            onAddNode={handleAddNode}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
            onConnectMouseMove={setConnectingMousePos}
            onConnectCancel={handleConnectCancel}
          />
          <ExecutionLogPanel
            executing={executing}
            nodeLogs={nodeLogs}
            nodes={nodes}
            onNodeClick={setSelectedNodeId}
          />
        </div>
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            executionLog={getNodeLog(selectedNode.id)}
            onUpdate={updateNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
