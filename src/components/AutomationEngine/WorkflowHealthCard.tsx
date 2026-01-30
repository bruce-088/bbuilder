import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Play, 
  Loader2, 
  GitBranch,
  Clock,
  AlertCircle
} from "lucide-react";
import { WebhookHealthIndicator } from "./WebhookHealthIndicator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { WorkflowStatus, TriggerInfo } from "@/hooks/useN8nLiveStatus";

interface WorkflowHealthCardProps {
  workflow: WorkflowStatus;
  webhookHealth: Record<string, "healthy" | "unhealthy" | "unknown">;
  onTestRun?: (workflowId: string) => void;
  onOpenInN8n?: (workflowId: string) => void;
  isTestRunning?: boolean;
  className?: string;
}

export function WorkflowHealthCard({
  workflow,
  webhookHealth,
  onTestRun,
  onOpenInN8n,
  isTestRunning = false,
  className,
}: WorkflowHealthCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getWebhookStatus = (triggers: TriggerInfo[]): "healthy" | "unhealthy" | "unknown" => {
    const webhookTriggers = triggers.filter((t) => t.webhookUrl);
    if (webhookTriggers.length === 0) return "unknown";

    const statuses = webhookTriggers.map(
      (t) => webhookHealth[t.webhookUrl!] ?? "unknown"
    );

    if (statuses.every((s) => s === "healthy")) return "healthy";
    if (statuses.some((s) => s === "unhealthy")) return "unhealthy";
    return "unknown";
  };

  const webhookStatus = getWebhookStatus(workflow.triggers);
  const hasWebhooks = workflow.triggers.some((t) => t.webhookUrl);

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        workflow.active && "border-primary/30",
        workflow.hasChangedSinceLastCheck && "ring-2 ring-accent",
        isHovered && "shadow-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Active indicator pulse */}
      {workflow.active && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-pulse" />
      )}

      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {workflow.active ? (
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <h4 className="font-medium text-sm truncate" title={workflow.name}>
              {workflow.name}
            </h4>
          </div>
          
          {workflow.hasChangedSinceLastCheck && (
            <Badge variant="outline" className="bg-accent/50 text-accent-foreground border-accent text-xs flex-shrink-0">
              <AlertCircle className="h-3 w-3 mr-1" />
              Changed
            </Badge>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant={workflow.active ? "default" : "secondary"} className="text-xs">
            {workflow.active ? "Active" : "Inactive"}
          </Badge>
          
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {workflow.nodeCount} nodes
          </span>

          {hasWebhooks && (
            <span className="flex items-center gap-1">
              <WebhookHealthIndicator status={webhookStatus} />
              Webhook
            </span>
          )}
        </div>

        {/* Last updated */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDistanceToNow(new Date(workflow.lastUpdated), { addSuffix: true })}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => onTestRun?.(workflow.id)}
            disabled={isTestRunning || !workflow.active}
          >
            {isTestRunning ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Test Run
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onOpenInN8n?.(workflow.id)}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
