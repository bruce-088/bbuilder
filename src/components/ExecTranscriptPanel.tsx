import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, ExternalLink, RefreshCw, Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";
import { openExternalUrl } from "@/lib/openExternalUrl";

const EXEC_BASE_URL = "https://exec-yrr3l5.abacusai.app";

interface ExecTranscriptPanelProps {
  ideaId: string;
  initialTranscript?: string | null;
  onTranscriptUpdate?: (transcript: string) => void;
}

export default function ExecTranscriptPanel({
  ideaId,
  initialTranscript,
  onTranscriptUpdate,
}: ExecTranscriptPanelProps) {
  const [transcript, setTranscript] = useState<string>(initialTranscript ?? "");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setTranscript(initialTranscript ?? "");
  }, [initialTranscript, ideaId]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-exec-transcript",
        { body: { idea_id: ideaId } },
      );
      if (error) throw error;
      const next = (data as { transcript?: string })?.transcript ?? "";
      if (!next) throw new Error("Empty transcript returned");
      setTranscript(next);
      onTranscriptUpdate?.(next);
      toast.success("Exec transcript generated");
    } catch (e) {
      console.error(e);
      toast.error(`Failed to generate transcript: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }, [ideaId, onTranscriptUpdate]);

  // Auto-generate on first open if missing
  useEffect(() => {
    if (!initialTranscript && ideaId && !generating && !transcript) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast.success("Transcript copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpenExec = () => {
    if (!transcript) return;
    const url = `${EXEC_BASE_URL}/?transcript=${encodeURIComponent(transcript)}`;
    openExternalUrl(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-500">
          <Terminal className="w-4 h-4" />
          <span className="font-medium text-sm">Exec Browser Transcript</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleCopy}
            disabled={!transcript || generating}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleOpenExec}
            disabled={!transcript || generating}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Exec
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={generate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {generating ? "Generating..." : "Regenerate"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Plain-English browser automation. Paste it into{" "}
        <span className="font-mono text-foreground">{EXEC_BASE_URL}</span> or
        click <strong>Open Exec</strong> to launch with the transcript pre-filled.
      </p>

      <div className="rounded-md border border-emerald-500/20 bg-card">
        <ScrollArea className="h-[280px]">
          {generating && !transcript ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Drafting your Exec transcript...
            </div>
          ) : transcript ? (
            <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap text-foreground">
              {transcript}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No transcript yet — click Regenerate.
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
