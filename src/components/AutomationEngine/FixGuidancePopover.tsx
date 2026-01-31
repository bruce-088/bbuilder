import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Bot, FileCode, ExternalLink, Check, Sparkles, Loader2, ThumbsUp, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFixKnowledgeBase } from "@/hooks/useFixKnowledgeBase";

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
}: FixGuidancePopoverProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [markedAsFixed, setMarkedAsFixed] = useState(false);
  const [directorDownloaded, setDirectorDownloaded] = useState(false);
  const { saveSuccessfulFix, isSaving } = useFixKnowledgeBase();

  // Use enhanced prompt if available, otherwise fall back to basic details
  const promptToCopy = directorAiPrompt || fixDetails;
  const hasEnhancedPrompt = !!directorAiPrompt;

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

  const handleDownloadDirectorPrompt = () => {
    if (!directorAiPrompt) {
      toast.error("Director.ai prompt not available");
      return;
    }
    
    const blob = new Blob([directorAiPrompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = Date.now();
    a.download = `director-ai-fix-${nodeType || "automation"}-${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDirectorDownloaded(true);
    toast.success("Director.ai prompt downloaded!");
    setTimeout(() => setDirectorDownloaded(false), 3000);
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

          <p className="text-xs text-muted-foreground">
            Paste this prompt in:
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

            {/* Director.ai / Computer Use - Clickable download */}
            <button
              onClick={handleDownloadDirectorPrompt}
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
                {directorDownloaded ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Bot className={`h-4 w-4 ${hasEnhancedPrompt ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {directorDownloaded ? "Downloaded!" : "Director.ai / Claude Computer Use"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasEnhancedPrompt 
                    ? "Click to download optimized prompt" 
                    : "Enhanced prompt not available"
                  }
                </p>
              </div>
              {hasEnhancedPrompt && !directorDownloaded && (
                <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
