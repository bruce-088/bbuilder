// SkyBrief / Mya — dynamic app spec generator.
// Returns a Markdown document describing the live state of the app.
// No secrets are ever included in the output body.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const APP_NAME = "Mya";
const APP_VERSION = "1.0.0";
const APP_TAGLINE =
  "Build a $10K/month empire and land your first customer in 14 days.";

// Curated registry of edge functions (kept here so it's a one-file update).
const EDGE_FUNCTIONS: Record<string, { purpose: string; trigger: string }> = {
  "ai-orchestrator": { purpose: "Routes AI calls across providers (Lovable AI Gateway, OpenAI, Claude, Perplexity)", trigger: "User action (chat, copilot)" },
  "browserbase-automation": { purpose: "Headless browser automation for cowork/n8n auto-login", trigger: "User action (cowork mode)" },
  "chat": { purpose: "Mya chat completions and streaming", trigger: "User action (chat input)" },
  "competitor-analysis": { purpose: "Pulls competitor intel via Perplexity", trigger: "User action (Strategy page)" },
  "cowork-interpret": { purpose: "Interprets cowork browser actions for Mya", trigger: "User action" },
  "daily-briefing": { purpose: "Generates daily audio + text briefing", trigger: "User action / scheduled" },
  "diagnose-fix": { purpose: "Diagnoses workflow failures and suggests fixes", trigger: "User action (Troubleshooting UI)" },
  "elevenlabs-stt": { purpose: "Speech-to-text via ElevenLabs", trigger: "User action (voice input)" },
  "elevenlabs-tts": { purpose: "Text-to-speech via ElevenLabs", trigger: "User action / daily briefing" },
  "generate-exec-transcript": { purpose: "Generates executive transcript for a business plan", trigger: "User action" },
  "generate-n8n-workflow": { purpose: "Generates n8n workflow JSON from plan", trigger: "User action" },
  "generate-n8n-workflow-from-prompt": { purpose: "Generates n8n workflow from free-form prompt", trigger: "User action" },
  "generate-spec": { purpose: "Generates this SkyBrief-Spec.md document", trigger: "User action (Export Spec button)" },
  "lead-webhook": { purpose: "Inbound webhook for external lead capture", trigger: "External webhook" },
  "mem0": { purpose: "Long-term memory store via Mem0", trigger: "Other function (chat)" },
  "n8n-data-proxy": { purpose: "Proxy to user n8n instance", trigger: "User action" },
  "n8n-execution-sync": { purpose: "Syncs n8n execution logs into Supabase", trigger: "Cron / user action" },
  "n8n-webhook-health": { purpose: "Pings n8n webhooks to verify health", trigger: "User action" },
  "relay-triad-event": { purpose: "Broadcasts events across Triad apps", trigger: "Other function" },
  "secure-api-keys": { purpose: "Encrypts/decrypts user API keys with pgcrypto", trigger: "User action" },
  "send-lead-email": { purpose: "Sends follow-up email to a lead via Resend", trigger: "User action (CRM)" },
  "sync-to-nexus": { purpose: "Pushes data to Nexus app", trigger: "Other function" },
  "validate-api-key": { purpose: "Validates a user-supplied API key", trigger: "User action" },
  "verify-n8n-workflow": { purpose: "Verifies a deployed n8n workflow", trigger: "User action" },
  "verify-step": { purpose: "Verifies completion of a setup-guide step", trigger: "User action" },
  "workflow-executor": { purpose: "Executes the internal visual workflow engine DAG", trigger: "User action / scheduler" },
  "workflow-scheduler": { purpose: "Cron-driven scheduler for user workflows", trigger: "Cron (pg_cron)" },
};

const FEATURES: Array<{ name: string; status: "✅ Working" | "⚠️ Partial" | "❌ Broken"; note?: string }> = [
  { name: "Business Plan generation (Mya chat → plan)", status: "✅ Working" },
  { name: "Active plan switching across all surfaces", status: "✅ Working" },
  { name: "Mission Control dashboard (4-section)", status: "✅ Working" },
  { name: "Today's Tasks", status: "✅ Working" },
  { name: "Visual workflow engine (12 node types)", status: "✅ Working" },
  { name: "Autonomous scheduler (pg_cron)", status: "✅ Working" },
  { name: "n8n MCP direct deployment", status: "✅ Working" },
  { name: "Cowork mode (Browserbase)", status: "⚠️ Partial", note: "Requires user n8n credentials" },
  { name: "Lead CRM (6-stage funnel)", status: "✅ Working" },
  { name: "Lead webhook ingestion", status: "✅ Working" },
  { name: "Email follow-up (Resend)", status: "✅ Working" },
  { name: "Revenue tracking", status: "✅ Working" },
  { name: "Voice input/output (ElevenLabs)", status: "✅ Working" },
  { name: "Voice-First mode (continuous loop)", status: "✅ Working" },
  { name: "Daily briefing (audio + text)", status: "✅ Working" },
  { name: "Competitor analysis (Perplexity)", status: "✅ Working" },
  { name: "Triad sync (cross-app events)", status: "✅ Working" },
  { name: "Quest / XP gamification", status: "✅ Working" },
  { name: "BYOK external AI providers", status: "✅ Working" },
  { name: "Setup course (33-step)", status: "✅ Working" },
  { name: "Export Spec download", status: "✅ Working" },
];

const API_INTEGRATIONS = [
  { name: "Lovable AI Gateway", purpose: "Default LLM provider (Gemini, GPT-5 family) — no user key required" },
  { name: "OpenAI / Claude / Perplexity", purpose: "BYOK alternative AI providers" },
  { name: "ElevenLabs", purpose: "Speech-to-text and text-to-speech" },
  { name: "Browserbase", purpose: "Headless browser for cowork mode and n8n auto-login" },
  { name: "Resend", purpose: "Transactional email (lead follow-ups, briefings)" },
  { name: "Mem0", purpose: "Long-term conversational memory" },
  { name: "n8n", purpose: "External workflow automation (MCP deployment + execution sync)" },
  { name: "Nexus / Triad apps", purpose: "Cross-app event broadcasting" },
];

const KNOWN_ISSUES = [
  "Mission target date defaults to 14 days from user signup; not user-editable yet.",
  "Cowork mode requires the user to add Browserbase + n8n credentials before first use.",
  "Recent-changes section uses in-app `mission_events`; git commit history is not accessible from edge runtime.",
  "External AI provider keys are encrypted with pgcrypto; rotation is manual via Settings.",
  "Some legacy `leads` rows pre-date the `lead_contacts` schema and are not surfaced in the CRM.",
];

function fmtTable(name: string, cols: Array<{ column_name: string; data_type: string; is_nullable: string }>) {
  const lines = [`### \`${name}\``, "", "| Column | Type | Nullable |", "|---|---|---|"];
  for (const c of cols) {
    lines.push(`| ${c.column_name} | ${c.data_type} | ${c.is_nullable === "YES" ? "yes" : "no"} |`);
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const APP_URL_ENV = Deno.env.get("APP_URL");
    const liveUrl = APP_URL_ENV || req.headers.get("origin") || "https://bbuilder.lovable.app";
    const edgeBase = `${SUPABASE_URL}/functions/v1`;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Identify caller (optional — only used to pull their recent events).
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const { data } = await admin.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch (_) { /* ignore */ }
    }

    // Schema introspection.
    const { data: cols } = await admin
      .from("information_schema.columns" as any)
      .select("table_name, column_name, data_type, is_nullable, ordinal_position")
      .eq("table_schema", "public")
      .order("table_name")
      .order("ordinal_position");

    let schemaSection = "";
    if (cols && cols.length) {
      const grouped: Record<string, any[]> = {};
      for (const r of cols as any[]) {
        (grouped[r.table_name] ||= []).push(r);
      }
      schemaSection = Object.keys(grouped)
        .sort()
        .map((t) => fmtTable(t, grouped[t]))
        .join("\n\n");
    } else {
      // Fallback: list known table names from RLS-readable hints.
      schemaSection = "_Schema introspection unavailable in this environment._";
    }

    // User's automation schedules + recent events (best effort).
    let schedulesSection = "_No active schedules for current user (or not signed in)._";
    let recentChangesSection = "_Sign in and trigger actions to populate this log._";
    if (userId) {
      const { data: schedules } = await admin
        .from("workflow_schedules")
        .select("cron_expression, enabled, next_run_at, last_run_at, workflow_id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (schedules?.length) {
        schedulesSection = [
          "| Workflow | Cron | Enabled | Last run | Next run |",
          "|---|---|---|---|---|",
          ...schedules.map((s: any) =>
            `| ${s.workflow_id?.slice(0, 8) ?? "—"} | \`${s.cron_expression}\` | ${s.enabled ? "yes" : "no"} | ${s.last_run_at ?? "—"} | ${s.next_run_at ?? "—"} |`
          ),
        ].join("\n");
      }

      const { data: events } = await admin
        .from("mission_events")
        .select("event_type, created_at, xp_awarded, quest_unlocked")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (events?.length) {
        recentChangesSection = [
          "| When | Event | XP | Quest |",
          "|---|---|---|---|",
          ...events.map((e: any) =>
            `| ${e.created_at} | ${e.event_type} | ${e.xp_awarded ?? 0} | ${e.quest_unlocked ?? "—"} |`
          ),
        ].join("\n");
      }
    }

    const featuresMd = FEATURES.map((f) => `- ${f.status} **${f.name}**${f.note ? ` — _${f.note}_` : ""}`).join("\n");
    const fnsMd = Object.entries(EDGE_FUNCTIONS)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, m]) => `- **\`${name}\`** — ${m.purpose}\n  - Trigger: ${m.trigger}\n  - URL: \`${edgeBase}/${name}\``)
      .join("\n");
    const integrationsMd = API_INTEGRATIONS.map((i) => `- **${i.name}** — ${i.purpose}`).join("\n");
    const issuesMd = KNOWN_ISSUES.map((i) => `- ${i}`).join("\n");

    const generatedAt = new Date().toISOString();

    const md = `# SkyBrief Spec — ${APP_NAME}

_Generated ${generatedAt}_

> Paste this into a chat with Lovable and say:
> "Here is my current app spec. Help me debug / improve / add X"

---

## 1. App Identity

- **Name:** ${APP_NAME}
- **Version:** ${APP_VERSION}
- **Tagline:** ${APP_TAGLINE}
- **Tech stack:**
  - Frontend: React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui + Framer Motion
  - Backend: Lovable Cloud (managed Postgres + Auth + Storage)
  - Database: PostgreSQL with Row-Level Security on every user table
  - Edge functions: Deno runtime, deployed via Lovable Cloud
  - AI: Lovable AI Gateway (default) + BYOK OpenAI/Claude/Perplexity

## 2. Deployment

- **Live app URL:** ${liveUrl}
- **Backend URL:** ${SUPABASE_URL}
- **Edge function base URL:** ${edgeBase}
- **Hosting provider:** Lovable Cloud

## 3. Features

${featuresMd}

## 4. Database Schema

${schemaSection}

### Key relationships

- \`business_ideas.user_id\` → \`auth.users.id\` (owns plan)
- \`business_ideas.conversation_id\` → \`conversations.id\` (origin chat)
- \`chat_messages.conversation_id\` → \`conversations.id\`
- \`lead_contacts.business_idea_id\` → \`business_ideas.id\` (lead belongs to plan)
- \`lead_activities.lead_id\` → \`lead_contacts.id\`
- \`revenue_entries.lead_id\` → \`lead_contacts.id\`
- \`workflow_nodes.workflow_id\` / \`workflow_edges.workflow_id\` → \`workflows.id\`
- \`workflow_schedules.workflow_id\` → \`workflows.id\`
- \`workflow_executions.workflow_id\` → \`workflows.id\`
- \`mission_events.user_id\` / \`triad_events.user_id\` → \`auth.users.id\`

## 5. Edge Functions

${fnsMd}

## 6. Automation Logic

- **Cron driver:** \`pg_cron\` invokes \`workflow-scheduler\` every minute.
- **Time window:** each \`workflow_schedules.cron_expression\` is evaluated against \`now()\`; rows where \`next_run_at <= now()\` AND \`enabled = true\` fire.
- **Duplicate guard:** scheduler updates \`last_run_at\` and recomputes \`next_run_at\` atomically before dispatching, preventing double-fire.
- **Platform/slot selection:** workflow nodes carry a \`type\` and \`config.platform\` (e.g. \`youtube\`, \`twitter\`); \`workflow-executor\` walks the DAG via Kahn's algorithm and routes each node to the correct provider.

### Active schedules (current user)

${schedulesSection}

## 7. API Integrations

${integrationsMd}

## 8. Known Issues / Limitations

${issuesMd}

## 9. Recent Changes Log

_Last 10 in-app activity events from \`mission_events\` for the current user. (Edge runtime has no git access, so this is the in-app activity log rather than commit history.)_

${recentChangesSection}

---

_Spec generated dynamically by the \`generate-spec\` edge function. No secret keys are included in this document._
`;

    return new Response(md, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="SkyBrief-Spec.md"',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
