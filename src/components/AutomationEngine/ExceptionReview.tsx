import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, XCircle, ChevronDown, ExternalLink, Copy, Sparkles, 
  Loader2, CheckCircle2, Lightbulb, Shield, ListChecks, MessageSquare,
  Play, Zap, Hand
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FixGuidancePopover } from "./FixGuidancePopover";
import { generateDirectorAiFixPrompt, type BusinessContext, type FixIssue } from "@/lib/directorAiFixPromptGenerator";
import { type DirectorAiOptions } from "@/lib/directorAiPromptGenerator";
import type { PhaseResult } from "@/hooks/useAutomationRun";

type FilterType = "all" | "errors" | "warnings";

export interface AIFix {
  phase: string;
  rootCause: string;
  solution: string;
  steps: string[];
  prevention: string;
  confidence: "high" | "medium" | "low";
  automatable: boolean;
  automationMethod?: "workflow_json" | "api_call" | "none";
  workflowPatch?: Record<string, unknown>;
  requiredUserAction?: string;
}

interface AIFixResult {
  fixes: AIFix[];
  requiresManualAction: boolean;
  originalExceptions: number;
  provider: string;
}

export interface ExceptionReviewProps {
  exceptions: PhaseResult[];
  onApplyAIFixes?: () => Promise<PhaseResult | null>;
  onExecuteFix?: (fix: AIFix) => Promise<{ success: boolean; message: string; updatedWorkflowJson?: object; importUrl?: string }>;
  businessIdeaId?: string;
  businessContext?: BusinessContext;
  n8nOptions?: DirectorAiOptions;
}

export function ExceptionReview({ 
  exceptions, 
  onApplyAIFixes, 
  onExecuteFix, 
  businessIdeaId,
  businessContext,
  n8nOptions 
}: ExceptionReviewProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [fixResult, setFixResult] = useState<AIFixResult | null>(null);
  const [expandedFixes, setExpandedFixes] = useState<Set<number>>(new Set([0]));
  const [executingFixes, setExecutingFixes] = useState<Set<number>>(new Set());
  const [copiedFixes, setCopiedFixes] = useState<Set<number>>(new Set());

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const copyDetails = (exception: PhaseResult) => {
    const text = `Phase: ${exception.phase}\nStatus: ${exception.status}\nMessage: ${exception.message}\nData: ${JSON.stringify(exception.data, null, 2)}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Exception details have been copied.",
    });
  };

  const handleApplyAIFixes = async () => {
    if (!onApplyAIFixes) return;
    
    setIsApplyingFixes(true);
    try {
      const result = await onApplyAIFixes();
      if (result?.data) {
        const data = result.data as unknown as AIFixResult;
        setFixResult(data);
        toast({
          title: "AI Analysis Complete",
          description: `Generated ${data.fixes?.length || 0} fix recommendations.`,
        });
      }
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: "Could not apply AI fixes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingFixes(false);
    }
  };

  const handleExecuteFix = async (fix: AIFix, index: number) => {
    if (!onExecuteFix) return;

    setExecutingFixes((prev) => new Set(prev).add(index));
    try {
      const result = await onExecuteFix(fix);
      if (result.success) {
        toast({
          title: "Fix Executed Successfully",
          description: result.message,
        });
        if (result.importUrl) {
          window.open(result.importUrl, "_blank");
        }
      } else {
        toast({
          title: "Fix Execution Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fix Execution Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setExecutingFixes((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  // Basic fix details text (for quick reference)
  const getFixDetailsText = (fix: AIFix) => {
    return `Phase: ${fix.phase}\nRoot Cause: ${fix.rootCause}\nSolution: ${fix.solution}\nSteps:\n${fix.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nPrevention: ${fix.prevention}${fix.requiredUserAction ? `\n\nRequired Manual Action: ${fix.requiredUserAction}` : ""}`;
  };

  // Enhanced Director.ai prompt for computer use agents
  const getDirectorAiPrompt = (fix: AIFix): string => {
    const fixIssue: FixIssue = {
      phase: fix.phase,
      rootCause: fix.rootCause,
      solution: fix.solution,
      steps: fix.steps,
      prevention: fix.prevention,
      confidence: fix.confidence,
      automatable: fix.automatable,
      automationMethod: fix.automationMethod,
      requiredUserAction: fix.requiredUserAction,
      workflowPatch: fix.workflowPatch,
    };

    return generateDirectorAiFixPrompt({
      issue: fixIssue,
      businessContext,
      n8nOptions,
    });
  };

  const handleCopyFixDetails = (fix: AIFix, index: number) => {
    const text = getFixDetailsText(fix);
    navigator.clipboard.writeText(text);
    setCopiedFixes((prev) => new Set(prev).add(index));
    setTimeout(() => {
      setCopiedFixes((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 3000);
  };

  const handleChatWithMya = async (fix: AIFix) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to chat with Mya.",
        variant: "destructive",
      });
      return;
    }

    const fixDetails = getFixDetailsText(fix);
    
    try {
      // Create a new conversation first
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: `Fix: ${fix.phase} Phase`,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Navigate to the new conversation with the fix context
      navigate(`/chat/${conversation.id}`, {
        state: {
          initialPrompt: `I need help with this automation fix:\n\n${fixDetails}`,
          n8nContext: {
            workflowId: businessIdeaId || "unknown",
            workflowName: `${fix.phase} Phase Fix`,
            nodes: fix.workflowPatch?.nodes || [],
            connections: fix.workflowPatch?.connections || {},
          },
        },
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Could not start chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleFix = (index: number) => {
    setExpandedFixes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      low: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    };
    return colors[confidence] || colors.medium;
  };

  const errors = exceptions.filter((e) => e.status === "error");
  const warnings = exceptions.filter((e) => e.status === "warning");

  const filteredExceptions = exceptions.filter((e) => {
    if (filter === "all") return true;
    if (filter === "errors") return e.status === "error";
    if (filter === "warnings") return e.status === "warning";
    return true;
  });

  const automatableFixes = fixResult?.fixes?.filter((f) => f.automatable) || [];
  const manualFixes = fixResult?.fixes?.filter((f) => !f.automatable) || [];

  return (
    <Card className="border-amber-200 dark:border-amber-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Review Required
          </CardTitle>
          <Badge variant="outline">
            {errors.length} error{errors.length !== 1 && "s"}, {warnings.length} warning{warnings.length !== 1 && "s"}
          </Badge>
        </div>
        
        {/* Filter and Apply Fixes controls */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="errors">Errors Only</SelectItem>
              <SelectItem value="warnings">Warnings Only</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="default" 
            size="sm"
            onClick={handleApplyAIFixes}
            disabled={isApplyingFixes || !onApplyAIFixes}
            className="gap-2"
          >
            {isApplyingFixes ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Apply Fixes
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredExceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {filter === "all" ? "issues" : filter} to display.
          </p>
        ) : (
          filteredExceptions.map((exception) => (
            <Collapsible
              key={exception.phase}
              open={expandedPhases.has(exception.phase)}
              onOpenChange={() => togglePhase(exception.phase)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    {exception.status === "error" ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium capitalize">{exception.phase}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {exception.message}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform ui-expanded:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg bg-background border space-y-3">
                  <p className="text-sm text-foreground">{exception.message}</p>
                  
                  {exception.data && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(exception.data, null, 2)}
                    </pre>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyDetails(exception)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Details
                    </Button>
                    {exception.status === "warning" && exception.data?.fixes && (
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Fix
                      </Button>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}

        {/* AI Fix Recommendations Panel */}
        {fixResult && fixResult.fixes && fixResult.fixes.length > 0 && (
          <Card className="border-emerald-500/30 bg-emerald-500/5 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
                AI Fix Recommendations
                <Badge variant="outline" className="ml-auto text-xs">
                  {fixResult.fixes.length} fix{fixResult.fixes.length !== 1 && "es"}
                </Badge>
              </CardTitle>
              {/* Summary of automatable vs manual */}
              {fixResult.fixes.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  {automatableFixes.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-emerald-400" />
                      {automatableFixes.length} automatable
                    </span>
                  )}
                  {manualFixes.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Hand className="h-3 w-3 text-amber-400" />
                      {manualFixes.length} manual
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {fixResult.fixes.map((fix, index) => (
                <Collapsible
                  key={index}
                  open={expandedFixes.has(index)}
                  onOpenChange={() => toggleFix(index)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 hover:bg-background cursor-pointer transition-colors border border-border/50">
                      <div className="flex items-center gap-3">
                        {fix.automatable ? (
                          <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Hand className="h-4 w-4 text-amber-400 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium capitalize">{fix.phase} Phase Fix</p>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 ${
                                fix.automatable 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {fix.automatable ? "Automatable" : "Manual"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {fix.solution}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getConfidenceBadge(fix.confidence)}`}>
                          {fix.confidence}
                        </Badge>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform ui-expanded:rotate-180" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-4 rounded-lg bg-background border space-y-4">
                      {/* Automation Status Banner */}
                      {fix.automatable ? (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <Zap className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">
                            Can be Automated
                            {fix.automationMethod && ` via ${fix.automationMethod.replace("_", " ")}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <Hand className="h-4 w-4 text-amber-400" />
                          <span className="text-xs text-amber-400 font-medium">
                            Manual Action Required
                            {fix.requiredUserAction && `: ${fix.requiredUserAction}`}
                          </span>
                        </div>
                      )}

                      {/* Root Cause */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <AlertTriangle className="h-3 w-3" />
                          Root Cause
                        </div>
                        <p className="text-sm text-foreground">{fix.rootCause}</p>
                      </div>

                      {/* Solution Steps */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <ListChecks className="h-3 w-3" />
                          Solution Steps
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-sm">
                          {fix.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="text-foreground/90 pl-1">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Prevention */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <Shield className="h-3 w-3" />
                          Prevention Strategy
                        </div>
                        <p className="text-sm text-foreground/90">{fix.prevention}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t flex flex-wrap items-center gap-2">
                        {fix.automatable ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleExecuteFix(fix, index)}
                              disabled={executingFixes.has(index) || !onExecuteFix}
                              className="gap-2"
                            >
                              {executingFixes.has(index) ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Executing...
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3" />
                                  Execute Fix
                                </>
                              )}
                            </Button>
                            <FixGuidancePopover
                              trigger={
                                <Button variant="outline" size="sm">
                                  <Copy className="h-3 w-3 mr-1" />
                                  {copiedFixes.has(index) ? "Copied!" : "Copy Fix Details"}
                                </Button>
                              }
                              fixDetails={getFixDetailsText(fix)}
                              directorAiPrompt={getDirectorAiPrompt(fix)}
                              onCopy={() => handleCopyFixDetails(fix, index)}
                              copied={copiedFixes.has(index)}
                            />
                          </>
                        ) : (
                          <>
                            <FixGuidancePopover
                              trigger={
                                <Button variant="outline" size="sm">
                                  <Copy className="h-3 w-3 mr-1" />
                                  {copiedFixes.has(index) ? "Copied!" : "Copy Fix Details"}
                                </Button>
                              }
                              fixDetails={getFixDetailsText(fix)}
                              directorAiPrompt={getDirectorAiPrompt(fix)}
                              onCopy={() => handleCopyFixDetails(fix, index)}
                              copied={copiedFixes.has(index)}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleChatWithMya(fix)}
                              className="gap-2"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Open in Mya Chat
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {fixResult.requiresManualAction && manualFixes.length > 0 && (
                <p className="text-xs text-amber-400 flex items-center gap-1 pt-2">
                  <AlertTriangle className="h-3 w-3" />
                  {manualFixes.length} fix{manualFixes.length !== 1 && "es"} require manual action
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground pt-2">
          Review each issue and apply the recommended fixes, or click "Apply Fixes" to let AI handle it.
        </p>
      </CardContent>
    </Card>
  );
}
