// Shared YouTube ingestion helpers.
// Tier 1: fetch captions/transcript via the `youtube-transcript` npm package.
// Tier 2: oEmbed metadata fallback when no captions exist.
//
// Both tiers return a normalized { source, transcript, meta } shape so the
// caller (chat tool or any other edge function) can feed it into Gemini for
// summarization / extraction without branching on source type.

// deno-lint-ignore-file no-explicit-any
import { YoutubeTranscript } from "npm:youtube-transcript@1.2.1";

export type YoutubeSource = "captions" | "metadata-only";

export interface YoutubeMeta {
  video_id: string;
  url: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration_sec?: number;
  description?: string;
  keywords?: string[];
}

export interface YoutubeIngestionResult {
  source: YoutubeSource;
  transcript: string; // full text (Tier 1) or "[metadata only] Title / Channel / Description" (Tier 2)
  meta: YoutubeMeta;
  warning?: string;
  /** When true, the caller (Mya) should invoke `web_research` to enrich the blueprint. */
  needs_web_research?: boolean;
  /** Suggested web-search queries the caller can use immediately. */
  research_queries?: string[];
}

const VIDEO_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Bare 11-char id
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(VIDEO_ID_RE);
  return match ? match[1] : null;
}

function isUnsupportedPath(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("playlist?list=")) return "Playlists aren't supported — paste a single video URL.";
  if (/youtube\.com\/(channel\/|@)/.test(lower)) return "Channels aren't supported — paste a single video URL.";
  return null;
}

async function fetchOEmbed(videoUrl: string): Promise<Partial<YoutubeMeta>> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
    );
    if (!res.ok) return {};
    const data = await res.json();
    return {
      title: data.title,
      author: data.author_name,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return {};
  }
}

/**
 * Scrape the watch page HTML for description + keywords. Best-effort —
 * YouTube ships meta tags + a ytInitialPlayerResponse JSON blob. We grab
 * whichever we can without paying for puppeteer.
 */
async function fetchWatchPageMeta(videoUrl: string): Promise<Partial<YoutubeMeta>> {
  try {
    const res = await fetch(videoUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return {};
    const html = await res.text();

    let description: string | undefined;
    // og:description first (cleanest), then meta name="description"
    const og = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (og) description = decodeHtml(og[1]);
    if (!description) {
      const md = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (md) description = decodeHtml(md[1]);
    }
    // Long-form description from ytInitialPlayerResponse if present
    const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script>)/s);
    if (playerMatch) {
      try {
        const player = JSON.parse(playerMatch[1]);
        const long =
          player?.videoDetails?.shortDescription ||
          player?.microformat?.playerMicroformatRenderer?.description?.simpleText;
        if (typeof long === "string" && long.length > (description?.length ?? 0)) {
          description = long;
        }
      } catch { /* ignore JSON edge cases */ }
    }

    let keywords: string[] | undefined;
    const kw = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i);
    if (kw) {
      keywords = decodeHtml(kw[1])
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 25);
    }

    return { description, keywords };
  } catch {
    return {};
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function buildResearchQueries(meta: YoutubeMeta): string[] {
  const queries: string[] = [];
  if (meta.title) {
    queries.push(`${meta.title} summary`);
    queries.push(`${meta.title} transcript`);
  }
  if (meta.author && meta.title) queries.push(`${meta.author} ${meta.title} framework`);
  if (meta.author) queries.push(`${meta.author} business model breakdown`);
  return queries.slice(0, 5);
}

export async function ingestYoutubeUrl(input: string): Promise<YoutubeIngestionResult> {
  const blocker = isUnsupportedPath(input);
  if (blocker) throw new Error(blocker);

  const videoId = extractVideoId(input);
  if (!videoId) throw new Error("Couldn't find a YouTube video ID in that URL.");

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const meta: YoutubeMeta = { video_id: videoId, url };

  // Kick off metadata + watch page fetches in parallel with transcript attempt.
  const metaPromise = fetchOEmbed(url);
  const pagePromise = fetchWatchPageMeta(url);

  // ── Tier 1: captions / transcript ──
  try {
    const segments: Array<{ text: string; duration?: number; offset?: number }> =
      await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }).catch(async () => {
        return await YoutubeTranscript.fetchTranscript(videoId);
      });

    if (Array.isArray(segments) && segments.length > 0) {
      const transcript = segments
        .map((s) => (s?.text || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");
      const lastOffset = segments[segments.length - 1]?.offset ?? 0;
      const lastDur = segments[segments.length - 1]?.duration ?? 0;
      const duration_sec = Math.round((Number(lastOffset) + Number(lastDur)) / 1000);
      const [oem, page] = await Promise.all([metaPromise, pagePromise]);
      return {
        source: "captions",
        transcript,
        meta: { ...meta, ...oem, ...page, duration_sec: duration_sec > 0 ? duration_sec : undefined },
      };
    }
  } catch (err) {
    console.warn("[youtube] transcript fetch failed", { videoId, err: String(err) });
  }

  // ── Tier 2: metadata + description fallback (Fail-Soft Research Mode) ──
  const [oem, page] = await Promise.all([metaPromise, pagePromise]);
  const mergedMeta: YoutubeMeta = { ...meta, ...oem, ...page };
  if (!mergedMeta.title && !mergedMeta.description) {
    throw new Error(
      "This video has no captions and no public metadata. Try a video that has subtitles enabled.",
    );
  }

  const lines = [
    mergedMeta.title ? `Title: ${mergedMeta.title}` : null,
    mergedMeta.author ? `Channel: ${mergedMeta.author}` : null,
    `URL: ${url}`,
    mergedMeta.keywords?.length ? `Keywords: ${mergedMeta.keywords.join(", ")}` : null,
    mergedMeta.description ? `\nDescription:\n${mergedMeta.description}` : null,
  ].filter(Boolean);

  return {
    source: "metadata-only",
    transcript: `[METADATA ONLY — no captions available. Use web_research to enrich before building the blueprint.]\n${lines.join("\n")}`,
    meta: mergedMeta,
    needs_web_research: true,
    research_queries: buildResearchQueries(mergedMeta),
    warning:
      "No captions available. Description + metadata extracted; call `web_research` with the suggested queries before building the blueprint — never infer silently.",
  };
}
