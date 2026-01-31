import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Bot, FileCode, ExternalLink, Check, Sparkles, Loader2, ThumbsUp, Copy, Eye, Zap, KeyRound, X, CheckCircle2, XCircle, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFixKnowledgeBase } from "@/hooks/useFixKnowledgeBase";
import { useBrowserbaseAutomation, ActionResult } from "@/hooks/useBrowserbaseAutomation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [showScreenshot, setShowScreenshot] = useState<string | null>(null);
  const { saveSuccessfulFix, isSaving } = useFixKnowledgeBase();
  const browserbase = useBrowserbaseAutomation();

  const promptToCopy = directorAiPrompt || fixDetails;
  const hasEnhancedPrompt = !!directorAiPrompt;
  const effectiveN8nUrl = n8nInstanceUrl || localStorage.getItem("n8n_workflow_path") || "";

  const handleChatWithMya = async () => {
    if (!user) {
      toast.error("Please sign in to chat with Mya");
      navigate("/auth");
      return;
    }

    setIsCreatingChat(true);

    try {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: "Automation Fix Help",
        })
        .select()
        .single();

      if (error) throw error;

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

  const getActionStatusIcon = (result: ActionResult) => {
    if (result.status === "completed") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    } else if (result.status === "failed") {
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    }
    return <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30" />;
  };

  const getActionLabel = (result: ActionResult) => {
    const action = result.action;
    switch (action.type) {
      case "navigate":
        return `Navigate to ${action.url?.substring(0, 30)}...`;
      case "wait":
        return `Wait for ${action.selector?.substring(0, 20) || action.timeout + "ms"}`;
      case "act":
        return action.instruction?.substring(0, 40) + "..." || "Execute action";
      case "screenshot":
        return "Capture screenshot";
      case "extract":
        return "Extract data";
      default:
        return action.type;
    }
  };

  return (
    <>
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    🤖 AI Browser Agent
                  </p>
                  {browserbase.authPersisted && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                      <KeyRound className="h-2.5 w-2.5" />
                      Auth Saved
                    </Badge>
                  )}
                </div>
                
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
                      {browserbase.isExecuting 
                        ? "Executing actions..." 
                        : browserbase.isRunning 
                        ? "Starting session..." 
                        : "Run Auto-Fix"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {browserbase.contextId 
                        ? "Using saved n8n login session" 
                        : "AI browser agent executes the fix"
                      }
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    CDP
                  </Badge>
                </button>

                {/* Execution Progress */}
                {browserbase.executionResults.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-2 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Execution Progress ({browserbase.executionResults.filter(r => r.status === "completed").length}/{browserbase.executionResults.length})
                    </p>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {browserbase.executionResults.map((result, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 text-xs"
                          >
                            {getActionStatusIcon(result)}
                            <span className={`truncate flex-1 ${
                              result.status === "failed" ? "text-red-400" : "text-foreground/80"
                            }`}>
                              {getActionLabel(result)}
                            </span>
                            {result.screenshot && (
                              <button
                                onClick={() => setShowScreenshot(result.screenshot!)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <ImageIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Final Screenshot */}
                {browserbase.result?.finalScreenshot && (
                  <button
                    onClick={() => setShowScreenshot(browserbase.result!.finalScreenshot!)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    View final screenshot
                  </button>
                )}

                {/* Auth persistence hint */}
                {!browserbase.authPersisted && !browserbase.isRunning && (
                  <p className="text-[10px] text-muted-foreground/70 px-1">
                    💡 Log into n8n once during a session to save auth for future runs
                  </p>
                )}

                {/* Clear auth context option */}
                {browserbase.contextId && (
                  <button
                    onClick={() => browserbase.clearStoredContext(effectiveN8nUrl)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                  >
                    <X className="h-3 w-3" />
                    Clear saved login
                  </button>
                )}

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
                  <div className={`text-xs px-2 py-1.5 rounded flex items-center justify-between ${
                    browserbase.status === "completed" 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : browserbase.status === "failed" 
                      ? "bg-red-500/10 text-red-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                    <span>
                      Status: {browserbase.status}
                      {browserbase.error && ` - ${browserbase.error}`}
                    </span>
                    {browserbase.result?.executionTimeMs && (
                      <span className="text-[10px] opacity-70">
                        {(browserbase.result.executionTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}

                {/* Reset button when completed/failed */}
                {(browserbase.status === "completed" || browserbase.status === "failed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={browserbase.reset}
                    className="w-full text-xs"
                  >
                    Run Again
                  </Button>
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

      {/* Screenshot Dialog */}
      <Dialog open={!!showScreenshot} onOpenChange={() => setShowScreenshot(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Automation Screenshot</DialogTitle>
          </DialogHeader>
          {showScreenshot && (
            <div className="relative">
              <img 
                src={`data:image/png;base64,${showScreenshot}`}
                alt="Automation screenshot"
                className="w-full rounded-lg border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
