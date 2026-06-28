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

export async function ingestYoutubeUrl(input: string): Promise<YoutubeIngestionResult> {
  const blocker = isUnsupportedPath(input);
  if (blocker) throw new Error(blocker);

  const videoId = extractVideoId(input);
  if (!videoId) throw new Error("Couldn't find a YouTube video ID in that URL.");

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const meta: YoutubeMeta = { video_id: videoId, url };

  // Kick off metadata fetch in parallel with transcript attempt.
  const metaPromise = fetchOEmbed(url);

  // ── Tier 1: captions / transcript ──
  try {
    const segments: Array<{ text: string; duration?: number; offset?: number }> =
      await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }).catch(async () => {
        // Fallback: try without lang hint (auto-translated / native).
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
      const oem = await metaPromise;
      return {
        source: "captions",
        transcript,
        meta: { ...meta, ...oem, duration_sec: duration_sec > 0 ? duration_sec : undefined },
      };
    }
  } catch (err) {
    console.warn("[youtube] transcript fetch failed", { videoId, err: String(err) });
  }

  // ── Tier 2: metadata-only fallback ──
  const oem = await metaPromise;
  if (!oem.title) {
    throw new Error(
      "This video has no captions and no public metadata. Try a video that has subtitles enabled.",
    );
  }
  const metaSummary = [
    `Title: ${oem.title}`,
    oem.author ? `Channel: ${oem.author}` : null,
    `URL: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    source: "metadata-only",
    transcript: `[METADATA ONLY — no captions available]\n${metaSummary}`,
    meta: { ...meta, ...oem },
    warning:
      "No captions available — analysis is based on title/channel only. Ask the user to provide a video with subtitles for deeper insight.",
  };
}
