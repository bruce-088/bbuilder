export interface ParsedToolResult {
  name: string;
  result: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
}

const TOOL_RESULT_RE = /\[TOOL_RESULT:(\w+):([\s\S]*?)\](?=\n|$)\n?/g;

/**
 * Parse and strip [TOOL_RESULT:name:{json}] markers embedded in assistant text.
 * Shared across streaming, persisted-message hydration, and voice mode so the
 * download/action UI survives reloads.
 */
export function parseAndStripToolResults(raw: string): {
  clean: string;
  tools: ParsedToolResult[];
} {
  const tools: ParsedToolResult[] = [];
  const clean = raw.replace(TOOL_RESULT_RE, (_m, name: string, jsonStr: string) => {
    try {
      tools.push({ name, result: JSON.parse(jsonStr) });
    } catch {
      /* malformed payload — drop marker but keep parse going */
    }
    return "";
  });
  return { clean, tools };
}
