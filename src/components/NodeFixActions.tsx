import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import NodeFixGuideDialog from "./NodeFixGuideDialog";

interface NodeFixActionsProps {
  nodeId?: string;
  nodeName?: string;
  nodeType: string;
  issues: string[];
  purpose: string;
  workflowId: string;
  workflowName: string;
  n8nInstanceUrl: string;
  businessContext: {
    businessName: string;
    niche?: string;
  };
  onAskAI?: (prompt: string) => void;
}

export default function NodeFixActions({
  nodeId,
  nodeName,
  nodeType,
  issues,
  purpose,
  workflowId,
  workflowName,
  n8nInstanceUrl,
  businessContext,
  onAskAI
}: NodeFixActionsProps) {
  const [showFixGuide, setShowFixGuide] = useState(false);

  // Extract short node type name for display
  const shortNodeType = nodeType.split('.').pop() || nodeType;

  // Construct direct link to node in n8n
  const getNodeLink = (): string | null => {
    if (!n8nInstanceUrl || !workflowId) return null;
    const baseUrl = n8nInstanceUrl.replace(/\/$/, '');
    // n8n URL format: /workflow/{workflowId} - node selection requires opening the node
    // The nodeId query param helps navigate but may not always work
    return nodeId 
      ? `${baseUrl}/workflow/${workflowId}?nodeId=${nodeId}`
      : `${baseUrl}/workflow/${workflowId}`;
  };

  const nodeLink = getNodeLink();

  // Generate AI prompt for fixing
  const generateAIPrompt = (): string => {
    const issueText = issues.length > 0 ? issues.join(', ') : 'Configuration needed';
    return `Help me fix the "${nodeName || shortNodeType}" node in my n8n workflow "${workflowName}".

**Issue:** ${issueText}
**Node Type:** ${nodeType}
**Node Purpose:** ${purpose}
**Business:** ${businessContext.businessName}${businessContext.niche ? ` (${businessContext.niche})` : ''}

Please:
1. Check the current node configuration via MCP using get_workflow_details
2. Tell me exactly what parameters or credentials need to be configured
3. Provide step-by-step instructions specific to ${shortNodeType}
4. After I make changes, verify the fix was applied correctly`;
  };

  const handleAskAI = async () => {
    const prompt = generateAIPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Fix prompt copied! Paste it in the chat to get AI help.");
      onAskAI?.(prompt);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 ml-4">
      {/* Quick Fix Guide Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => setShowFixGuide(true)}
      >
        <Lightbulb className="w-3 h-3" />
        Quick Fix
      </Button>

      {/* Open in n8n Button */}
      {nodeLink && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href={nodeLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3" />
            Open in n8n
          </a>
        </Button>
      )}

      {/* Ask AI to Fix Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary/80"
        onClick={handleAskAI}
      >
        <Sparkles className="w-3 h-3" />
        Ask AI
      </Button>

      {/* Quick Fix Dialog */}
      <NodeFixGuideDialog
        open={showFixGuide}
        onOpenChange={setShowFixGuide}
        nodeType={nodeType}
        nodeName={nodeName}
        issues={issues}
        purpose={purpose}
        n8nInstanceUrl={n8nInstanceUrl}
        workflowId={workflowId}
      />
    </div>
  );
}
