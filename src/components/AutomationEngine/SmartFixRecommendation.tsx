import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Zap, 
  MessageSquare, 
  Bot, 
  Copy, 
  ChevronDown,
  Loader2,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FixMethod = "auto" | "mya" | "director" | "manual";

interface FixRecommendation {
  method: FixMethod;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface SmartFixRecommendationProps {
  fixDetails: string;
  directorAiPrompt?: string;
  nodeType?: string;
  issueType?: string;
  isAutomatable?: boolean;
  preferredMethod?: FixMethod;
  onRunAutoFix?: () => Promise<void>;
  onChatWithMya?: () => Promise<void>;
  onCopyDirectorPrompt?: () => void;
  onCopyPrompt?: () => void;
  isAutoFixRunning?: boolean;
  isChatLoading?: boolean;
}

function getRecommendation(
  isAutomatable: boolean,
  hasDirectorPrompt: boolean,
  preferredMethod?: FixMethod
): FixRecommendation {
  // If user has a preferred method and it's available, respect it
  if (preferredMethod === "auto" && isAutomatable) {
    return {
      method: "auto",
      confidence: "high",
      reason: "Your preferred fix method",
    };
  }
  if (preferredMethod === "mya") {
    return {
      method: "mya",
      confidence: "high",
      reason: "Your preferred fix method",
    };
  }
  if (preferredMethod === "director" && hasDirectorPrompt) {
    return {
      method: "director",
      confidence: "high",
      reason: "Your preferred fix method",
    };
  }

  // Smart recommendation based on context
  if (isAutomatable) {
    return {
      method: "auto",
      confidence: "high",
      reason: "AI can fix this automatically in your browser",
    };
  }

  if (hasDirectorPrompt) {
    return {
      method: "director",
      confidence: "medium",
      reason: "Optimized prompt for external AI agents",
    };
  }

  return {
    method: "mya",
    confidence: "medium",
    reason: "Get step-by-step guidance from Mya",
  };
}

export function SmartFixRecommendation({
  fixDetails,
  directorAiPrompt,
  nodeType,
  issueType,
  isAutomatable = false,
  preferredMethod,
  onRunAutoFix,
  onChatWithMya,
  onCopyDirectorPrompt,
  onCopyPrompt,
  isAutoFixRunning = false,
  isChatLoading = false,
}: SmartFixRecommendationProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasDirectorPrompt = !!directorAiPrompt;
  const recommendation = getRecommendation(isAutomatable, hasDirectorPrompt, preferredMethod);

  const handleCopy = () => {
    navigator.clipboard.writeText(fixDetails);
    setCopied(true);
    onCopyPrompt?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDirector = () => {
    if (directorAiPrompt) {
      navigator.clipboard.writeText(directorAiPrompt);
      setCopied(true);
      onCopyDirectorPrompt?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Primary action based on recommendation
  const renderPrimaryAction = () => {
    switch (recommendation.method) {
      case "auto":
        return (
          <Button
            onClick={onRunAutoFix}
            disabled={isAutoFixRunning}
            className="w-full bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            {isAutoFixRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing automatically...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Fix it for me
              </>
            )}
          </Button>
        );
      case "mya":
        return (
          <Button
            onClick={onChatWithMya}
            disabled={isChatLoading}
            className="w-full"
            size="lg"
          >
            {isChatLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening chat...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Let Mya help
              </>
            )}
          </Button>
        );
      case "director":
        return (
          <Button
            onClick={handleCopyDirector}
            className="w-full"
            size="lg"
            variant={copied ? "secondary" : "default"}
          >
            {copied ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Copy AI Agent Prompt
              </>
            )}
          </Button>
        );
      default:
        return (
          <Button onClick={handleCopy} className="w-full" size="lg">
            <Copy className="h-4 w-4 mr-2" />
            Copy Fix Instructions
          </Button>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Recommendation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              recommendation.confidence === "high" && "bg-success/10 text-success border-success/30",
              recommendation.confidence === "medium" && "bg-warning/10 text-warning border-warning/30",
              recommendation.confidence === "low" && "bg-destructive/10 text-destructive border-destructive/30"
            )}
          >
            {recommendation.confidence === "high" ? "Recommended" : "Suggested"}
          </Badge>
          {nodeType && issueType && (
            <span className="text-xs text-muted-foreground">
              {nodeType} · {issueType}
            </span>
          )}
        </div>
      </div>

      {/* Recommendation reason */}
      <p className="text-sm text-muted-foreground">
        {recommendation.reason}
      </p>

      {/* Primary action */}
      {renderPrimaryAction()}

      {/* Alternative methods */}
      <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn(
              "h-4 w-4 mr-2 transition-transform",
              showAlternatives && "rotate-180"
            )} />
            Other ways to fix...
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {/* Show alternatives not shown as primary */}
          {recommendation.method !== "auto" && isAutomatable && onRunAutoFix && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-success"
              onClick={onRunAutoFix}
              disabled={isAutoFixRunning}
            >
              <Zap className="h-4 w-4 mr-2" />
              Auto-fix with AI browser agent
            </Button>
          )}
          
          {recommendation.method !== "mya" && onChatWithMya && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onChatWithMya}
              disabled={isChatLoading}
            >
              <MessageSquare className="h-4 w-4 mr-2 text-primary" />
              Chat with Mya for guidance
            </Button>
          )}
          
          {recommendation.method !== "director" && hasDirectorPrompt && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleCopyDirector}
            >
              <Bot className="h-4 w-4 mr-2" />
              Copy for Director.ai / Claude
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy raw fix prompt
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
