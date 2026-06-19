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

  const remainingSpace = () =>
    pageHeight - PAGE_MARGIN_BOTTOM - cursorY;

  const newPage = () => {
    doc.addPage();
    cursorY = PAGE_MARGIN_TOP;
  };

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - PAGE_MARGIN_BOTTOM) {
      newPage();
    }
  };

  // ── Cover header ──
  doc.setFillColor(...EMERALD);
  doc.rect(PAGE_MARGIN_X, cursorY, 48, 4, "F");
  cursorY += 22;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS_TITLE);
  const titleLines = doc.splitTextToSize(args.title || "Untitled", contentWidth);
  const titleLineHeight = FS_TITLE * 1.2;
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, PAGE_MARGIN_X, cursorY + titleLineHeight * (i + 0.8));
  });
  cursorY += titleLines.length * titleLineHeight + SPACE_AFTER_TITLE;

  if (args.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS_SUBTITLE);
    doc.setTextColor(...MUTED);
    const subLines = doc.splitTextToSize(args.subtitle, contentWidth);
    const subLineHeight = FS_SUBTITLE * LINE_HEIGHT;
    subLines.forEach((line: string, i: number) => {
      doc.text(line, PAGE_MARGIN_X, cursorY + subLineHeight * (i + 0.8));
    });
    cursorY += subLines.length * subLineHeight;
  }

  cursorY += SPACE_AFTER_SUBTITLE;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(PAGE_MARGIN_X, cursorY, pageWidth - PAGE_MARGIN_X, cursorY);
  cursorY += SPACE_AFTER_HEADING_RULE;

  // ── Inline bold renderer ──
  const renderInlineBold = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
  ): number => {
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

    const words: { text: string; bold: boolean }[] = [];
    for (const p of parts) {
      const tokens = p.text.split(/(\s+)/).filter((t) => t.length > 0);
      for (const t of tokens) words.push({ text: t, bold: p.bold });
    }

    let lineY = y;
    let lineX = x;
    const fontSize = doc.getFontSize();
    const lineGap = fontSize * LINE_HEIGHT;

    for (const w of words) {
      doc.setFont("helvetica", w.bold ? "bold" : "normal");
      const width = doc.getTextWidth(w.text);
      if (lineX + width > x + maxWidth && lineX > x) {
        // Page-break aware wrap
        if (lineY + lineGap > pageHeight - PAGE_MARGIN_BOTTOM) {
          newPage();
          lineY = cursorY;
        } else {
          lineY += lineGap;
        }
        lineX = x;
        if (/^\s+$/.test(w.text)) continue;
      }
      doc.text(w.text, lineX, lineY);
      lineX += width;
    }
    return lineY;
  };

  // ── Body renderer ──
  const renderBody = (body: string) => {
    const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
    for (const blockRaw of blocks) {
      const block = blockRaw.replace(/\n+$/g, "");
      if (!block.trim()) continue;
      const lines = block.split("\n");

      const isList = lines.every(
        (l) => /^\s*[-*•]\s+/.test(l) || /^\s*\d+[\.)]\s+/.test(l),
      );

      if (isList) {
        doc.setFontSize(FS_BODY);
        const lineGap = FS_BODY * LINE_HEIGHT;
        for (const lineRaw of lines) {
          const numbered = lineRaw.match(/^\s*(\d+)[\.)]\s+(.*)$/);
          const bullet = lineRaw.match(/^\s*[-*•]\s+(.*)$/);
          const marker = numbered ? `${numbered[1]}.` : "•";
          const text = numbered ? numbered[2] : bullet ? bullet[1] : lineRaw;
          ensureSpace(lineGap + 2);
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
          cursorY = endY + lineGap + SPACE_BETWEEN_LIST_ITEMS;
        }
        cursorY += SPACE_AFTER_LIST - SPACE_BETWEEN_LIST_ITEMS;
      } else {
        doc.setFontSize(FS_BODY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...INK);
        const flat = lines.join(" ");
        const lineGap = FS_BODY * LINE_HEIGHT;
        ensureSpace(lineGap * 2); // keep at least 2 lines together
        const endY = renderInlineBold(flat, PAGE_MARGIN_X, cursorY, contentWidth);
        cursorY = endY + lineGap * 0.3 + SPACE_AFTER_PARAGRAPH;
      }
    }
  };

  // ── Sections ──
  for (const section of args.sections || []) {
    if (section.heading) {
      const headingLineHeight = FS_H2 * 1.25;
      const hLines = doc.splitTextToSize(section.heading, contentWidth);
      const headingBlockHeight =
        hLines.length * headingLineHeight + 8 + SPACE_AFTER_HEADING_RULE;

      // Widow protection: require room for heading + at least 2 body lines
      const minFollowing = FS_BODY * LINE_HEIGHT * 2;
      if (remainingSpace() < headingBlockHeight + minFollowing) {
        newPage();
      } else {
        cursorY += SPACE_BEFORE_HEADING;
        if (remainingSpace() < headingBlockHeight + minFollowing) {
          // adding spacing pushed us over — restart on fresh page
          newPage();
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(FS_H2);
      doc.setTextColor(...INK);
      hLines.forEach((line: string, i: number) => {
        doc.text(line, PAGE_MARGIN_X, cursorY + headingLineHeight * (i + 0.75));
      });
      cursorY += hLines.length * headingLineHeight + 4;

      doc.setDrawColor(...EMERALD);
      doc.setLineWidth(1.5);
      doc.line(PAGE_MARGIN_X, cursorY, PAGE_MARGIN_X + 36, cursorY);
      cursorY += SPACE_AFTER_HEADING_RULE;
    }
    if (section.body) renderBody(section.body);
    cursorY += SPACE_AFTER_SECTION;
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
    doc.setFontSize(FS_FOOTER);
    doc.setTextColor(...MUTED);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    const footerY = pageHeight - PAGE_MARGIN_BOTTOM + 30;
    doc.line(
      PAGE_MARGIN_X,
      footerY - 14,
      pageWidth - PAGE_MARGIN_X,
      footerY - 14,
    );
    doc.text(`Generated by Mya · ${date}`, PAGE_MARGIN_X, footerY);
    doc.text(
      `${i} / ${totalPages}`,
      pageWidth - PAGE_MARGIN_X,
      footerY,
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
