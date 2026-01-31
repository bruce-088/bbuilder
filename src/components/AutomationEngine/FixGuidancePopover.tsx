import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Bot, FileCode, ExternalLink, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface FixGuidancePopoverProps {
  trigger: React.ReactNode;
  fixDetails: string;
  directorAiPrompt?: string;
  onCopy: () => void;
  copied: boolean;
}

export function FixGuidancePopover({ 
  trigger, 
  fixDetails, 
  directorAiPrompt, 
  onCopy, 
  copied 
}: FixGuidancePopoverProps) {
  const navigate = useNavigate();

  // Use enhanced prompt if available, otherwise fall back to basic details
  const promptToCopy = directorAiPrompt || fixDetails;
  const hasEnhancedPrompt = !!directorAiPrompt;

  const handleChatWithMya = () => {
    // Navigate to chat with fix context pre-loaded
    navigate("/chat", {
      state: {
        prefillMessage: `I need help with this automation fix:\n\n${fixDetails}`,
        fixContext: fixDetails,
      },
    });
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptToCopy);
    onCopy();
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
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Mya Chat</p>
                <p className="text-xs text-muted-foreground">Get step-by-step walkthrough</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>

            {/* Director.ai / Computer Use - Now highlighted when enhanced */}
            <div className={`flex items-center gap-3 p-2.5 rounded-lg ${hasEnhancedPrompt ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${hasEnhancedPrompt ? "bg-primary/10" : "bg-muted"}`}>
                <Bot className={`h-4 w-4 ${hasEnhancedPrompt ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Director.ai / Claude Computer Use</p>
                <p className="text-xs text-muted-foreground">
                  {hasEnhancedPrompt 
                    ? "Optimized for browser automation" 
                    : "For automated browser-based fixes"
                  }
                </p>
              </div>
              {hasEnhancedPrompt && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  Best
                </Badge>
              )}
            </div>

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

          {!copied && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCopyPrompt}
            >
              Copy to Clipboard
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
