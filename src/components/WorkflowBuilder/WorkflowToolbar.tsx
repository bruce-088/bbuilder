import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Play, Save, Loader2, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScheduleConfig } from "./ScheduleConfig";
import type { NexusStatus } from "@/hooks/useNexusWorkflowStatus";

interface WorkflowToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onRun: () => void;
  saving: boolean;
  running: boolean;
  schedule?: { cron_expression: string; enabled: boolean } | null;
  scheduleSaving?: boolean;
  onScheduleSave?: (cron: string, enabled: boolean) => void;
  onScheduleToggle?: () => void;
  nexusStatus?: NexusStatus;
}

const STATUS_CONFIG: Record<NexusStatus, { label: string; className: string; dotClass: string }> = {
  active: { label: "Nexus Active", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", dotClass: "bg-emerald-400 animate-pulse" },
  idle: { label: "Nexus Idle", className: "bg-muted text-muted-foreground border-border", dotClass: "bg-muted-foreground" },
  unknown: { label: "Nexus", className: "bg-muted text-muted-foreground border-border", dotClass: "bg-muted-foreground" },
};

export function WorkflowToolbar({ name, onNameChange, onSave, onRun, saving, running, schedule, scheduleSaving, onScheduleSave, onScheduleToggle, nexusStatus = "unknown" }: WorkflowToolbarProps) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[nexusStatus];

  return (
    <div className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0">
      <Button variant="ghost" size="icon" onClick={() => navigate("/workflows")} className="shrink-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="max-w-xs h-8 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-primary"
      />

      {/* Nexus Status Indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1.5 cursor-default ${statusCfg.className}`}>
            <span className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`} />
            {statusCfg.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{nexusStatus === "active" ? "This workflow was recently triggered in NexusAI" : nexusStatus === "idle" ? "No recent NexusAI activity for this workflow" : "NexusAI status unknown"}</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {onScheduleSave && onScheduleToggle && (
        <ScheduleConfig
          cronExpression={schedule?.cron_expression || "0 9 * * *"}
          enabled={schedule?.enabled || false}
          saving={scheduleSaving || false}
          onSave={onScheduleSave}
          onToggle={onScheduleToggle}
        />
      )}

      <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save
      </Button>

      <Button size="sm" onClick={onRun} disabled={running} className="gap-1.5 bg-gradient-to-r from-primary to-primary/80">
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Run
      </Button>
    </div>
  );
}
