import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { N8nContext } from "@/lib/ai";
import NodeFixGuideDialog from "./NodeFixGuideDialog";

const CACHE_KEY = "n8n_cached_workflows";

interface CachedWorkflow {
  name: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    parameters?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }>;
  connections?: Record<string, unknown>;
  capturedAt?: string;
}

interface NodeFixActionsProps {
  nodeId?: string;
  nodeName?: string;
  nodeType: string;
  issues: string[];
  purpose: string;
  workflowId: string;
  workflowName: string;
  n8nInstanceUrl: string;
  nodeParameters?: Record<string, unknown>;
  credentialsConfigured?: boolean;
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
  nodeParameters,
  credentialsConfigured,
  businessContext,
  onAskAI
}: NodeFixActionsProps) {
  const [showFixGuide, setShowFixGuide] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Extract short node type name for display
  const shortNodeType = nodeType.split('.').pop() || nodeType;

  // Load full workflow snapshot from localStorage cache
  const getFullWorkflowSnapshot = useCallback((): CachedWorkflow | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const workflows = JSON.parse(cached) as Record<string, CachedWorkflow>;
      
      // Try to find by workflowId first, then by name
      if (workflows[workflowId]) {
        return workflows[workflowId];
      }
      
      // Search by name as fallback
      const entry = Object.entries(workflows).find(
        ([, wf]) => wf.name === workflowName
      );
      
      return entry ? entry[1] : null;
    } catch (error) {
      console.error("Error loading workflow from cache:", error);
      return null;
    }
  }, [workflowId, workflowName]);

  // Construct direct link to node in n8n
  const getNodeLink = (): string | null => {
    if (!n8nInstanceUrl || !workflowId) return null;
    const baseUrl = n8nInstanceUrl.replace(/\/$/, '');
    return nodeId 
      ? `${baseUrl}/workflow/${workflowId}?nodeId=${nodeId}`
      : `${baseUrl}/workflow/${workflowId}`;
  };

  const nodeLink = getNodeLink();

  // Format node parameters for the prompt (truncate if too large)
  const formatNodeParams = (): string => {
    if (!nodeParameters || Object.keys(nodeParameters).length === 0) {
      return 'No parameters configured';
    }
    
    try {
      const formatted = JSON.stringify(nodeParameters, null, 2);
      // Truncate if too long (keep under 1000 chars for readability)
      if (formatted.length > 1000) {
        return formatted.substring(0, 997) + '...';
      }
      return formatted;
    } catch {
      return 'Unable to read parameters';
    }
  };

  // Generate AI prompt for fixing with full context
  const generateAIPrompt = (): string => {
    const issueText = issues.length > 0 ? issues.join(', ') : 'Configuration needed';
    const paramsSection = nodeParameters && Object.keys(nodeParameters).length > 0
      ? `\n**Current Node Parameters:**\n\`\`\`json\n${formatNodeParams()}\n\`\`\``
      : '';
    
    const credentialsStatus = credentialsConfigured !== undefined
      ? `\n**Credentials Status:** ${credentialsConfigured ? '✅ Connected' : '❌ Not configured'}`
      : '';

    return `Help me fix the "${nodeName || shortNodeType}" node in my n8n workflow "${workflowName}".

**Issue:** ${issueText}
**Node Type:** ${nodeType}
**Node ID:** ${nodeId || 'Unknown'}
**Node Purpose:** ${purpose}${credentialsStatus}
**Business:** ${businessContext.businessName}${businessContext.niche ? ` (${businessContext.niche})` : ''}
${paramsSection}

Based on the current configuration above, please:
1. Identify exactly what's missing or misconfigured
2. Tell me the specific parameters or credentials that need to be added/changed
3. Provide step-by-step instructions to fix the ${shortNodeType} node
4. If credentials are missing, explain how to set them up in n8n
5. After I make changes, use MCP get_workflow_details to verify the fix`;
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

  const handleChatWithMya = async () => {
    if (!user) {
      toast.error("Please sign in to chat with Mya");
      navigate("/auth");
      return;
    }

    setIsCreatingChat(true);

    try {
      // Create a new conversation
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: `Fix: ${nodeName || shortNodeType} node`,
        })
        .select()
        .single();

      if (error) throw error;

      // Load full workflow snapshot from cache
      const fullWorkflow = getFullWorkflowSnapshot();
      
      // Build the n8n context with ALL nodes for better troubleshooting
      const n8nContext: N8nContext = {
        workflowName: fullWorkflow?.name || workflowName,
        workflowId,
        n8nInstanceUrl,
        businessName: businessContext.businessName,
        niche: businessContext.niche,
        // Include all nodes from the cached workflow, not just the current node
        nodes: fullWorkflow?.nodes?.map(node => ({
          name: node.name,
          type: node.type,
          parameters: node.parameters,
          credentials: node.credentials ? { configured: true } : undefined,
        })) || (nodeParameters ? [{
          name: nodeName || shortNodeType,
          type: nodeType,
          parameters: nodeParameters,
          credentials: credentialsConfigured ? { configured: true } : undefined,
        }] : []),
        // Include connections for understanding workflow flow
        connections: fullWorkflow?.connections,
      };

      const prompt = generateAIPrompt();

      // Navigate to the new chat with state
      navigate(`/chat/${conversation.id}`, {
        state: {
          initialPrompt: prompt,
          n8nContext,
        },
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to start chat. Copying prompt instead...");
      // Fallback to clipboard copy
      handleAskAI();
    } finally {
      setIsCreatingChat(false);
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
          onClick={() => window.open(nodeLink, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="w-3 h-3" />
          Open in n8n
        </Button>
      )}

      {/* Chat with Mya Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary/80"
        onClick={handleChatWithMya}
        disabled={isCreatingChat}
      >
        <MessageSquare className="w-3 h-3" />
        {isCreatingChat ? "Opening..." : "Chat with Mya"}
      </Button>

      {/* Ask AI to Copy Prompt Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        onClick={handleAskAI}
      >
        <Sparkles className="w-3 h-3" />
        Copy Prompt
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
