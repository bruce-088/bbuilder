import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Bot, FileCode, ExternalLink, Check, Sparkles, Loader2, ThumbsUp, Copy, Eye, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFixKnowledgeBase } from "@/hooks/useFixKnowledgeBase";
import { useBrowserbaseAutomation } from "@/hooks/useBrowserbaseAutomation";

interface FixGuidancePopoverProps {
  trigger: React.ReactNode;
  fixDetails: string;
  directorAiPrompt?: string;
  onCopy: () => void;
  copied: boolean;
  nodeType?: string;
  issueType?: string;
  rootCause?: string;
  solutionSummary?: string;
  workflowName?: string;
  n8nInstanceUrl?: string;
  workflowId?: string;
}

export function FixGuidancePopover({ 
  trigger, 
  fixDetails, 
  directorAiPrompt, 
  onCopy, 
  copied,
  nodeType,
  issueType,
  rootCause,
  solutionSummary,
  workflowName,
  n8nInstanceUrl,
  workflowId,
}: FixGuidancePopoverProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [markedAsFixed, setMarkedAsFixed] = useState(false);
  const [directorCopied, setDirectorCopied] = useState(false);
  const { saveSuccessfulFix, isSaving } = useFixKnowledgeBase();
  const browserbase = useBrowserbaseAutomation();

  // Use enhanced prompt if available, otherwise fall back to basic details
  const promptToCopy = directorAiPrompt || fixDetails;
  const hasEnhancedPrompt = !!directorAiPrompt;
  
  // Get n8n URL from props or localStorage
  const effectiveN8nUrl = n8nInstanceUrl || localStorage.getItem("n8n_workflow_path") || "";

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
          title: "Automation Fix Help",
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the new chat with fix context
      navigate(`/chat/${conversation.id}`, {
        state: {
          initialPrompt: `I need help with this automation fix:\n\n${fixDetails}`,
        },
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to start chat. Please try again.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptToCopy);
    onCopy();
  };

  const handleCopyDirectorPrompt = () => {
    if (!directorAiPrompt) {
      toast.error("Director.ai prompt not available");
      return;
    }
    
    navigator.clipboard.writeText(directorAiPrompt);
    setDirectorCopied(true);
    toast.success("Director.ai prompt copied!");
    setTimeout(() => setDirectorCopied(false), 3000);
  };

  const handleRunBrowserbase = async () => {
    if (!hasEnhancedPrompt) {
      toast.error("Enhanced prompt required for automation");
      return;
    }

    if (!effectiveN8nUrl) {
      toast.error("n8n instance URL not configured. Please set it in settings.");
      return;
    }

    await browserbase.startAutomation({
      fixPrompt: directorAiPrompt!,
      n8nInstanceUrl: effectiveN8nUrl,
      workflowId: workflowId,
      workflowName: workflowName,
    });
  };

  const handleMarkAsFixed = async () => {
    if (!nodeType || !issueType) {
      toast.error("Missing fix context");
      return;
    }

    const success = await saveSuccessfulFix({
      nodeType,
      issueType,
      fixPrompt: promptToCopy,
      rootCause,
      solutionSummary,
      workflowName,
    });

    if (success) {
      setMarkedAsFixed(true);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <FileCode className="h-4 w-4 text-primary" />
            )}
            <span className="font-medium text-sm">
              {copied ? "Prompt Copied!" : "Copy Fix Prompt"}
            </span>
            {hasEnhancedPrompt && !copied && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Enhanced
              </Badge>
            )}
          </div>

          {hasEnhancedPrompt && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
              ✨ Enhanced prompt includes your n8n URL, business context, step-by-step browser actions, and validation criteria.
            </p>
          )}

          {/* Browserbase Automation Section */}
          {hasEnhancedPrompt && effectiveN8nUrl && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                🤖 AI Browser Agent
              </p>
              
              {/* Run Browserbase Automation */}
              <button
                onClick={handleRunBrowserbase}
                disabled={browserbase.isRunning}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                  {browserbase.isRunning ? (
                    <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-400">
                    {browserbase.isRunning ? "Running automation..." : "Run Auto-Fix"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI browser agent executes the fix
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  New
                </Badge>
              </button>

              {/* Live Session Link */}
              {browserbase.debugUrl && (
                <a
                  href={browserbase.debugUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-md hover:bg-blue-500/20 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Watch live session
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )}

              {/* Status indicator */}
              {browserbase.status !== "idle" && (
                <div className={`text-xs px-2 py-1 rounded ${
                  browserbase.status === "completed" 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : browserbase.status === "failed" 
                    ? "bg-red-500/10 text-red-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}>
                  Status: {browserbase.status}
                  {browserbase.error && ` - ${browserbase.error}`}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Or paste this prompt in:
          </p>

          <div className="space-y-2">
            {/* Chat with Mya */}
            <button
              onClick={handleChatWithMya}
              disabled={isCreatingChat}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                {isCreatingChat ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {isCreatingChat ? "Opening chat..." : "Mya Chat"}
                </p>
                <p className="text-xs text-muted-foreground">Get step-by-step walkthrough</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>

            {/* Director.ai / Computer Use - Clickable copy */}
            <button
              onClick={handleCopyDirectorPrompt}
              disabled={!hasEnhancedPrompt}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                hasEnhancedPrompt 
                  ? "bg-primary/5 border border-primary/20 hover:bg-primary/10 cursor-pointer" 
                  : "bg-muted/50 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                hasEnhancedPrompt ? "bg-primary/10" : "bg-muted"
              }`}>
                {directorCopied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Bot className={`h-4 w-4 ${hasEnhancedPrompt ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {directorCopied ? "Copied!" : "Director.ai / Claude Computer Use"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasEnhancedPrompt 
                    ? "Click to copy optimized prompt" 
                    : "Enhanced prompt not available"
                  }
                </p>
              </div>
              {hasEnhancedPrompt && !directorCopied && (
                <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              {hasEnhancedPrompt && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  Best
                </Badge>
              )}
            </button>

            {/* n8n Editor */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">n8n Workflow Editor</p>
                <p className="text-xs text-muted-foreground">Reference while manually configuring</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!copied && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopyPrompt}
              >
                Copy to Clipboard
              </Button>
            )}

            {nodeType && issueType && (
              <Button
                variant={markedAsFixed ? "default" : "outline"}
                size="sm"
                className={markedAsFixed ? "flex-1 bg-emerald-600 hover:bg-emerald-700" : "flex-1"}
                onClick={handleMarkAsFixed}
                disabled={isSaving || markedAsFixed}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : markedAsFixed ? (
                  <Check className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                )}
                {markedAsFixed ? "Saved!" : "Mark as Fixed"}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
