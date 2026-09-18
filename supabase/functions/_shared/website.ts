// Shared website ingestion helpers.
// Tier 1: direct fetch + HTML → text extraction.
// Tier 2: r.jina.ai reader proxy fallback for JS-rendered / blocked pages.
//
// Returns a normalized { source, text, meta } shape so any edge function can
// feed real page content into Gemini instead of guessing from the URL.

export type WebsiteSource = "direct" | "reader-proxy";

export interface WebsiteMeta {
  url: string;
  final_url?: string;
  title?: string;
  description?: string;
  site_name?: string;
}

export interface WebsiteIngestionResult {
  source: WebsiteSource;
  text: string;
  meta: WebsiteMeta;
  warning?: string;
}

const MAX_TEXT_CHARS = 18_000;
const FETCH_TIMEOUT_MS = 20_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export function normalizeUrl(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) throw new Error("No URL provided.");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    throw new Error(`"${input}" isn't a valid website URL.`);
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http(s) URLs are supported.");
  const host = parsed.hostname.toLowerCase();
  // Block SSRF-ish targets.
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Internal or local addresses can't be ingested.");
  }
  return parsed.toString();
}

function truncate(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return text.slice(0, MAX_TEXT_CHARS) + "\n…[truncated]";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
}

function matchMeta(html: string, pattern: RegExp): string | undefined {
  const m = html.match(pattern);
  return m?.[1] ? decodeEntities(m[1]).trim() : undefined;
}

export function extractMetaFromHtml(html: string): Omit<WebsiteMeta, "url"> {
  return {
    title:
      matchMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      matchMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description:
      matchMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      matchMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
    site_name: matchMeta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i),
  };
}

export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|header|footer|main)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(stripped)
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaReaderProxy(url: string): Promise<string> {
  const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
    "User-Agent": UA,
    Accept: "text/plain",
  });
  if (!res.ok) throw new Error(`Reader proxy returned ${res.status}`);
  return (await res.text()).trim();
}

export async function ingestWebsiteUrl(input: string): Promise<WebsiteIngestionResult> {
  const url = normalizeUrl(input);
  let html = "";
  let finalUrl = url;
  let directError: string | null = null;

  // ── Tier 1: direct fetch ──
  try {
    const res = await fetchWithTimeout(url, {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    });
    finalUrl = res.url || url;
    if (!res.ok) throw new Error(`Site returned HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    directError = String(err instanceof Error ? err.message : err);
    console.warn("[website] direct fetch failed", { url, error: directError });
  }

  const meta: WebsiteMeta = { url, final_url: finalUrl, ...(html ? extractMetaFromHtml(html) : {}) };
  const directText = html ? htmlToText(html) : "";

  // Enough real content? Ship it.
  if (directText.length >= 600) {
    return { source: "direct", text: truncate(directText), meta };
  }

  // ── Tier 2: reader proxy (handles JS-rendered SPAs and bot-blocked pages) ──
  try {
    const proxyText = await fetchViaReaderProxy(url);
    if (proxyText.length > directText.length && proxyText.length > 100) {
      return {
        source: "reader-proxy",
        text: truncate(proxyText),
        meta,
        warning: directError
          ? `Direct fetch failed (${directError}); content read via text proxy.`
          : "Page is JavaScript-rendered; content read via text proxy.",
      };
    }
  } catch (err) {
    console.warn("[website] reader proxy failed", { url, error: String(err) });
  }

  if (directText.length > 0) {
    return {
      source: "direct",
      text: truncate(directText),
      meta,
      warning: "Only a thin amount of text was readable on this page.",
    };
  }

  throw new Error(
    `Couldn't read any content from ${url}${directError ? ` (${directError})` : ""}. The site may block automated access — paste the key copy instead.`,
  );
}
