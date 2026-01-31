import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Bot, FileCode, ExternalLink, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FixGuidancePopoverProps {
  trigger: React.ReactNode;
  fixDetails: string;
  onCopy: () => void;
  copied: boolean;
}

export function FixGuidancePopover({ trigger, fixDetails, onCopy, copied }: FixGuidancePopoverProps) {
  const navigate = useNavigate();

  const handleChatWithMya = () => {
    // Navigate to chat with fix context pre-loaded
    navigate("/chat", {
      state: {
        prefillMessage: `I need help with this automation fix:\n\n${fixDetails}`,
        fixContext: fixDetails,
      },
    });
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
              {copied ? "Fix Details Copied!" : "Copy Fix Details"}
            </span>
          </div>

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

            {/* Director.ai / Computer Use */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Director.ai / Claude Computer Use</p>
                <p className="text-xs text-muted-foreground">For automated browser-based fixes</p>
              </div>
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
              onClick={onCopy}
            >
              Copy to Clipboard
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
