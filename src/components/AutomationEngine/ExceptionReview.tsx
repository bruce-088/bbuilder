import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, XCircle, ChevronDown, ExternalLink, Copy, Sparkles, Loader2, CheckCircle2, Lightbulb, Shield, ListChecks } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { PhaseResult } from "@/hooks/useAutomationRun";

type FilterType = "all" | "errors" | "warnings";

interface AIFix {
  phase: string;
  rootCause: string;
  solution: string;
  steps: string[];
  prevention: string;
  confidence: "high" | "medium" | "low";
}

interface AIFixResult {
  fixes: AIFix[];
  requiresManualAction: boolean;
  originalExceptions: number;
  provider: string;
}

interface ExceptionReviewProps {
  exceptions: PhaseResult[];
  onApplyAIFixes?: () => Promise<PhaseResult | null>;
}

export function ExceptionReview({ exceptions, onApplyAIFixes }: ExceptionReviewProps) {
  const { toast } = useToast();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [fixResult, setFixResult] = useState<AIFixResult | null>(null);
  const [expandedFixes, setExpandedFixes] = useState<Set<number>>(new Set([0])); // First fix expanded by default

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
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium capitalize">{fix.phase} Phase Fix</p>
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

                      {/* Copy Button */}
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = `Phase: ${fix.phase}\nRoot Cause: ${fix.rootCause}\nSolution: ${fix.solution}\nSteps:\n${fix.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nPrevention: ${fix.prevention}`;
                            navigator.clipboard.writeText(text);
                            toast({ title: "Copied", description: "Fix details copied to clipboard." });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Fix Details
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {fixResult.requiresManualAction && (
                <p className="text-xs text-amber-400 flex items-center gap-1 pt-2">
                  <AlertTriangle className="h-3 w-3" />
                  These fixes require manual action to implement
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
