import { useState, useMemo } from "react";
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
  KeyRound,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WorkflowSnapshot, WorkflowNode } from "@/hooks/useN8nWorkflowContext";
import { motion, AnimatePresence } from "framer-motion";

interface NodeIssue {
  type: "credentials" | "parameters" | "placeholder" | "empty";
  message: string;
  severity: "error" | "warning";
}

interface NodeAnalysis {
  node: WorkflowNode;
  isConfigured: boolean;
  issues: NodeIssue[];
}

// Nodes that typically require credentials
const CREDENTIAL_REQUIRED_NODES = [
  "googleSheets",
  "gmail",
  "slack",
  "airtable",
  "notion",
  "stripe",
  "hubspot",
  "salesforce",
  "mailchimp",
  "sendgrid",
  "twilio",
  "dropbox",
  "googleDrive",
  "microsoftOutlook",
  "microsoftOneDrive",
  "discord",
  "telegram",
];

// Placeholder patterns that indicate incomplete configuration
const PLACEHOLDER_PATTERNS = [
  /YOUR_.*_KEY/i,
  /YOUR_.*_ID/i,
  /YOUR_.*_URL/i,
  /YOUR_.*_TOKEN/i,
  /SPREADSHEET_ID/i,
  /REPLACE_WITH/i,
  /TODO/i,
  /CHANGEME/i,
  /example\.com/i,
  /placeholder/i,
];

function analyzeNode(node: WorkflowNode): NodeAnalysis {
  const issues: NodeIssue[] = [];
  const shortType = node.type.split(".").pop()?.toLowerCase() || "";
  
  // Check for missing credentials on nodes that need them
  const needsCredentials = CREDENTIAL_REQUIRED_NODES.some(
    (n) => shortType.includes(n.toLowerCase())
  );
  
  // httpRequest nodes often need credentials or API keys
  const isHttpRequest = shortType === "httprequest";
  
  const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
  const hasParameters = node.parameters && Object.keys(node.parameters).length > 0;
  
  // Check if credentials are configured
  if (needsCredentials && !hasCredentials) {
    issues.push({
      type: "credentials",
      message: "Missing credentials",
      severity: "error",
    });
  }
  
  // Check parameters for placeholder values
  if (node.parameters) {
    const paramStr = JSON.stringify(node.parameters);
    
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(paramStr)) {
        issues.push({
          type: "placeholder",
          message: "Contains placeholder values",
          severity: "warning",
        });
        break;
      }
    }
    
    // Check for httpRequest with missing URL or auth
    if (isHttpRequest) {
      const params = node.parameters as Record<string, unknown>;
      const url = params.url as string;
      
      if (!url || url.trim() === "") {
        issues.push({
          type: "parameters",
          message: "Missing URL",
          severity: "error",
        });
      } else if (url.includes("api.") && !hasCredentials) {
        // API calls usually need auth
        const hasAuthHeader = JSON.stringify(params.headerParameters || {})
          .toLowerCase()
          .includes("authorization");
        const hasApiKey = paramStr.toLowerCase().includes("api_key") || 
                         paramStr.toLowerCase().includes("apikey");
        
        if (!hasAuthHeader && !hasApiKey) {
          issues.push({
            type: "credentials",
            message: "API call may need authentication",
            severity: "warning",
          });
        }
      }
    }
  }
  
  // Check for empty/unconfigured nodes (excluding triggers and noOp)
  const isUtilityNode = ["scheduletrigger", "webhook", "noop", "set", "if", "code", "wait"].includes(shortType);
  if (!hasParameters && !isUtilityNode) {
    issues.push({
      type: "empty",
      message: "No parameters configured",
      severity: "warning",
    });
  }
  
  const isConfigured = issues.filter(i => i.severity === "error").length === 0;
  
  return { node, isConfigured, issues };
}

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

  // Analyze all nodes for configuration issues
  const nodeAnalyses = useMemo(() => {
    if (!snapshot?.nodes) return [];
    return snapshot.nodes.map(analyzeNode);
  }, [snapshot?.nodes]);

  const configuredCount = nodeAnalyses.filter((a) => a.isConfigured).length;
  const warningCount = nodeAnalyses.filter(
    (a) => a.issues.some((i) => i.severity === "warning")
  ).length;
  const errorCount = nodeAnalyses.filter(
    (a) => a.issues.some((i) => i.severity === "error")
  ).length;

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
                  <Badge 
                    variant={errorCount > 0 ? "destructive" : configuredCount === totalNodes ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {configuredCount}/{totalNodes} ready
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errorCount} errors
                    </Badge>
                  )}
                  {warningCount > 0 && errorCount === 0 && (
                    <Badge variant="outline" className="text-xs gap-1 border-warning/50 text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      {warningCount} warnings
                    </Badge>
                  )}
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
                <div className="border-t border-border/50 p-3 space-y-2 max-h-64 overflow-y-auto">
                  {nodeAnalyses.map(({ node, isConfigured, issues }) => {
                    const hasErrors = issues.some((i) => i.severity === "error");
                    const hasWarnings = issues.some((i) => i.severity === "warning");

                    return (
                      <div
                        key={node.id || node.name}
                        className={`py-2 px-3 rounded-md bg-background/50 ${
                          hasErrors ? "border border-destructive/30" : 
                          hasWarnings ? "border border-warning/30" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isConfigured && !hasWarnings ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                            ) : hasErrors ? (
                              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                            )}
                            <span className="text-sm font-medium">{node.name}</span>
                          </div>
                          <Badge
                            variant={isConfigured && !hasWarnings ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {node.type.split(".").pop()}
                          </Badge>
                        </div>
                        
                        {issues.length > 0 && (
                          <div className="mt-1.5 pl-5 space-y-1">
                            {issues.map((issue, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 text-xs ${
                                  issue.severity === "error" 
                                    ? "text-destructive" 
                                    : "text-warning"
                                }`}
                              >
                                {issue.type === "credentials" ? (
                                  <KeyRound className="w-3 h-3" />
                                ) : (
                                  <Settings2 className="w-3 h-3" />
                                )}
                                {issue.message}
                              </div>
                            ))}
                          </div>
                        )}
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
