import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, XCircle, ChevronDown, ExternalLink, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { PhaseResult } from "@/hooks/useAutomationRun";

interface ExceptionReviewProps {
  exceptions: PhaseResult[];
}

export function ExceptionReview({ exceptions }: ExceptionReviewProps) {
  const { toast } = useToast();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

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

  const errors = exceptions.filter((e) => e.status === "error");
  const warnings = exceptions.filter((e) => e.status === "warning");

  return (
    <Card className="border-yellow-200 dark:border-yellow-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Review Required
          <Badge variant="outline" className="ml-auto">
            {errors.length} error{errors.length !== 1 && "s"}, {warnings.length} warning{warnings.length !== 1 && "s"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {exceptions.map((exception) => (
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
                      Apply Fixes
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

        <p className="text-xs text-muted-foreground pt-2">
          Review each issue and apply the recommended fixes, or click "Apply Fixes" to let AI handle it.
        </p>
      </CardContent>
    </Card>
  );
}
