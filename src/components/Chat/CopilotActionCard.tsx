import { CheckCircle, XCircle, Workflow, UserPlus, Play, List, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ToolResult {
  name: string;
  result: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
}

interface CopilotActionCardProps {
  toolResult: ToolResult;
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create_workflow: { label: "Workflow Created", icon: <Workflow className="h-4 w-4" />, color: "text-green-400" },
  add_lead: { label: "Lead Added", icon: <UserPlus className="h-4 w-4" />, color: "text-blue-400" },
  trigger_workflow: { label: "Workflow Triggered", icon: <Play className="h-4 w-4" />, color: "text-amber-400" },
  list_leads: { label: "Leads Retrieved", icon: <Users className="h-4 w-4" />, color: "text-purple-400" },
  list_workflows: { label: "Workflows Retrieved", icon: <List className="h-4 w-4" />, color: "text-cyan-400" },
};

export default function CopilotActionCard({ toolResult }: CopilotActionCardProps) {
  const navigate = useNavigate();
  const { name, result } = toolResult;
  const meta = TOOL_META[name] || { label: name, icon: <CheckCircle className="h-4 w-4" />, color: "text-muted-foreground" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-3"
    >
      <div className="flex items-center gap-2 mb-1">
        {result.success ? (
          <CheckCircle className="h-4 w-4 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
        <span className={`font-medium text-sm ${meta.color}`}>{meta.label}</span>
        <span className="ml-auto">{meta.icon}</span>
      </div>

      {result.success && result.data && (
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {name === "create_workflow" && (
            <>
              <p>📝 <strong>{(result.data as any).name}</strong> — {(result.data as any).node_count || 0} nodes</p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => navigate(`/workflows/${(result.data as any).workflow_id}`)}
              >
                Open in Editor →
              </Button>
            </>
          )}
          {name === "add_lead" && (
            <>
              <p>👤 <strong>{(result.data as any).name}</strong> — Stage: {(result.data as any).stage}</p>
              {(result.data as any).estimated_value && (
                <p>💰 Est. value: ${(result.data as any).estimated_value?.toLocaleString()}</p>
              )}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => navigate("/leads")}
              >
                View in CRM →
              </Button>
            </>
          )}
          {name === "trigger_workflow" && (
            <p>⚡ Running <strong>{(result.data as any).workflow_name}</strong></p>
          )}
          {name === "list_leads" && (
            <p>📋 Found {(result.data as any).total} lead(s)</p>
          )}
          {name === "list_workflows" && (
            <p>📋 Found {(result.data as any).total} workflow(s)</p>
          )}
        </div>
      )}

      {!result.success && result.error && (
        <p className="text-xs text-red-400 mt-1">❌ {result.error}</p>
      )}
    </motion.div>
  );
}
