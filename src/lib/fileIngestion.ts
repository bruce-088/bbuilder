/**
 * Client-side file ingestion for Mya chat.
 * Extracts text from common document types so Mya can reason over them.
 */

export interface IngestedFile {
  name: string;
  size: number;
  type: string;
  /** Extracted plain text (may be truncated). */
  text: string;
  /** Set when extraction failed. */
  error?: string;
}

const MAX_CHARS_PER_FILE = 40_000;

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|jsonl|ya?ml|xml|html?|log|env|ini|toml|js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|hpp|sh|sql|css|scss)$/i;

function truncate(text: string): string {
  if (text.length <= MAX_CHARS_PER_FILE) return text;
  return text.slice(0, MAX_CHARS_PER_FILE) + `\n\n…[truncated, ${text.length - MAX_CHARS_PER_FILE} more chars]`;
}

async function extractPdf(file: File): Promise<string> {
  // Dynamic import keeps pdfjs out of the main bundle.
  const pdfjs = await import("pdfjs-dist");
  // Vite worker bundling
  // @ts-expect-error - worker query import
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const pageLimit = Math.min(doc.numPages, 50);
  for (let i = 1; i <= pageLimit; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: { str?: string }) => it.str || "");
    parts.push(strings.join(" "));
  }
  if (doc.numPages > pageLimit) {
    parts.push(`\n\n…[truncated, ${doc.numPages - pageLimit} more pages]`);
  }
  return parts.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value || "";
}

export async function ingestFile(file: File): Promise<IngestedFile> {
  const base: IngestedFile = {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    text: "",
  };

  try {
    if (file.size > 20 * 1024 * 1024) {
      return { ...base, error: "File too large (max 20MB)" };
    }

    const lowerName = file.name.toLowerCase();
    const mime = file.type;

    // PDF
    if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
      base.text = truncate(await extractPdf(file));
      return base;
    }

    // DOCX
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx")
    ) {
      base.text = truncate(await extractDocx(file));
      return base;
    }

    // Text-like
    if (mime.startsWith("text/") || TEXT_EXT.test(lowerName) || mime === "application/json") {
      const text = await file.text();
      base.text = truncate(text);
      return base;
    }

    return {
      ...base,
      error: `Unsupported file type: ${mime || "unknown"}. Supported: PDF, DOCX, TXT, MD, CSV, JSON, code files.`,
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "Failed to read file" };
  }
}

/**
 * Formats ingested files as a context block appended to the user's message.
 */
export function formatFilesForPrompt(files: IngestedFile[]): string {
  if (files.length === 0) return "";
  const blocks = files.map((f) => {
    if (f.error) {
      return `[Attached file: ${f.name} — ERROR: ${f.error}]`;
    }
    return `[Attached file: ${f.name} (${f.type}, ${f.size} bytes)]\n\`\`\`\n${f.text}\n\`\`\``;
  });
  return `\n\n---\n**Attached Files:**\n\n${blocks.join("\n\n")}`;
}
