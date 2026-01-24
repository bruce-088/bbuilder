import { useState } from "react";
import { Copy, Download, Check, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { generateQuestPrompt, getQuestPromptTitle, QuestPromptData } from "@/lib/questPromptGenerator";

interface QuestPromptDialogProps {
  questId: string;
  questTitle: string;
  trigger?: React.ReactNode;
  industry?: string;
  businessIdea?: {
    name?: string;
    niche?: string;
    targetAudience?: string;
  };
}

export default function QuestPromptDialog({
  questId,
  questTitle,
  trigger,
  industry,
  businessIdea
}: QuestPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const promptData: QuestPromptData = {
    questId,
    questTitle,
    industry,
    businessIdea
  };

  const prompt = generateQuestPrompt(promptData);
  const promptTitle = getQuestPromptTitle(questId);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy prompt");
    }
  };

  const downloadAsMarkdown = () => {
    const blob = new Blob([prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mya-prompt-${questId}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Prompt downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="sr-only md:not-sr-only md:inline">Prompt</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Mya-Style Prompt: {promptTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={copyToClipboard}
            variant="default"
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={downloadAsMarkdown}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download .md
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh] rounded-lg border border-border/50 bg-muted/30">
          <pre className="p-4 text-sm whitespace-pre-wrap font-mono">
            {prompt}
          </pre>
        </ScrollArea>

        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            How to Use This Prompt
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Copy the prompt above</li>
            <li>2. Paste it into ChatGPT, Claude, Gemini, or your preferred AI</li>
            <li>3. The AI will generate content in Mya's structured format</li>
            <li>4. Copy the results back to use in your business planning</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
