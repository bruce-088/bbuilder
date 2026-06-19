import { jsPDF } from "jspdf";

export interface MyaPdfSection {
  heading?: string;
  body: string;
}

export interface MyaPdfArgs {
  title: string;
  subtitle?: string;
  filename: string;
  sections: MyaPdfSection[];
}

// Brand
const EMERALD: [number, number, number] = [16, 185, 129]; // #10b981
const INK: [number, number, number] = [20, 24, 30];
const MUTED: [number, number, number] = [110, 118, 129];
const RULE: [number, number, number] = [225, 228, 232];

const PAGE_MARGIN_X = 56;
const PAGE_MARGIN_TOP = 72;
const PAGE_MARGIN_BOTTOM = 72;
const LINE_HEIGHT = 1.5;

// Typography scale
const FS_TITLE = 26;
const FS_SUBTITLE = 13;
const FS_H2 = 16;
const FS_BODY = 11;
const FS_FOOTER = 9;

// Vertical rhythm (pts)
const SPACE_AFTER_TITLE = 6;
const SPACE_AFTER_SUBTITLE = 18;
const SPACE_BEFORE_HEADING = 22;
const SPACE_AFTER_HEADING_RULE = 14;
const SPACE_AFTER_PARAGRAPH = 10;
const SPACE_AFTER_LIST = 10;
const SPACE_BETWEEN_LIST_ITEMS = 4;
const SPACE_AFTER_SECTION = 18;

function sanitizeFilename(name: string): string {
  const base = (name || "mya-document")
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "mya-document"}.pdf`;
}

function buildPdf(args: MyaPdfArgs): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;

  let cursorY = PAGE_MARGIN_TOP;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - PAGE_MARGIN_BOTTOM) {
      doc.addPage();
      cursorY = PAGE_MARGIN_TOP;
    }
  };

  const drawAccentBar = () => {
    doc.setFillColor(...EMERALD);
    doc.rect(PAGE_MARGIN_X, cursorY, 48, 4, "F");
    cursorY += 18;
  };

  // ── Cover header ──
  drawAccentBar();

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(args.title || "Untitled", contentWidth);
  doc.text(titleLines, PAGE_MARGIN_X, cursorY + 10);
  cursorY += 10 + titleLines.length * 26 * LINE_HEIGHT * 0.6;

  if (args.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(...MUTED);
    const subLines = doc.splitTextToSize(args.subtitle, contentWidth);
    doc.text(subLines, PAGE_MARGIN_X, cursorY + 6);
    cursorY += 6 + subLines.length * 13 * LINE_HEIGHT;
  }

  cursorY += 14;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(PAGE_MARGIN_X, cursorY, pageWidth - PAGE_MARGIN_X, cursorY);
  cursorY += 22;

  // ── Sections ──
  const renderInlineBold = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
  ): number => {
    // Splits on **bold** markers and renders mixed runs on wrapped lines.
    const parts: { text: string; bold: boolean }[] = [];
    const re = /\*\*(.+?)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
      parts.push({ text: m[1], bold: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), bold: false });
    if (parts.length === 0) parts.push({ text, bold: false });

    // Flatten into words preserving bold flag
    const words: { text: string; bold: boolean }[] = [];
    for (const p of parts) {
      const tokens = p.text.split(/(\s+)/).filter((t) => t.length > 0);
      for (const t of tokens) words.push({ text: t, bold: p.bold });
    }

    let lineY = y;
    let lineX = x;
    const fontSize = doc.getFontSize();
    const lineGap = fontSize * LINE_HEIGHT;

    const flushNewline = () => {
      lineY += lineGap;
      lineX = x;
    };

    for (const w of words) {
      doc.setFont("helvetica", w.bold ? "bold" : "normal");
      const width = doc.getTextWidth(w.text);
      if (lineX + width > x + maxWidth && lineX > x) {
        flushNewline();
        if (/^\s+$/.test(w.text)) continue;
      }
      doc.text(w.text, lineX, lineY);
      lineX += width;
    }
    return lineY;
  };

  const renderBody = (body: string) => {
    const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
    for (const blockRaw of blocks) {
      const block = blockRaw.replace(/\n+$/g, "");
      if (!block.trim()) continue;
      const lines = block.split("\n");

      // Detect list block: every non-empty line starts with bullet/number
      const isList = lines.every(
        (l) => /^\s*[-*•]\s+/.test(l) || /^\s*\d+[\.)]\s+/.test(l),
      );

      if (isList) {
        doc.setFontSize(11);
        doc.setTextColor(...INK);
        for (const lineRaw of lines) {
          const numbered = lineRaw.match(/^\s*(\d+)[\.)]\s+(.*)$/);
          const bullet = lineRaw.match(/^\s*[-*•]\s+(.*)$/);
          const marker = numbered ? `${numbered[1]}.` : "•";
          const text = numbered ? numbered[2] : bullet ? bullet[1] : lineRaw;
          ensureSpace(18);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...EMERALD);
          doc.text(marker, PAGE_MARGIN_X, cursorY);
          doc.setTextColor(...INK);
          const endY = renderInlineBold(
            text,
            PAGE_MARGIN_X + 18,
            cursorY,
            contentWidth - 18,
          );
          cursorY = endY + 11 * LINE_HEIGHT * 0.45;
        }
        cursorY += 6;
      } else {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...INK);
        const flat = lines.join(" ");
        ensureSpace(20);
        const endY = renderInlineBold(flat, PAGE_MARGIN_X, cursorY, contentWidth);
        cursorY = endY + 11 * LINE_HEIGHT * 0.6;
      }
    }
  };

  for (const section of args.sections || []) {
    if (section.heading) {
      ensureSpace(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...INK);
      const hLines = doc.splitTextToSize(section.heading, contentWidth);
      doc.text(hLines, PAGE_MARGIN_X, cursorY);
      cursorY += hLines.length * 15 * LINE_HEIGHT * 0.7;
      doc.setDrawColor(...EMERALD);
      doc.setLineWidth(1.25);
      doc.line(PAGE_MARGIN_X, cursorY, PAGE_MARGIN_X + 32, cursorY);
      cursorY += 14;
    }
    if (section.body) renderBody(section.body);
    cursorY += 8;
  }

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(
      PAGE_MARGIN_X,
      pageHeight - PAGE_MARGIN_BOTTOM + 18,
      pageWidth - PAGE_MARGIN_X,
      pageHeight - PAGE_MARGIN_BOTTOM + 18,
    );
    doc.text(
      `Generated by Mya · ${date}`,
      PAGE_MARGIN_X,
      pageHeight - PAGE_MARGIN_BOTTOM + 34,
    );
    doc.text(
      `${i} / ${totalPages}`,
      pageWidth - PAGE_MARGIN_X,
      pageHeight - PAGE_MARGIN_BOTTOM + 34,
      { align: "right" },
    );
  }

  return doc;
}

export function generateMyaPdfBlob(args: MyaPdfArgs): { blob: Blob; filename: string } {
  const doc = buildPdf(args);
  const blob = doc.output("blob");
  return { blob, filename: sanitizeFilename(args.filename || args.title || "mya-document") };
}

export function downloadMyaPdf(args: MyaPdfArgs): string {
  const { blob, filename } = generateMyaPdfBlob(args);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}
