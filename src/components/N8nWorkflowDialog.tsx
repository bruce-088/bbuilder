import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Workflow, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface N8nWorkflowDialogProps {
  businessIdeaId: string;
  businessName: string;
  trigger?: React.ReactNode;
}

interface AiPrompt {
  id?: string;
  prompt_content: string;
  prompt_type: string;
  created_at?: string;
}

export default function N8nWorkflowDialog({
  businessIdeaId,
  businessName,
  trigger,
}: N8nWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState<AiPrompt | null>(null);
  const [copied, setCopied] = useState(false);

  const generateWorkflow = async (regenerate = false) => {
    setLoading(true);
    try {
      // If regenerating, we need to delete the existing prompt first
      if (regenerate && prompt?.id) {
        await supabase
          .from("ai_prompts")
          .delete()
          .eq("id", prompt.id);
        setPrompt(null);
      }

      const { data, error } = await supabase.functions.invoke("generate-n8n-workflow", {
        body: { businessIdeaId },
      });

      if (error) throw error;

      if (data?.prompt) {
        setPrompt(data.prompt);
        if (data.saved) {
          toast.success("n8n workflow generated and saved!");
        } else {
          toast.success("n8n workflow generated!");
        }
      }
    } catch (error) {
      console.error("Error generating n8n workflow:", error);
      toast.error("Failed to generate n8n workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !prompt) {
      generateWorkflow();
    }
  };

  const copyToClipboard = async () => {
    if (!prompt?.prompt_content) return;
    
    try {
      await navigator.clipboard.writeText(prompt.prompt_content);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Workflow className="w-4 h-4" />
            n8n Workflow
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Workflow className="w-5 h-5 text-primary" />
            n8n Workflow Automation
          </DialogTitle>
          <DialogDescription>
            Ready-to-use n8n workflow for <strong>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Generating n8n workflow automation...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
          </div>
        ) : prompt ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateWorkflow(true)}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
            </div>
            <ScrollArea className="flex-1 max-h-[60vh] rounded-lg border bg-muted/50 p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    pre: ({ children }) => (
                      <pre className="bg-background rounded-lg p-4 overflow-x-auto text-xs">
                        {children}
                      </pre>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-background px-1.5 py-0.5 rounded text-xs">
                          {children}
                        </code>
                      ) : (
                        <code className="text-xs">{children}</code>
                      );
                    },
                  }}
                >
                  {prompt.prompt_content}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Failed to generate workflow
              </p>
              <Button onClick={() => generateWorkflow()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
