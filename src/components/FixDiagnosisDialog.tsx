import { useState, useEffect } from "react";
import { Copy, Check, Wrench, Loader2, AlertTriangle, Sparkles } from "lucide-react";
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
import ReactMarkdown from "react-markdown";
import { VerificationData } from "@/lib/verificationPromptGenerator";
import { generateFixPrompt, BusinessIdeaData } from "@/lib/fixPromptGenerator";

interface FixDiagnosisDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  stepText: string;
  verificationData: VerificationData;
  stageTitle: string;
  businessIdea?: BusinessIdeaData;
  stepIndex: number;
  trigger?: React.ReactNode;
}

export default function FixDiagnosisDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  stepText,
  verificationData,
  stageTitle,
  businessIdea,
  stepIndex,
  trigger,
}: FixDiagnosisDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  
  const [diagnosis, setDiagnosis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

  useEffect(() => {
    if (open && !hasStartedGeneration) {
      setDiagnosis("");
      setError(null);
      setHasStartedGeneration(true);
      generateDiagnosis();
    }
    if (!open) {
      setHasStartedGeneration(false);
    }
  }, [open]);

  const generateDiagnosis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-fix`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          stepText,
          checkDescription: verificationData.checkDescription,
          failureIndicators: verificationData.failureIndicators,
          successIndicators: verificationData.successIndicators,
          automatedActions: verificationData.automatedActions,
          stageTitle,
          businessContext: businessIdea ? {
            businessName: businessIdea.businessName,
            niche: businessIdea.niche,
            targetAudience: businessIdea.targetAudience,
          } : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              setDiagnosis(prev => prev + content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              setDiagnosis(prev => prev + content);
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch (err) {
      console.error("Diagnosis error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate diagnosis");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success(`${section} copied to clipboard!`);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const extractDirectorPrompt = (): string => {
    // Try to extract the Director.ai prompt from the diagnosis
    const codeBlockMatch = diagnosis.match(/```[\s\S]*?```/g);
    if (codeBlockMatch && codeBlockMatch.length > 0) {
      // Get the last code block (usually the Director.ai prompt)
      const lastBlock = codeBlockMatch[codeBlockMatch.length - 1];
      return lastBlock.replace(/```\w*\n?/g, '').trim();
    }
    return "";
  };

  const getFullFixPrompt = (): string => {
    if (!businessIdea) {
      return diagnosis;
    }
    
    // Extract root cause from diagnosis for context
    const rootCauseMatch = diagnosis.match(/## 🔍 Root Cause Analysis[\s\S]*?(?=## 🔧|$)/);
    const rootCause = rootCauseMatch ? rootCauseMatch[0].replace("## 🔍 Root Cause Analysis", "").trim() : "";
    
    return generateFixPrompt(
      stepText,
      verificationData,
      stageTitle,
      businessIdea,
      rootCause || "See diagnosis above for details."
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Fix: Step {stepIndex + 1} - {stageTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <strong>Failed Check:</strong> {verificationData.checkDescription}
          </p>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <p className="text-destructive text-center">{error}</p>
            <Button onClick={generateDiagnosis} variant="outline">
              Retry Diagnosis
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => copyToClipboard(diagnosis, "Diagnosis")}
                variant="outline"
                size="sm"
                disabled={!diagnosis || isLoading}
                className="gap-2"
              >
                {copiedSection === "Diagnosis" ? (
                  <><Check className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Full Diagnosis</>
                )}
              </Button>
              <Button
                onClick={() => copyToClipboard(extractDirectorPrompt(), "Director.ai Prompt")}
                variant="default"
                size="sm"
                disabled={!extractDirectorPrompt() || isLoading}
                className="gap-2"
              >
                {copiedSection === "Director.ai Prompt" ? (
                  <><Check className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Copy Fix Prompt</>
                )}
              </Button>
              <Button
                onClick={() => copyToClipboard(getFullFixPrompt(), "Full Fix Prompt")}
                variant="secondary"
                size="sm"
                disabled={!diagnosis || isLoading}
                className="gap-2"
              >
                {copiedSection === "Full Fix Prompt" ? (
                  <><Check className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Director.ai Full Prompt</>
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[55vh] rounded-lg border border-border/50 bg-background overflow-hidden">
              <div className="p-4 pr-6">
                {isLoading && !diagnosis ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">
                      Analyzing failure and generating fix...
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{diagnosis}</ReactMarkdown>
                    {isLoading && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-amber-600">
            <Sparkles className="w-4 h-4" />
            How to Use This Fix
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Review the root cause analysis to understand the issue</li>
            <li>2. Follow the manual fix instructions, OR</li>
            <li>3. Copy the Director.ai prompt and paste into Director.ai</li>
            <li>4. Director.ai will automate the fix steps</li>
            <li>5. Re-run verification to confirm the fix worked</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
