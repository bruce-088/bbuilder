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
  doc.text("MASTER PROMPT", m, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PURPLE);
  doc.text("Business Builder AI — Lovable Export Format", m, 30);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pw - m,
    30,
    { align: "right" }
  );
  y = 55;

  // Parse markdown-ish content into sections
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
      // Body text
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
    doc.text("MYA — Business Builder AI Master Prompt", pw / 2, ph - 6, { align: "center" });
    doc.setTextColor(...PURPLE);
    doc.text(`Page ${i} of ${pages}`, pw - m, ph - 6, { align: "right" });
  }

  doc.save("Business-Builder-AI-Master-Prompt.pdf");
}
