# Add Export App Spec Feature

Copy and paste the prompt below into any Lovable project to add an "Export App Spec" feature that lets you download/copy the full app specification for analysis by external LLMs (ChatGPT, Claude, Gemini).

---

## 🚀 THE PROMPT

```
Add an "Export App Spec" feature to this app with the following:

## 1. Create Master Prompt Content File

Create `src/lib/masterPromptContent.ts` with this structure:

export const MASTER_PROMPT = `
# [APP NAME] - Complete Application Specification

## Overview
[Brief description of what this app does and its purpose]

## Core Features
[List all major features with descriptions]

## Database Schema
[Document all tables, columns, relationships, and RLS policies]

## Edge Functions
[List all edge functions with their purposes and endpoints]

## UI/UX Design System
- Framework: React + TypeScript + Vite
- Styling: Tailwind CSS with shadcn/ui components
- Color scheme: [describe your theme]
- Typography: [describe fonts used]

## Tech Stack
- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS, shadcn/ui
- Backend: Supabase (via Lovable Cloud)
- State: TanStack Query

## File Structure
[Key directories and their purposes]

---

## Instructions for External LLMs

When suggesting changes to this app, format your response for Lovable.dev:

1. **Use TypeScript** with proper types
2. **Use Tailwind CSS** classes (no custom CSS)
3. **Use shadcn/ui** components from @/components/ui
4. **Use semantic tokens** from the design system (bg-background, text-foreground, etc.)
5. **Import paths** use @/ alias for src/
6. **Supabase client** import from @/integrations/supabase/client
7. **Toast notifications** use sonner's toast function

Example component structure:
\`\`\`tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function MyComponent() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => toast.success("Success!")}>
          Click me
        </Button>
      </CardContent>
    </Card>
  );
}
\`\`\`
`;

## 2. Create PDF Generator

Create `src/lib/masterPromptPdfGenerator.ts`:

import { jsPDF } from "jspdf";

const PURPLE: [number, number, number] = [139, 92, 246];
const DARK_BG: [number, number, number] = [26, 26, 46];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [156, 163, 175];
const BODY_TEXT: [number, number, number] = [60, 60, 60];

export function generateMasterPromptPDF(promptContent: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;
  const cw = pw - m * 2;
  let y = m;

  const checkBreak = (need: number) => {
    if (y + need > ph - 25) {
      doc.addPage();
      y = m;
    }
  };

  // Header
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pw, 45, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("APP SPECIFICATION", m, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PURPLE);
  doc.text("[Your App Name] — Lovable Export Format", m, 30);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pw - m,
    30,
    { align: "right" }
  );
  y = 55;

  // Parse markdown content
  const lines = promptContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("# ")) {
      checkBreak(14);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PURPLE);
      doc.text(trimmed.replace(/^# /, ""), m, y);
      y += 10;
    } else if (trimmed.startsWith("## ")) {
      checkBreak(12);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PURPLE);
      doc.text(trimmed.replace(/^## /, ""), m, y);
      y += 2;
      doc.setDrawColor(...PURPLE);
      doc.setLineWidth(0.5);
      doc.line(m, y, m + 50, y);
      y += 6;
    } else if (trimmed.startsWith("### ")) {
      checkBreak(10);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(trimmed.replace(/^### /, ""), m, y);
      y += 6;
    } else if (trimmed.startsWith("```")) {
      // Skip code fences
    } else if (trimmed === "---") {
      checkBreak(8);
      doc.setDrawColor(...LIGHT_GRAY);
      doc.setLineWidth(0.3);
      doc.line(m, y, pw - m, y);
      y += 6;
    } else if (trimmed === "") {
      y += 3;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BODY_TEXT);
      const wrapped = doc.splitTextToSize(trimmed, cw);
      for (const wl of wrapped) {
        checkBreak(5);
        doc.text(wl, m, y);
        y += 4.5;
      }
    }
  }

  // Footers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...DARK_BG);
    doc.rect(0, ph - 15, pw, 15, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text("[Your App Name] — Master Specification", pw / 2, ph - 6, { align: "center" });
    doc.setTextColor(...PURPLE);
    doc.text(`Page ${i} of ${pages}`, pw - m, ph - 6, { align: "right" });
  }

  doc.save("App-Specification.pdf");
}

## 3. Create Export Page

Create `src/pages/ExportSpec.tsx`:

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Copy, Check, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { MASTER_PROMPT } from "@/lib/masterPromptContent";
import { generateMasterPromptPDF } from "@/lib/masterPromptPdfGenerator";

export default function ExportSpec() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const downloadAsMarkdown = () => {
    const blob = new Blob([MASTER_PROMPT], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "App-Specification.md";
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
    a.download = "App-Specification.txt";
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Export App Specification
            </CardTitle>
            <CardDescription>
              Download the complete app specification — paste into ChatGPT, Claude, or Gemini for analysis.
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

            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 max-h-96 overflow-y-auto">
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

## 4. Add Route to App.tsx

Add this import and route:

import ExportSpec from "./pages/ExportSpec";

// Inside Routes:
<Route path="/export-spec" element={<ExportSpec />} />

## 5. Add jsPDF Dependency

The app needs jspdf package for PDF generation.

## 6. Add Navigation Link (Optional)

Add a link to /export-spec from your dashboard or settings page.

---

After generating, customize the MASTER_PROMPT content in `src/lib/masterPromptContent.ts` with your actual app details: features, database schema, edge functions, etc.
```

---

## 📋 CUSTOMIZATION CHECKLIST

After the feature is added, update these in `src/lib/masterPromptContent.ts`:

- [ ] App name and description
- [ ] List all features
- [ ] Document database tables and columns
- [ ] List edge functions with endpoints
- [ ] Describe color scheme and design tokens
- [ ] Add any app-specific coding conventions

---

## 🎨 OPTIONAL: CUSTOMIZE BRANDING

In `src/lib/masterPromptPdfGenerator.ts`, update:

```typescript
// Change these colors to match your brand
const PURPLE: [number, number, number] = [139, 92, 246]; // Your primary color
const DARK_BG: [number, number, number] = [26, 26, 46]; // Your dark background
```

And update the text strings:
- `"APP SPECIFICATION"` → Your title
- `"[Your App Name]"` → Actual app name
- `"App-Specification.pdf"` → Custom filename
