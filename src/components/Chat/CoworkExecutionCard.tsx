import { CheckCircle2, Circle, Loader2, XCircle, Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CoworkExecution, CoworkAction } from "@/hooks/useCoworkMode";
import { openExternalUrl } from "@/lib/openExternalUrl";

interface CoworkExecutionCardProps {
  execution: CoworkExecution;
}

function ActionStatusIcon({ status }: { status: CoworkAction["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "running":
      return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />;
  }
}

function actionLabel(action: CoworkAction["action"]): string {
  switch (action.type) {
    case "navigate":
      return `Navigate to ${action.url ? new URL(action.url).pathname : "page"}`;
    case "act":
      return action.instruction || "Interact";
    case "wait":
      return `Wait ${action.timeout || 2000}ms`;
    case "screenshot":
      return "Take screenshot";
    case "extract":
      return action.instruction || "Extract data";
    default:
      return action.type;
  }
}

export default function CoworkExecutionCard({ execution }: CoworkExecutionCardProps) {
  const [expanded, setExpanded] = useState(true);

  const completedCount = execution.actions.filter((a) => a.status === "completed").length;
  const totalCount = execution.actions.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const statusBadge = () => {
    switch (execution.status) {
      case "interpreting":
        return <Badge variant="secondary" className="text-xs gap-1"><Loader2 className="w-3 h-3 animate-spin" />Thinking</Badge>;
      case "executing":
        return <Badge className="text-xs gap-1 bg-primary/20 text-primary border-primary/30"><Loader2 className="w-3 h-3 animate-spin" />Running</Badge>;
      case "completed":
        return <Badge className="text-xs gap-1 bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3" />Done</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {execution.summary || "Browser Action"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge()}
            {execution.actions.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {execution.status === "executing" && totalCount > 0 && (
          <Progress value={progress} className="h-1.5" />
        )}

        {/* Action steps */}
        <AnimatePresence>
          {expanded && execution.actions.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-1 overflow-hidden"
            >
              {execution.actions.map((ca, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs py-0.5"
                >
                  <ActionStatusIcon status={ca.status} />
                  <span
                    className={`truncate ${
                      ca.status === "completed"
                        ? "text-muted-foreground line-through"
                        : ca.status === "running"
                        ? "text-foreground font-medium"
                        : ca.status === "failed"
                        ? "text-destructive"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {actionLabel(ca.action)}
                  </span>
                  {ca.error && (
                    <span className="text-destructive text-[10px] truncate ml-auto max-w-[120px]">
                      {ca.error}
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Screenshots */}
        {execution.screenshots.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto py-1">
            {execution.screenshots.slice(-3).map((src, i) => (
              <img
                key={i}
                src={`data:image/png;base64,${src}`}
                alt={`Screenshot ${i + 1}`}
                className="h-16 w-auto rounded border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  // Open full-size in new tab
                  const w = window.open();
                  if (w) {
                    w.document.write(`<img src="data:image/png;base64,${src}" style="max-width:100%"/>`);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Watch live link */}
        {execution.debugUrl && execution.status === "executing" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-primary p-0"
            onClick={() => openExternalUrl(execution.debugUrl!)}
          >
            <ExternalLink className="w-3 h-3" />
            Watch live
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
