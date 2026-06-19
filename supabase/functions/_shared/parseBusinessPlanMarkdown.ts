// Deterministic Business Plan parser — splits a Mya-generated plan
// markdown into a verbatim sections array. No paraphrasing, no LLM rewriting.
//
// Recognized shape (emitted by Mya's GENERATE_IDEAS_PROMPT):
//   # 💡 Business Name
//   ## 🎯 The Niche
//   <body>
//   ## 👥 Target Audience
//   <body>
//   ...
//
// We split on lines that start with "## " (H2). The H1 line becomes the title.
// Anything before the first H2 (after the H1) is kept as a subtitle/lede.

export interface ParsedPlanSection {
  heading: string;
  body: string;
}

export interface ParsedBusinessPlan {
  title: string;
  subtitle?: string;
  sections: ParsedPlanSection[];
}

const H1_RE = /^\s*#\s+(.+?)\s*$/;
const H2_RE = /^\s*##\s+(.+?)\s*$/;

export function looksLikeBusinessPlan(text: string): boolean {
  if (!text) return false;
  // Cheap heuristic: must contain at least two of the canonical headings.
  const markers = [
    "## 🎯",
    "## 👥",
    "## ✨",
    "## 📦",
    "## 💰",
    "## 🚀",
    "## 🤖",
    "The Niche",
    "Target Audience",
    "Value Proposition",
    "Revenue Math",
  ];
  let hits = 0;
  for (const m of markers) {
    if (text.includes(m)) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

export function parseBusinessPlanMarkdown(
  raw: string,
): ParsedBusinessPlan | null {
  if (!raw || typeof raw !== "string") return null;
  const text = raw.replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  let title = "";
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(H1_RE);
    if (m) {
      title = m[1].trim();
      titleIdx = i;
      break;
    }
  }

  // Collect H2 boundaries after the title.
  const boundaries: { idx: number; heading: string }[] = [];
  for (let i = titleIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(H2_RE);
    if (m) boundaries.push({ idx: i, heading: m[1].trim() });
  }

  if (boundaries.length === 0) return null;

  // Subtitle = text between title and first H2 (trimmed).
  let subtitle: string | undefined;
  if (titleIdx >= 0) {
    const subSlice = lines.slice(titleIdx + 1, boundaries[0].idx).join("\n").trim();
    if (subSlice) subtitle = subSlice;
  }

  const sections: ParsedPlanSection[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].idx + 1;
    const end = i + 1 < boundaries.length ? boundaries[i + 1].idx : lines.length;
    const body = lines.slice(start, end).join("\n").trim();
    sections.push({ heading: boundaries[i].heading, body });
  }

  if (!title) {
    // Fall back to first heading if no H1 was present.
    title = sections[0]?.heading ?? "Business Plan";
  }

  return { title, subtitle, sections };
}

/**
 * Finds the most recent assistant message that looks like a Business Plan.
 * Returns null if none found.
 */
export function findLatestPlanInMessages(
  messages: Array<{ role: string; content: string }> | undefined,
): string | null {
  if (!messages || messages.length === 0) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    if (looksLikeBusinessPlan(m.content)) return m.content;
  }
  return null;
}
