import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Workflow,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WorkflowSnapshot } from "@/hooks/useN8nWorkflowContext";
import { motion, AnimatePresence } from "framer-motion";

interface WorkflowContextPanelProps {
  snapshot: WorkflowSnapshot | null;
  lastRefreshed: Date | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function WorkflowContextPanel({
  snapshot,
  lastRefreshed,
  isLoading,
  error,
  onRefresh,
}: WorkflowContextPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!snapshot && !error) {
    return (
      <div className="border border-border/50 rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Workflow className="w-4 h-4" />
            <span className="text-sm">No workflow context loaded</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-1"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Load Context
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "Retry"
            )}
          </Button>
        </div>
      </div>
    );
  }

  const configuredNodes = snapshot?.nodes.filter(
    (n) => n.credentials && Object.keys(n.credentials).length > 0
  ).length || 0;
  const totalNodes = snapshot?.nodes.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border/50 rounded-lg bg-muted/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Workflow className="w-4 h-4 text-primary" />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {snapshot?.workflowName || "Workflow"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {configuredNodes}/{totalNodes} nodes ready
                  </Badge>
                </div>
                {lastRefreshed && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh workflow data</TooltipContent>
              </Tooltip>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent forceMount asChild>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="border-t border-border/50 p-3 space-y-2 max-h-48 overflow-y-auto">
                  {snapshot?.nodes.map((node) => {
                    const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
                    const hasParams = node.parameters && Object.keys(node.parameters).length > 0;
                    const isConfigured = hasCredentials || hasParams;

                    return (
                      <div
                        key={node.id || node.name}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md bg-background/50"
                      >
                        <div className="flex items-center gap-2">
                          {isConfigured ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                          )}
                          <span className="text-sm">{node.name}</span>
                        </div>
                        <Badge
                          variant={isConfigured ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {node.type.split(".").pop()}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </div>
    </Collapsible>
  );
}
