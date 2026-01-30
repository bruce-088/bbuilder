import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export interface FixStep {
  id: string;
  action: "add" | "edit" | "connect" | "configure";
  nodeName: string;
  description: string;
  parameters?: Record<string, unknown>;
  credentialsNeeded?: string;
  n8nLink?: string;
}

interface FixChecklistProps {
  steps: FixStep[];
  onComplete?: () => void;
}

export default function FixChecklist({ steps, onComplete }: FixChecklistProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const allCompleted = completedSteps.size === steps.length;

  const copyParameters = async (params: Record<string, unknown>, stepId: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(params, null, 2));
      setCopiedId(stepId);
      toast.success("Parameters copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const getActionBadgeColor = (action: FixStep["action"]) => {
    switch (action) {
      case "add":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "edit":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "connect":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "configure":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    }
  };

  if (steps.length === 0) return null;

  return (
    <div className="border border-primary/30 rounded-lg bg-primary/5 overflow-hidden">
      <div className="p-3 border-b border-primary/20 bg-primary/10">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Fix Checklist</span>
          <Badge variant="outline" className="text-xs">
            {completedSteps.size}/{steps.length} complete
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {steps.map((step, index) => (
          <Collapsible
            key={step.id}
            open={expandedStep === step.id}
            onOpenChange={(open) => setExpandedStep(open ? step.id : null)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors text-left">
                <Checkbox
                  checked={completedSteps.has(step.id)}
                  onCheckedChange={() => toggleStep(step.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Step {index + 1}
                    </span>
                    <Badge className={getActionBadgeColor(step.action)}>
                      {step.action}
                    </Badge>
                    <span
                      className={`font-medium text-sm ${
                        completedSteps.has(step.id) ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {step.nodeName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {step.description}
                  </p>
                </div>
                {expandedStep === step.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            </CollapsibleTrigger>

            <AnimatePresence>
              {expandedStep === step.id && (
                <CollapsibleContent forceMount asChild>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-3 pb-3 pl-10 space-y-3">
                      <p className="text-sm">{step.description}</p>

                      {step.parameters && Object.keys(step.parameters).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Parameters to set:
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => copyParameters(step.parameters!, step.id)}
                            >
                              {copiedId === step.id ? (
                                <Check className="w-3 h-3 mr-1 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3 mr-1" />
                              )}
                              Copy
                            </Button>
                          </div>
                          <pre className="text-xs bg-muted/50 rounded-md p-2 overflow-x-auto max-h-32">
                            {JSON.stringify(step.parameters, null, 2)}
                          </pre>
                        </div>
                      )}

                      {step.credentialsNeeded && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Credentials:</span>
                          <Badge variant="outline">{step.credentialsNeeded}</Badge>
                        </div>
                      )}

                      {step.n8nLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          asChild
                        >
                          <a href={step.n8nLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                            Open in n8n
                          </a>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </CollapsibleContent>
              )}
            </AnimatePresence>
          </Collapsible>
        ))}
      </div>

      {allCompleted && onComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border-t border-primary/20 bg-green-500/10"
        >
          <Button
            onClick={onComplete}
            className="w-full bg-gradient-primary"
          >
            All steps complete! Verify the fix →
          </Button>
        </motion.div>
      )}
    </div>
  );
}
