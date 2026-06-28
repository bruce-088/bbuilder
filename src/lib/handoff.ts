/**
 * Handoff abstraction layer.
 *
 * Today: serialize the HandoffPackage and copy it to the clipboard, ready to
 * paste into OpenClaw / Mission Control.
 *
 * Tomorrow: swap `ClipboardHandoffTarget` for `OpenClawApiHandoffTarget`
 * without touching the Blueprint engine. The Blueprint engine ONLY produces
 * a HandoffPackage — it never knows where it goes.
 */

import type { HandoffPackage, SystemBlueprint } from "./blueprintSchema";
import { DEFAULT_MUTATION_PIPELINE } from "./blueprintSchema";

export interface HandoffTarget {
  readonly id: string;
  readonly label: string;
  deliver(pkg: HandoffPackage): Promise<{ ok: boolean; message: string }>;
}

/** Build the handoff package from a stored blueprint. */
export function buildHandoffPackage(b: SystemBlueprint): HandoffPackage {
  const stored = b.handoff_package as Partial<HandoffPackage> | undefined;
  const bp = b.blueprint || {};

  return {
    version: "1.0",
    blueprint_id: b.id,
    title: b.title,
    summary: b.summary || bp.executive_summary || "",
    agents: stored?.agents ?? {
      mya:   splitLines(bp.agent_responsibilities, /^.*mya[: ]/i),
      claw:  splitLines(bp.agent_responsibilities, /^.*claw[: ]/i),
      anjel: splitLines(bp.agent_responsibilities, /^.*anjel[: ]/i),
    },
    mutation_pipeline: stored?.mutation_pipeline ?? DEFAULT_MUTATION_PIPELINE,
    required_automations: stored?.required_automations ?? splitBullets(bp.required_automations),
    tech_stack: stored?.tech_stack ?? splitBullets(bp.technology_stack),
    kpis: stored?.kpis ?? splitBullets(bp.kpis),
    source: b.source_url
      ? { type: b.source_type, url: b.source_url, title: (b.source_metadata as any)?.title }
      : { type: b.source_type },
  };
}

/** Render the package as a clipboard-friendly prompt for OpenClaw. */
export function serializeHandoff(pkg: HandoffPackage): string {
  return [
    `# OpenClaw Handoff — ${pkg.title}`,
    ``,
    `> ${pkg.summary}`,
    ``,
    `## Mutation Pipeline`,
    ...pkg.mutation_pipeline.map((s, i) => `${i + 1}. **${s.label}** → ${s.agent}`),
    ``,
    `## Agent Assignments`,
    `### Mya (Strategy / Architecture)`,
    ...bul(pkg.agents.mya),
    ``,
    `### Claw (Chief of Staff / Orchestration)`,
    ...bul(pkg.agents.claw),
    ``,
    `### Anjel (Engineering / Automation)`,
    ...bul(pkg.agents.anjel),
    ``,
    `## Required Automations`,
    ...bul(pkg.required_automations),
    ``,
    `## Tech Stack`,
    ...bul(pkg.tech_stack),
    ``,
    `## KPIs`,
    ...bul(pkg.kpis),
    ``,
    pkg.source?.url ? `_Source: ${pkg.source.type} — ${pkg.source.url}_` : `_Source: ${pkg.source?.type ?? "manual"}_`,
    ``,
    `<!-- machine-readable -->`,
    "```json",
    JSON.stringify(pkg, null, 2),
    "```",
  ].join("\n");
}

function bul(xs: string[] | undefined): string[] {
  if (!xs || xs.length === 0) return ["- _(none specified)_"];
  return xs.map((x) => `- ${x}`);
}

function splitBullets(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean);
}

function splitLines(s: string | undefined, match: RegExp): string[] {
  if (!s) return [];
  return s.split(/\n+/).filter((l) => match.test(l)).map((l) => l.replace(match, "").trim()).filter(Boolean);
}

// ─── Targets ────────────────────────────────────────────────────────────────

export const ClipboardHandoffTarget: HandoffTarget = {
  id: "clipboard",
  label: "Copy to OpenClaw / Mission Control",
  async deliver(pkg) {
    try {
      await navigator.clipboard.writeText(serializeHandoff(pkg));
      return { ok: true, message: "Handoff package copied — paste into OpenClaw." };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Clipboard write failed." };
    }
  },
};

/**
 * Future: swap this in once OpenClaw exposes a receiver endpoint.
 *
 * export const OpenClawApiHandoffTarget: HandoffTarget = {
 *   id: "openclaw-api",
 *   label: "Send to OpenClaw",
 *   async deliver(pkg) { ...POST to /functions/v1/openclaw-handoff... }
 * };
 */

export const ACTIVE_HANDOFF_TARGET: HandoffTarget = ClipboardHandoffTarget;
