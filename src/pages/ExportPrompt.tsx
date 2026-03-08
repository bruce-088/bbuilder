import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Copy, Check, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { MASTER_PROMPT } from "@/lib/masterPromptContent";
import { generateMasterPromptPDF } from "@/lib/masterPromptPdfGenerator";

export default function ExportPrompt() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const downloadAsMarkdown = () => {
    const blob = new Blob([MASTER_PROMPT], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Business-Builder-AI_Master_Prompt.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Markdown file!");
  };

  const downloadAsText = () => {
    const blob = new Blob([MASTER_PROMPT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Business-Builder-AI_Master_Prompt.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Text file!");
  };

  const downloadAsPDF = () => {
    try {
      generateMasterPromptPDF(MASTER_PROMPT);
      toast.success("Downloaded as PDF!");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(MASTER_PROMPT);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Export Master Prompt
            </CardTitle>
            <CardDescription>
              Download the complete app specification — paste into ChatGPT, Claude, or Gemini for analysis, then use the Lovable-formatted output to implement updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={downloadAsPDF} className="gap-2">
                <FileDown className="w-4 h-4" />
                Download as PDF
              </Button>
              <Button onClick={downloadAsMarkdown} variant="secondary" className="gap-2">
                <Download className="w-4 h-4" />
                Download as .md
              </Button>
              <Button onClick={downloadAsText} variant="secondary" className="gap-2">
                <Download className="w-4 h-4" />
                Download as .txt
              </Button>
              <Button onClick={copyToClipboard} variant="outline" className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <h3 className="font-semibold mb-2">What's included:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Complete system overview with all current features</li>
                <li>✓ Mission Control, Mya AI, Lead CRM, Workflow Builder specs</li>
                <li>✓ Full database schema (25+ tables)</li>
                <li>✓ 22 Edge Functions with descriptions</li>
                <li>✓ UI/UX design system and page structure</li>
                <li>✓ AI system prompt (Mya persona)</li>
                <li>✓ Tech stack and file structure</li>
                <li>✓ Quick start prompt for Lovable.dev</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border/50 bg-background p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {MASTER_PROMPT.substring(0, 3000)}...
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
