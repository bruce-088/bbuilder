import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, XCircle, ChevronDown, ExternalLink, Copy, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { PhaseResult } from "@/hooks/useAutomationRun";

type FilterType = "all" | "errors" | "warnings";

interface ExceptionReviewProps {
  exceptions: PhaseResult[];
  onApplyAIFixes?: () => Promise<void>;
}

export function ExceptionReview({ exceptions, onApplyAIFixes }: ExceptionReviewProps) {
  const { toast } = useToast();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);

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
      await onApplyAIFixes();
      toast({
        title: "AI Fixes Applied",
        description: "The AI has analyzed and applied recommended fixes.",
      });
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

  const errors = exceptions.filter((e) => e.status === "error");
  const warnings = exceptions.filter((e) => e.status === "warning");

  const filteredExceptions = exceptions.filter((e) => {
    if (filter === "all") return true;
    if (filter === "errors") return e.status === "error";
    if (filter === "warnings") return e.status === "warning";
    return true;
  });

  return (
    <Card className="border-yellow-200 dark:border-yellow-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
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
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
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

        <p className="text-xs text-muted-foreground pt-2">
          Review each issue and apply the recommended fixes, or click "Apply Fixes" to let AI handle it.
        </p>
      </CardContent>
    </Card>
  );
}
