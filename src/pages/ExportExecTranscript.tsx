import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { openExternalUrl } from "@/lib/openExternalUrl";

const EXEC_BASE_URL = "https://exec-yrr3l5.abacusai.app";

interface DbBusinessIdea {
  id: string;
  business_name: string;
  exec_transcript: string | null;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "business-idea"
  );
}

export default function ExportExecTranscript() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [ideas, setIdeas] = useState<DbBusinessIdea[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("business_ideas")
          .select("id, business_name, exec_transcript" as string)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const rows = (data ?? []) as unknown as DbBusinessIdea[];
        setIdeas(rows);
        if (rows.length > 0) setSelectedId(rows[0].id);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load business plans");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const selected = ideas.find((i) => i.id === selectedId);
  const transcript = selected?.exec_transcript ?? "";

  const regenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-exec-transcript",
        { body: { idea_id: selectedId } },
      );
      if (error) throw error;
      const next = (data as { transcript?: string })?.transcript ?? "";
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === selectedId ? { ...i, exec_transcript: next } : i,
        ),
      );
      toast.success("Transcript regenerated");
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const handleOpenExec = () => {
    if (!transcript) return;
    openExternalUrl(
      `${EXEC_BASE_URL}/?transcript=${encodeURIComponent(transcript)}`,
    );
  };

  const handleDownload = () => {
    if (!selected || !transcript) return;
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(selected.business_name)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded transcript");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Terminal className="w-6 h-6 text-emerald-500" />
              Export Exec Transcript
            </h1>
            <p className="text-muted-foreground text-sm">
              Plain-English browser automation that runs in the Exec app.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Plan</CardTitle>
                <CardDescription>
                  Select an idea to export its Exec transcript.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a business plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {ideas.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={regenerate}
                  disabled={!selectedId || generating}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {generating ? "Generating..." : "Regenerate"}
                </Button>

                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleOpenExec}
                  disabled={!transcript}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Exec
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleCopy}
                  disabled={!transcript}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy Transcript"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDownload}
                  disabled={!transcript}
                >
                  <Download className="w-4 h-4" />
                  Download .txt
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  Transcript Preview
                </CardTitle>
                <CardDescription>
                  Paste this into{" "}
                  <span className="font-mono">{EXEC_BASE_URL}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-emerald-500/20 bg-card">
                  <ScrollArea className="h-[480px]">
                    {transcript ? (
                      <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap text-foreground">
                        {transcript}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-[480px] text-muted-foreground text-sm px-4 text-center">
                        No transcript yet for this idea — click{" "}
                        <strong className="mx-1">Regenerate</strong> to create one.
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
