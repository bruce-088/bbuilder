import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  findLatestPlanInMessages,
  parseBusinessPlanMarkdown,
} from "../_shared/parseBusinessPlanMarkdown.ts";
import { ingestYoutubeUrl } from "../_shared/youtube.ts";
import { ingestWebsiteUrl } from "../_shared/website.ts";
import {
  buildPolsiaCompanyBrief,
  buildPolsiaKnowledgeBlock,
  POLSIA_IDEA_ADDENDUM,
} from "../_shared/polsia.ts";
import {
  buildTcreiKnowledgeBlock,
  TCREI_IDEA_SYSTEM_ADDENDUM,
} from "../_shared/tcrei.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request body validation schema
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(100000),
});

const N8nContextSchema = z.object({
  workflowName: z.string().max(500).optional(),
  workflowId: z.string().max(100).optional(),
  n8nInstanceUrl: z.string().url().max(500).optional(),
  businessName: z.string().max(200).optional(),
  niche: z.string().max(200).optional(),
  nodes: z.array(z.unknown()).max(100).optional(),
}).optional();

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).max(100).optional(),
  type: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  /** Target platform the idea must fit. "polsia" → Polsia-ready constraints; "tcrei" → structured TCREI intake flow. */
  platform: z.enum(["standalone", "polsia", "tcrei"]).optional(),
  n8nContext: N8nContextSchema,
});

// ─── Tool Definitions ───
const COPILOT_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_workflow",
      description: "Create a new automation workflow for the user. Use when they ask to set up, build, or create a workflow/automation.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the workflow" },
          description: { type: "string", description: "Brief description of what the workflow does" },
          nodes: {
            type: "array",
            description: "Array of nodes to add to the workflow",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["webhook_trigger", "schedule_trigger", "ai_agent", "http_request", "email_send", "filter", "code", "delay", "transform", "database_query"] },
                name: { type: "string" },
                config: { type: "object", description: "Node configuration" },
              },
              required: ["type", "name"],
            },
          },
        },
        required: ["name", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_lead",
      description: "Add a new lead/contact to the user's CRM pipeline. Use when they mention a prospect, potential client, or want to track a contact.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Lead's full name" },
          email: { type: "string", description: "Lead's email address" },
          company: { type: "string", description: "Lead's company name" },
          phone: { type: "string", description: "Lead's phone number" },
          source: { type: "string", description: "How the lead was acquired", enum: ["manual", "website", "referral", "social", "webhook", "other"] },
          stage: { type: "string", description: "Pipeline stage", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] },
          estimated_value: { type: "number", description: "Estimated deal value in dollars" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_workflow",
      description: "Trigger/execute an existing workflow by name or ID. Use when the user wants to run, test, or trigger one of their workflows.",
      parameters: {
        type: "object",
        properties: {
          workflow_name: { type: "string", description: "Name of the workflow to trigger (partial match)" },
          workflow_id: { type: "string", description: "Exact workflow ID if known" },
          trigger_data: { type: "object", description: "Data to pass to the workflow trigger" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "List current leads in the CRM pipeline, optionally filtered by stage. Use when the user asks about their pipeline, prospects, or deals.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filter by pipeline stage", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] },
          limit: { type: "number", description: "Max results to return (default 10)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_workflows",
      description: "List the user's existing workflows. Use when they ask what automations they have or want to see their workflows.",
      parameters: {
        type: "object",
        properties: {
          active_only: { type: "boolean", description: "Only show active workflows" },
        },
        additionalProperties: false,
      },
    },
  },
  // ─── NEW TOOLS ───
  {
    type: "function",
    function: {
      name: "log_revenue",
      description: "Record a revenue entry / payment. Use when the user says they made money, received a payment, closed a deal, got paid, or logged income.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Revenue amount in dollars" },
          source: { type: "string", description: "Revenue source (e.g. 'client work', 'subscription', 'freelance')" },
          is_recurring: { type: "boolean", description: "Whether this is recurring revenue (MRR)" },
          lead_name: { type: "string", description: "Name of the lead/client this revenue came from (will be matched)" },
          notes: { type: "string", description: "Optional notes about the revenue" },
        },
        required: ["amount", "source"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_revenue_stats",
      description: "Show revenue statistics: MRR, monthly revenue, total revenue, progress toward $10K/month goal, and breakdown by source. Use when user asks about revenue, income, earnings, or money.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead",
      description: "Update an existing lead's details (email, phone, company, tags, estimated value, etc). Use when user wants to change or update info on a lead.",
      parameters: {
        type: "object",
        properties: {
          lead_name: { type: "string", description: "Name of the lead to update (partial match)" },
          lead_id: { type: "string", description: "Exact lead ID if known" },
          email: { type: "string" },
          phone: { type: "string" },
          company: { type: "string" },
          estimated_value: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_lead_stage",
      description: "Move a lead to a different pipeline stage. Use when the user says to move, advance, promote, or change a lead's stage.",
      parameters: {
        type: "object",
        properties: {
          lead_name: { type: "string", description: "Name of the lead (partial match)" },
          lead_id: { type: "string", description: "Exact lead ID if known" },
          new_stage: { type: "string", description: "New pipeline stage", enum: ["captured", "qualified", "outreach", "nurturing", "won", "lost"] },
        },
        required: ["new_stage"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_lead_activity",
      description: "Log a note, call, email, or meeting on a lead's timeline. Use when the user says they called, emailed, met with, or want to note something about a lead.",
      parameters: {
        type: "object",
        properties: {
          lead_name: { type: "string", description: "Name of the lead (partial match)" },
          lead_id: { type: "string", description: "Exact lead ID if known" },
          activity_type: { type: "string", enum: ["note", "call", "email", "meeting", "task"], description: "Type of activity" },
          content: { type: "string", description: "Description of the activity" },
        },
        required: ["activity_type", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_lead",
      description: "Delete/remove a lead from the pipeline. Use when user wants to remove, delete, or clean up a lead.",
      parameters: {
        type: "object",
        properties: {
          lead_name: { type: "string", description: "Name of the lead to delete (partial match)" },
          lead_id: { type: "string", description: "Exact lead ID" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_workflow",
      description: "Set a cron schedule on a workflow so it runs automatically. Use when the user wants to schedule, automate timing, or set a recurring run for a workflow.",
      parameters: {
        type: "object",
        properties: {
          workflow_name: { type: "string", description: "Name of the workflow (partial match)" },
          workflow_id: { type: "string", description: "Exact workflow ID" },
          schedule: { type: "string", description: "Human-readable schedule like 'every day at 9am', 'every hour', 'weekdays at 8am', 'every 5 minutes'" },
          enabled: { type: "boolean", description: "Whether the schedule should be enabled (default true)" },
        },
        required: ["schedule"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_workflow",
      description: "Delete/remove a workflow. Use when the user wants to remove or delete one of their workflows.",
      parameters: {
        type: "object",
        properties: {
          workflow_name: { type: "string", description: "Name of the workflow to delete (partial match)" },
          workflow_id: { type: "string", description: "Exact workflow ID" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_stats",
      description: "Show pipeline analytics: total leads, leads by stage, conversion rate, total pipeline value, and top prospects. Use when the user asks about pipeline health, stats, or analytics.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_summary",
      description: "Retrieve the user's saved business idea details (name, niche, target audience, strategy). Use when the user asks about their business, what idea they saved, or needs a reminder of their plan.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_system_health",
      description: "Check the health of the entire Triad system: NexusAI, n8n, and NexusVocal. Pings each service and checks for recent errors in triad_events. Use when the user asks about system status, health, diagnostics, or why something is red/down.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fix_sync",
      description: "Re-send the business manifest to NexusAI to fix sync issues. Use when the user says 'fix the sync', 're-sync', or 'refresh Nexus data'.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "Which system to re-sync to", enum: ["nexusai", "nexusvocal", "all"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_pdf",
      description:
        "Generate a polished, downloadable PDF document for the user. Use this whenever the user asks for a PDF, a document, a printable, a downloadable file, a one-pager, a proposal, a brief, a script, a checklist, or anything they want to save / share / print. The PDF is rendered in the user's browser and downloaded automatically — do not paste long-form content into chat when this tool is more appropriate. ⚠️ DO NOT use this for exporting a Business Plan — use `export_business_plan_pdf` instead so the export mirrors the original plan verbatim.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Main title shown at the top of page 1." },
          subtitle: { type: "string", description: "Optional subtitle / one-line description." },
          filename: {
            type: "string",
            description:
              "Filename without extension, kebab-case (e.g. 'q1-outreach-plan'). Keep it short and descriptive.",
          },
          sections: {
            type: "array",
            description: "Ordered sections rendered top-to-bottom. Aim for 2–10 sections.",
            items: {
              type: "object",
              properties: {
                heading: { type: "string", description: "Optional section heading." },
                body: {
                  type: "string",
                  description:
                    "Section body. Supports paragraphs (blank line between), bullet lines starting with '- ', numbered lines like '1. ', and **bold** inline.",
                },
              },
              required: ["body"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "filename", "sections"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "export_business_plan_pdf",
      description:
        "Export the user's most recent Business Plan to a PDF — VERBATIM. Use this whenever the user asks to 'export', 'download', 'send me as PDF', 'save this as a PDF', or 'PDF this' for a Business Plan / business idea. The server reads the most recent Business Plan from the conversation and builds the PDF directly from it, so you DO NOT pass any section bodies — just call the tool with an optional filename. This guarantees zero paraphrasing, zero tool substitutions, and zero dropped sections.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description:
              "Optional filename without extension, kebab-case (e.g. 'lnkdn-architect-blueprint'). If omitted, the server derives it from the plan title.",
          },
          subtitle: {
            type: "string",
            description:
              "Optional override for the PDF subtitle line. If omitted, the server uses the lede line from the original plan.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ingest_youtube_url",
      description:
        "Ingest a YouTube video by URL and analyze its content. Call this WHENEVER the user pastes a YouTube link (youtube.com/watch, youtu.be, shorts, live) or asks you to 'summarize this video', 'watch this', 'extract the framework from this video', or 'turn this into a LinkedIn post'. The server fetches the transcript (or falls back to metadata) and you then craft the analysis. Do NOT try to guess the video content from the URL alone — always call this tool first.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full YouTube URL the user pasted." },
          intent: {
            type: "string",
            enum: ["summarize", "extract_framework", "linkedin_post", "business_plan_input", "raw_transcript"],
            description: "What the user wants done with the video content. Default 'summarize'.",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "export_polsia_company_brief",
      description:
        "Convert the most recent Business Plan in this conversation into a Polsia-ready Company Brief (CompanyConfig JSON + agent plan + paste-ready onboarding description for polsia.com/new). Use whenever the user says things like 'hand this to Polsia', 'export to Polsia', 'make this Polsia-ready', 'Polsia brief', 'launch this on Polsia', or 'does this fit Polsia'. The server builds the brief deterministically from the plan — do NOT paraphrase the plan yourself.",
      parameters: {
        type: "object",
        properties: {
          website_url: { type: "string", description: "Optional existing website URL to pre-fill in the brief" },
          github_repo: { type: "string", description: "Optional 'org/repo' the Polsia code-generation agent should work in" },
          monthly_target_usd: { type: "number", description: "Monthly net-profit target. Defaults to 10000." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ingest_website_url",
      description:
        "Read a live website or web page and return its actual text content. Call this WHENEVER the user pastes any non-YouTube URL, or says 'look at this site', 'check out my website', 'review this page', 'what do you think of this', 'design a business that fits this system', 'analyze this landing page', or 'deconstruct this article'. The server fetches the page (with a text-proxy fallback for JavaScript-rendered sites). NEVER guess what a site says from its URL or domain name — always call this tool first.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full website URL the user pasted." },
          intent: {
            type: "string",
            enum: [
              "summarize",
              "analyze_offer",
              "business_plan_input",
              "blueprint_input",
              "competitor_analysis",
              "raw_text",
            ],
            description: "What the user wants done with the page content. Default 'summarize'.",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_system_blueprint",
      description:
        "Persist a Systems Blueprint to the user's Library. Call this whenever the user wants to deconstruct a resource (YouTube video, article, PDF, podcast, case study) into a reusable Business Blueprint, OR says things like 'add this to my library', 'save this as a blueprint', 'deconstruct this', 'design a system from this'. Build the FULL structured blueprint object using every relevant section — this is the PRODUCT, not a summary. Mya is a Systems Architect; every blueprint answers: 'How would we build, automate, and operate this business?'",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short, distinctive blueprint title (e.g. 'The LinkedIn Authority Engine')." },
          summary: { type: "string", description: "2-4 sentence executive summary." },
          source_type: {
            type: "string",
            enum: ["youtube", "pdf", "article", "podcast", "book", "case_study", "internal_doc", "manual"],
            description: "Where this blueprint came from."
          },
          source_url: { type: "string", description: "URL of the source if applicable." },
          source_metadata: {
            type: "object",
            description: "Source-specific metadata (title, author, channel, duration, etc.). Open-ended object.",
            additionalProperties: true,
          },
          tags: { type: "array", items: { type: "string" }, description: "Lowercase short tags for filter/search (e.g. 'recurring', 'b2b', 'outbound', 'ai-native')." },
          facets: {
            type: "object",
            description: "Structured filters for future semantic search. Keys: revenue_model (one_time|recurring|productized|marketplace|ads|service|hybrid), business_model_type, startup_cost_usd (number), automation_potential (0-100), outbound_required (bool), inbound_dependent (bool).",
            additionalProperties: true,
          },
          blueprint: {
            type: "object",
            description:
              "The blueprint sections, keyed by section id. Fill EVERY section you can. Section ids: executive_summary, system_dna, revenue_model, offer, target_customer, customer_journey, business_workflow, required_automations, ai_opportunities, human_responsibilities, agent_responsibilities, technology_stack, empty_lane_analysis, competitive_advantage, risks, kpis, thirty_day_mvp, ninety_day_scale, execution_checklist, mutation_logic, openclaw_handoff. Each value is markdown text. For agent_responsibilities, use lines prefixed 'Mya:', 'Claw:', 'Anjel:' so the handoff package can split them.",
            additionalProperties: true,
          },
          handoff_package: {
            type: "object",
            description:
              "Optional structured override for the OpenClaw handoff. Keys: agents {mya:[], claw:[], anjel:[]}, mutation_pipeline (array of {state,label,agent}), required_automations[], tech_stack[], kpis[]. If omitted, the server derives it from the blueprint.",
            additionalProperties: true,
          },
        },
        required: ["title", "blueprint"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Helper: find lead by name or ID ───
async function findLead(
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (args.lead_id) {
    const { data } = await supabaseAdmin
      .from("lead_contacts").select("*").eq("id", args.lead_id).eq("user_id", userId).single();
    return data;
  }
  if (args.lead_name) {
    const { data } = await supabaseAdmin
      .from("lead_contacts").select("*").eq("user_id", userId)
      .ilike("name", `%${args.lead_name}%`).limit(1);
    return data?.[0] || null;
  }
  return null;
}

// ─── Helper: find workflow by name or ID ───
async function findWorkflow(
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (args.workflow_id) {
    const { data } = await supabaseAdmin
      .from("workflows").select("*").eq("id", args.workflow_id).eq("user_id", userId).single();
    return data;
  }
  if (args.workflow_name) {
    const { data } = await supabaseAdmin
      .from("workflows").select("*").eq("user_id", userId)
      .ilike("name", `%${args.workflow_name}%`).limit(1);
    return data?.[0] || null;
  }
  return null;
}

// ─── Helper: schedule string to cron ───
function scheduleToCron(schedule: string): string {
  const s = schedule.toLowerCase().trim();
  if (s.includes("every minute")) return "* * * * *";
  if (s.includes("every 5 min")) return "*/5 * * * *";
  if (s.includes("every 15 min")) return "*/15 * * * *";
  if (s.includes("every 30 min")) return "*/30 * * * *";
  if (s.includes("every hour") || s.includes("hourly")) return "0 * * * *";
  
  // Parse "at Xam/pm" patterns
  const timeMatch = s.match(/(\d{1,2})\s*(am|pm)/i);
  let hour = 9;
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    if (timeMatch[2].toLowerCase() === "pm" && hour !== 12) hour += 12;
    if (timeMatch[2].toLowerCase() === "am" && hour === 12) hour = 0;
  }

  if (s.includes("weekday")) return `0 ${hour} * * 1-5`;
  if (s.includes("weekly") || s.includes("every week")) return `0 ${hour} * * 1`;
  if (s.includes("daily") || s.includes("every day") || s.includes("every morning") || s.includes("every evening")) return `0 ${hour} * * *`;
  
  // Default: daily at extracted hour or 9am
  return `0 ${hour} * * *`;
}

// ─── Helper: broadcast triad event (DB + external POST) ───
// Returns { synced: boolean } so tool results can reflect sync status
async function broadcastTriadEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  eventType: string,
  sourceApp: string,
  payload: Record<string, unknown>,
): Promise<{ synced: boolean; targets_reached: string[] }> {
  const result = { synced: false, targets_reached: [] as string[] };

  // 1. Persist event locally
  try {
    await supabaseAdmin.from("triad_events").insert({
      user_id: userId,
      event_type: eventType,
      source_app: sourceApp,
      payload,
    });
  } catch (e) {
    console.warn("Triad DB insert failed:", e);
  }

  // 2. Fan-out to external Triad endpoints (fire-and-forget, 8s timeout)
  const syncSecret = Deno.env.get("TRIAD_SYNC_SECRET") || "";
  const nexusUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
  const vocalUrl = (Deno.env.get("WEATHERPOST_API_URL") || "").trim();

  const eventPayload = { event_type: eventType, source_app: sourceApp, user_id: userId, payload, ts: new Date().toISOString() };

  const targets: { label: string; url: string; body: string }[] = [];

  if (nexusUrl && !nexusUrl.includes("localhost") && !nexusUrl.includes("127.0.0.1")) {
    targets.push({ label: "NexusAI", url: nexusUrl, body: JSON.stringify(eventPayload) });
  }
  if (vocalUrl && !vocalUrl.includes("localhost") && !vocalUrl.includes("127.0.0.1")) {
    targets.push({ label: "NexusVocal", url: vocalUrl, body: JSON.stringify({ action: "event", ...eventPayload }) });
  }

  if (targets.length === 0) return result;

  // Send in parallel, track successes
  const results = await Promise.allSettled(
    targets.map(async (t) => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(t.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-triad-key": syncSecret },
          body: t.body,
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        if (!res.ok) {
          console.warn(`${t.label} broadcast [${res.status}]:`, await res.text().catch(() => ""));
          return { label: t.label, ok: false };
        }
        console.log(`${t.label} broadcast OK for ${eventType}`);
        return { label: t.label, ok: true };
      } catch (err) {
        clearTimeout(tid);
        console.warn(`${t.label} broadcast error:`, err);
        return { label: t.label, ok: false };
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) {
      result.targets_reached.push(r.value.label);
    }
  }
  result.synced = result.targets_reached.length > 0;
  return result;
}

// ─── Tool Execution ───
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  conversationMessages: Array<{ role: string; content: string }> = [],
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case "create_workflow": {
        const { data: workflow, error: wfError } = await supabaseAdmin
          .from("workflows")
          .insert({
            user_id: userId,
            name: args.name as string,
            description: args.description as string || null,
            is_active: true,
          })
          .select("id, name")
          .single();

        if (wfError) throw wfError;

        const nodes = (args.nodes as Array<{ type: string; name: string; config?: Record<string, unknown> }>) || [];
        if (nodes.length > 0) {
          const nodeInserts = nodes.map((n, i) => ({
            workflow_id: workflow.id,
            type: n.type,
            name: n.name,
            config: n.config || {},
            position_x: 100 + i * 250,
            position_y: 200,
          }));

          const { error: nodeError } = await supabaseAdmin
            .from("workflow_nodes")
            .insert(nodeInserts);

          if (nodeError) console.error("Error adding nodes:", nodeError);
        }

        // Broadcast to NexusAI
        const sync = await broadcastTriadEvent(supabaseAdmin, userId, "WORKFLOW_ACTIVATED", "business_builder", {
          action: "create_workflow",
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          node_count: nodes.length,
        });

        return {
          success: true,
          data: { workflow_id: workflow.id, name: workflow.name, node_count: nodes.length },
          triad_sync: sync,
        };
      }

      case "add_lead": {
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("lead_contacts")
          .insert({
            user_id: userId,
            name: args.name as string,
            email: (args.email as string) || null,
            company: (args.company as string) || null,
            phone: (args.phone as string) || null,
            source: (args.source as string) || "manual",
            stage: (args.stage as string) || "new",
            estimated_value: (args.estimated_value as number) || null,
            tags: (args.tags as string[]) || null,
          })
          .select("id, name, stage, estimated_value")
          .single();

        if (leadError) throw leadError;

        await supabaseAdmin.from("lead_activities").insert({
          user_id: userId,
          lead_id: lead.id,
          activity_type: "created",
          content: `Lead added via Mya Copilot`,
        });

        // Broadcast to NexusAI
        const sync = await broadcastTriadEvent(supabaseAdmin, userId, "CRM_UPDATE", "business_builder", {
          action: "add_lead",
          lead,
        });

        return { success: true, data: lead, triad_sync: sync };
      }

      case "trigger_workflow": {
        let query = supabaseAdmin
          .from("workflows")
          .select("id, name, is_active")
          .eq("user_id", userId);

        if (args.workflow_id) {
          query = query.eq("id", args.workflow_id as string);
        } else if (args.workflow_name) {
          query = query.ilike("name", `%${args.workflow_name as string}%`);
        }

        const { data: workflows, error: findError } = await query.limit(1);
        if (findError) throw findError;
        if (!workflows || workflows.length === 0) {
          return { success: false, error: "Workflow not found" };
        }

        const wf = workflows[0];

        const { data: execution, error: execError } = await supabaseAdmin
          .from("workflow_executions")
          .insert({
            workflow_id: wf.id,
            user_id: userId,
            status: "running",
            trigger_data: args.trigger_data || {},
          })
          .select("id")
          .single();

        if (execError) throw execError;

        // Broadcast to NexusAI
        const sync = await broadcastTriadEvent(supabaseAdmin, userId, "WORKFLOW_ACTIVATED", "business_builder", {
          action: "trigger_workflow",
          execution_id: execution.id,
          workflow_id: wf.id,
          workflow_name: wf.name,
        });

        return {
          success: true,
          data: { execution_id: execution.id, workflow_name: wf.name, workflow_id: wf.id },
          triad_sync: sync,
        };
      }

      case "list_leads": {
        let query = supabaseAdmin
          .from("lead_contacts")
          .select("id, name, email, company, stage, estimated_value, source, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit((args.limit as number) || 10);

        if (args.stage) {
          query = query.eq("stage", args.stage as string);
        }

        const { data: leads, error: leadsError } = await query;
        if (leadsError) throw leadsError;

        return { success: true, data: { leads, total: leads?.length || 0 } };
      }

      case "list_workflows": {
        let query = supabaseAdmin
          .from("workflows")
          .select("id, name, description, is_active, created_at, updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (args.active_only) {
          query = query.eq("is_active", true);
        }

        const { data: workflows, error: wfError } = await query;
        if (wfError) throw wfError;

        return { success: true, data: { workflows, total: workflows?.length || 0 } };
      }

      // ─── NEW TOOLS ───

      case "log_revenue": {
        // Optionally match lead by name
        let leadId: string | null = null;
        if (args.lead_name) {
          const lead = await findLead({ lead_name: args.lead_name }, userId, supabaseAdmin);
          if (lead) leadId = lead.id;
        }

        const { data, error } = await supabaseAdmin
          .from("revenue_entries")
          .insert({
            user_id: userId,
            amount: args.amount as number,
            source: (args.source as string) || "manual",
            is_recurring: (args.is_recurring as boolean) || false,
            lead_id: leadId,
            notes: (args.notes as string) || null,
          })
          .select("id, amount, source, is_recurring")
          .single();

        if (error) throw error;

        // Broadcast to NexusVocal for celebration post
        const sync = await broadcastTriadEvent(supabaseAdmin, userId, "REVENUE_MILESTONE", "business_builder", {
          action: "log_revenue",
          amount: args.amount,
          source: (args.source as string) || "manual",
          is_recurring: (args.is_recurring as boolean) || false,
          revenue_id: data.id,
        });

        return { success: true, data, triad_sync: sync };
      }

      case "get_revenue_stats": {
        const { data: entries, error } = await supabaseAdmin
          .from("revenue_entries")
          .select("amount, source, is_recurring, entry_date")
          .eq("user_id", userId);

        if (error) throw error;

        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthlyEntries = (entries || []).filter((e: any) => e.entry_date?.startsWith(thisMonth));
        const monthlyRevenue = monthlyEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
        const totalRevenue = (entries || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
        const mrr = (entries || []).filter((e: any) => e.is_recurring).reduce((s: number, e: any) => s + Number(e.amount), 0);

        const bySource: Record<string, number> = {};
        for (const e of entries || []) {
          bySource[(e as any).source] = (bySource[(e as any).source] || 0) + Number((e as any).amount);
        }

        const goal = 10000;

        // Also pull triad event counts for cross-system awareness
        let triadRevenueEvents = 0;
        try {
          const { data: triadEvents } = await supabaseAdmin
            .from("triad_events")
            .select("payload")
            .eq("user_id", userId)
            .eq("event_type", "REVENUE_MILESTONE");
          triadRevenueEvents = triadEvents?.length || 0;
        } catch { /* non-critical */ }

        return {
          success: true,
          data: {
            monthly_revenue: monthlyRevenue,
            total_revenue: totalRevenue,
            mrr,
            revenue_by_source: bySource,
            goal,
            progress_percent: Math.min(Math.round((monthlyRevenue / goal) * 100), 100),
            entry_count: entries?.length || 0,
            triad_revenue_events: triadRevenueEvents,
          },
        };
      }

      case "update_lead": {
        const lead = await findLead(args, userId, supabaseAdmin);
        if (!lead) return { success: false, error: "Lead not found" };

        const updates: Record<string, unknown> = {};
        if (args.email !== undefined) updates.email = args.email;
        if (args.phone !== undefined) updates.phone = args.phone;
        if (args.company !== undefined) updates.company = args.company;
        if (args.estimated_value !== undefined) updates.estimated_value = args.estimated_value;
        if (args.tags !== undefined) updates.tags = args.tags;

        if (Object.keys(updates).length === 0) {
          return { success: false, error: "No fields to update" };
        }

        const { error } = await supabaseAdmin
          .from("lead_contacts").update(updates).eq("id", lead.id);
        if (error) throw error;

        await supabaseAdmin.from("lead_activities").insert({
          user_id: userId,
          lead_id: lead.id,
          activity_type: "note",
          content: `Updated: ${Object.keys(updates).join(", ")}`,
        });

        // Broadcast to NexusAI
        const sync = await broadcastTriadEvent(supabaseAdmin, userId, "CRM_UPDATE", "business_builder", {
          action: "update_lead",
          lead_id: lead.id,
          lead_name: lead.name,
          updated_fields: Object.keys(updates),
          updates,
        });

        return { success: true, data: { lead_id: lead.id, name: lead.name, updated_fields: Object.keys(updates) }, triad_sync: sync };
      }

      case "move_lead_stage": {
        const lead = await findLead(args, userId, supabaseAdmin);
        if (!lead) return { success: false, error: "Lead not found" };

        const oldStage = lead.stage;
        const newStage = args.new_stage as string;

        const { error } = await supabaseAdmin
          .from("lead_contacts").update({ stage: newStage }).eq("id", lead.id);
        if (error) throw error;

        await supabaseAdmin.from("lead_activities").insert({
          user_id: userId,
          lead_id: lead.id,
          activity_type: "stage_change",
          content: `Moved from ${oldStage} to ${newStage}`,
          metadata: { old_stage: oldStage, new_stage: newStage },
        });

        // Broadcast to NexusAI
        const sync = await broadcastTriadEvent(supabaseAdmin, userId, "CRM_UPDATE", "business_builder", {
          action: "move_lead_stage",
          lead_id: lead.id,
          lead_name: lead.name,
          old_stage: oldStage,
          new_stage: newStage,
        });

        return { success: true, data: { lead_id: lead.id, name: lead.name, old_stage: oldStage, new_stage: newStage }, triad_sync: sync };
      }

      case "log_lead_activity": {
        const lead = await findLead(args, userId, supabaseAdmin);
        if (!lead) return { success: false, error: "Lead not found" };

        const { data, error } = await supabaseAdmin
          .from("lead_activities")
          .insert({
            user_id: userId,
            lead_id: lead.id,
            activity_type: args.activity_type as string,
            content: args.content as string,
          })
          .select("id, activity_type, content")
          .single();

        if (error) throw error;
        return { success: true, data: { ...data, lead_name: lead.name } };
      }

      case "delete_lead": {
        const lead = await findLead(args, userId, supabaseAdmin);
        if (!lead) return { success: false, error: "Lead not found" };

        // Delete activities first, then lead
        await supabaseAdmin.from("lead_activities").delete().eq("lead_id", lead.id);
        const { error } = await supabaseAdmin.from("lead_contacts").delete().eq("id", lead.id);
        if (error) throw error;

        return { success: true, data: { deleted_name: lead.name, deleted_id: lead.id } };
      }

      case "schedule_workflow": {
        const wf = await findWorkflow(args, userId, supabaseAdmin);
        if (!wf) return { success: false, error: "Workflow not found" };

        const cronExpr = scheduleToCron(args.schedule as string);
        const enabled = args.enabled !== false;

        // Upsert schedule
        const { data: existing } = await supabaseAdmin
          .from("workflow_schedules").select("id").eq("workflow_id", wf.id).maybeSingle();

        if (existing) {
          await supabaseAdmin.from("workflow_schedules")
            .update({ cron_expression: cronExpr, enabled }).eq("id", existing.id);
        } else {
          await supabaseAdmin.from("workflow_schedules")
            .insert({ workflow_id: wf.id, user_id: userId, cron_expression: cronExpr, enabled });
        }

        return {
          success: true,
          data: { workflow_name: wf.name, cron: cronExpr, schedule_human: args.schedule, enabled },
        };
      }

      case "delete_workflow": {
        const wf = await findWorkflow(args, userId, supabaseAdmin);
        if (!wf) return { success: false, error: "Workflow not found" };

        // Clean up related data
        await supabaseAdmin.from("workflow_schedules").delete().eq("workflow_id", wf.id);
        await supabaseAdmin.from("workflow_edges").delete().eq("workflow_id", wf.id);
        await supabaseAdmin.from("workflow_nodes").delete().eq("workflow_id", wf.id);
        const { error } = await supabaseAdmin.from("workflows").delete().eq("id", wf.id);
        if (error) throw error;

        return { success: true, data: { deleted_name: wf.name, deleted_id: wf.id } };
      }

      case "get_pipeline_stats": {
        const { data: leads, error } = await supabaseAdmin
          .from("lead_contacts")
          .select("id, stage, estimated_value, name")
          .eq("user_id", userId);

        if (error) throw error;

        const total = leads?.length || 0;
        const byStage: Record<string, number> = {};
        let totalValue = 0;
        for (const l of leads || []) {
          byStage[l.stage] = (byStage[l.stage] || 0) + 1;
          totalValue += Number(l.estimated_value || 0);
        }

        const wonCount = byStage["won"] || 0;
        const conversionRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;

        // Top 3 prospects by value
        const topProspects = (leads || [])
          .filter((l: any) => l.stage !== "won" && l.stage !== "lost")
          .sort((a: any, b: any) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))
          .slice(0, 3)
          .map((l: any) => ({ name: l.name, value: Number(l.estimated_value || 0), stage: l.stage }));

        // Enrich with triad event counts for cross-system awareness
        let triadCrmEvents = 0;
        try {
          const { data: triadEvents } = await supabaseAdmin
            .from("triad_events")
            .select("id")
            .eq("user_id", userId)
            .eq("event_type", "CRM_UPDATE");
          triadCrmEvents = triadEvents?.length || 0;
        } catch { /* non-critical */ }

        return {
          success: true,
          data: {
            total_leads: total,
            leads_by_stage: byStage,
            pipeline_value: totalValue,
            conversion_rate: conversionRate,
            top_prospects: topProspects,
            triad_crm_events: triadCrmEvents,
          },
        };
      }

      case "get_business_summary": {
        // Pull latest synced manifest from triad_manifests first
        const { data: manifest } = await supabaseAdmin
          .from("triad_manifests")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        // Fall back to business_ideas if no manifest exists
        const { data: ideas, error } = await supabaseAdmin
          .from("business_ideas")
          .select("id, business_name, niche, target_audience, value_proposition, service_offering, revenue_math, is_favorite")
          .eq("user_id", userId)
          .order("is_favorite", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) throw error;

        if (manifest) {
          return {
            success: true,
            data: {
              source: "triad_manifest",
              business_name: manifest.business_name,
              niche: manifest.niche,
              target_audience: manifest.target_audience,
              content_pillars: manifest.content_pillars,
              crm_stages: manifest.crm_stages,
              status: manifest.status,
              last_synced: manifest.updated_at,
              ideas: ideas || [],
              primary: ideas?.[0] || null,
            },
          };
        }

        if (!ideas || ideas.length === 0) {
          return { success: true, data: { message: "No business ideas saved yet. Let's brainstorm one!" } };
        }

        return { success: true, data: { source: "business_ideas", ideas, primary: ideas[0] } };
      }

      case "check_system_health": {
        const syncSecret = Deno.env.get("TRIAD_SYNC_SECRET") || "";
        const nexusUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
        const vocalUrl = (Deno.env.get("WEATHERPOST_API_URL") || "").trim();

        // Ping NexusAI
        let nexusStatus = "unknown";
        if (nexusUrl && !nexusUrl.includes("localhost")) {
          try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 5000);
            const res = await fetch(nexusUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-triad-key": syncSecret },
              body: JSON.stringify({ action: "health_check", ts: new Date().toISOString() }),
              signal: ctrl.signal,
            });
            clearTimeout(tid);
            nexusStatus = res.ok || res.status === 200 ? "up" : `down (${res.status})`;
          } catch (e: any) {
            nexusStatus = e?.name === "AbortError" ? "down (timeout)" : "down (unreachable)";
          }
        } else {
          nexusStatus = "not_configured";
        }

        // Ping NexusVocal
        let vocalStatus = "unknown";
        if (vocalUrl && !vocalUrl.includes("localhost")) {
          try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 5000);
            const res = await fetch(vocalUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-triad-key": syncSecret },
              body: JSON.stringify({ action: "health_check", ts: new Date().toISOString() }),
              signal: ctrl.signal,
            });
            clearTimeout(tid);
            vocalStatus = res.ok || res.status === 200 ? "up" : `down (${res.status})`;
          } catch (e: any) {
            vocalStatus = e?.name === "AbortError" ? "down (timeout)" : "down (unreachable)";
          }
        } else {
          vocalStatus = "not_configured";
        }

        // Check n8n via user preferences
        let n8nStatus = "unknown";
        const { data: prefs } = await supabaseAdmin
          .from("user_preferences")
          .select("n8n_instance_url")
          .eq("user_id", userId)
          .maybeSingle();

        if (prefs?.n8n_instance_url) {
          try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 5000);
            const res = await fetch(prefs.n8n_instance_url, { method: "GET", signal: ctrl.signal });
            clearTimeout(tid);
            n8nStatus = res.ok || res.status === 200 ? "up" : `down (${res.status})`;
          } catch (e: any) {
            n8nStatus = e?.name === "AbortError" ? "down (timeout)" : "down (unreachable)";
          }
        } else {
          n8nStatus = "not_configured";
        }

        // Check recent error events
        const { data: errorEvents } = await supabaseAdmin
          .from("triad_events")
          .select("id, event_type, payload, created_at, source_app")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        const errors = (errorEvents || []).filter((e: any) => {
          const p = e.payload;
          return p?.status === "error" || p?.error || p?.success === false || e.event_type?.includes("ERROR") || e.event_type?.includes("FAILED");
        }).slice(0, 5);

        return {
          success: true,
          data: {
            nexusai: nexusStatus,
            nexusvocal: vocalStatus,
            n8n: n8nStatus,
            recent_errors: errors.map((e: any) => ({
              event_type: e.event_type,
              source: e.source_app,
              error: e.payload?.error || e.payload?.message || JSON.stringify(e.payload).slice(0, 200),
              when: e.created_at,
            })),
            checked_at: new Date().toISOString(),
          },
        };
      }

      case "fix_sync": {
        const target = (args.target as string) || "all";

        // Get latest manifest
        const { data: manifest } = await supabaseAdmin
          .from("triad_manifests")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        // Fall back to latest business idea
        let payload: Record<string, unknown>;
        if (manifest) {
          payload = {
            action: "manifest",
            business_name: manifest.business_name,
            niche: manifest.niche,
            target_audience: manifest.target_audience,
            content_pillars: manifest.content_pillars,
            crm_stages: manifest.crm_stages,
            metadata: manifest.metadata,
          };
        } else {
          const { data: idea } = await supabaseAdmin
            .from("business_ideas")
            .select("*")
            .eq("user_id", userId)
            .order("is_favorite", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!idea) {
            return { success: false, error: "No business manifest or idea found to sync" };
          }

          payload = {
            action: "manifest",
            business_name: idea.business_name,
            niche: idea.niche,
            target_audience: idea.target_audience,
            service_offering: idea.service_offering,
            value_proposition: idea.value_proposition,
          };
        }

        const syncSecret = Deno.env.get("TRIAD_SYNC_SECRET") || "";
        const nexusUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
        const vocalUrl = (Deno.env.get("WEATHERPOST_API_URL") || "").trim();
        const results: Array<{ target: string; success: boolean; status?: number; response?: string }> = [];

        if ((target === "all" || target === "nexusai") && nexusUrl && !nexusUrl.includes("localhost")) {
          try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 10000);
            const res = await fetch(nexusUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-triad-key": syncSecret },
              body: JSON.stringify({ ...payload, user_id: userId, ts: new Date().toISOString() }),
              signal: ctrl.signal,
            });
            clearTimeout(tid);
            const text = await res.text().catch(() => "");
            results.push({ target: "NexusAI", success: res.ok, status: res.status, response: text.slice(0, 300) });
          } catch (e: any) {
            results.push({ target: "NexusAI", success: false, response: String(e) });
          }
        }

        if ((target === "all" || target === "nexusvocal") && vocalUrl && !vocalUrl.includes("localhost")) {
          try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 10000);
            const res = await fetch(vocalUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-triad-key": syncSecret },
              body: JSON.stringify({ ...payload, user_id: userId, ts: new Date().toISOString() }),
              signal: ctrl.signal,
            });
            clearTimeout(tid);
            const text = await res.text().catch(() => "");
            results.push({ target: "NexusVocal", success: res.ok, status: res.status, response: text.slice(0, 300) });
          } catch (e: any) {
            results.push({ target: "NexusVocal", success: false, response: String(e) });
          }
        }

        // Log the fix attempt as a triad event
        await broadcastTriadEvent(supabaseAdmin, userId, "SYNC_FIX_ATTEMPTED", "business_builder", {
          target,
          results,
          manifest_name: (payload as any).business_name,
        });

        const allOk = results.every((r) => r.success);
        return {
          success: allOk,
          data: {
            results,
            manifest_sent: (payload as any).business_name,
            fix_status: allOk ? "All targets re-synced successfully" : "Some targets failed — check results",
          },
        };
      }

      case "generate_pdf": {
        // 🔒 Server-side coercion: if there's a Business Plan in this
        // conversation, the user almost certainly wants the verbatim export.
        // Force the model to retry with `export_business_plan_pdf` so it
        // can't paraphrase the plan by accident (e.g. "blueprint", "full plan").
        const planInConversation = findLatestPlanInMessages(conversationMessages);
        if (planInConversation) {
          console.warn("[pdf_export_debug] generate_pdf blocked — plan present", {
            user_id: userId,
            arg_title: typeof args.title === "string" ? args.title : null,
          });
          return {
            success: false,
            error:
              "A Business Plan exists in this conversation. To export it as a PDF you MUST call `export_business_plan_pdf` (not `generate_pdf`) so the export is verbatim and nothing is paraphrased or dropped. Retry the tool call now with `export_business_plan_pdf` and only an optional `filename`.",
          };
        }
        // Client-resolved: the browser renders & downloads the PDF.
        // We return the args under `data` so the existing TOOL_RESULT marker
        // stream carries them through to the frontend handler.
        const title = typeof args.title === "string" ? args.title.trim() : "";
        const filename = typeof args.filename === "string" ? args.filename.trim() : "";
        const sectionsRaw = Array.isArray(args.sections) ? args.sections : [];
        if (!title || !filename || sectionsRaw.length === 0) {
          return { success: false, error: "generate_pdf requires title, filename, and at least one section." };
        }
        const sections = sectionsRaw
          .filter((s: any) => s && typeof s.body === "string" && s.body.trim().length > 0)
          .slice(0, 50)
          .map((s: any) => ({
            heading: typeof s.heading === "string" ? s.heading : undefined,
            body: String(s.body),
          }));
        if (sections.length === 0) {
          return { success: false, error: "generate_pdf requires at least one non-empty section body." };
        }
        return {
          success: true,
          data: {
            client_action: "generate_pdf",
            title,
            subtitle: typeof args.subtitle === "string" ? args.subtitle : undefined,
            filename,
            sections,
            page_count_estimate: sections.length,
          },
        };
      }

      case "export_business_plan_pdf": {
        // 🔒 Deterministic verbatim export: server reads the most recent
        // Business Plan from the conversation, parses it section-by-section,
        // and emits a generate_pdf payload with byte-for-byte body strings.
        // The model never gets to paraphrase, drop, or invent sections.
        const planText = findLatestPlanInMessages(conversationMessages);
        if (!planText) {
          console.warn("[pdf_export_debug] no business plan found in conversation", {
            user_id: userId,
            message_count: conversationMessages.length,
          });
          return {
            success: false,
            error:
              "No Business Plan found in this conversation. Generate one first, then export.",
          };
        }
        const parsed = parseBusinessPlanMarkdown(planText);
        if (!parsed || parsed.sections.length === 0) {
          console.warn("[pdf_export_debug] plan parse failed", {
            user_id: userId,
            sample: planText.slice(0, 120),
          });
          return {
            success: false,
            error: "Could not parse the Business Plan into sections.",
          };
        }

        const rawFilename =
          typeof args.filename === "string" && args.filename.trim()
            ? args.filename.trim()
            : parsed.title;
        const filename = rawFilename
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80) || "business-plan";

        const subtitle =
          typeof args.subtitle === "string" && args.subtitle.trim()
            ? args.subtitle.trim()
            : parsed.subtitle;

        console.log("[pdf_export_debug] verbatim export built", {
          user_id: userId,
          title: parsed.title,
          section_count: parsed.sections.length,
          headings: parsed.sections.map((s) => s.heading),
          filename,
        });

        return {
          success: true,
          data: {
            client_action: "generate_pdf",
            title: parsed.title,
            subtitle,
            filename,
            sections: parsed.sections,
            page_count_estimate: parsed.sections.length,
            verbatim: true,
          },
        };
      }

      case "export_polsia_company_brief": {
        // Deterministic handoff: read the latest Business Plan from the
        // conversation, parse it verbatim, and map it onto Polsia's
        // CompanyConfig schema. The model never gets to invent fields.
        const planText = findLatestPlanInMessages(conversationMessages);
        if (!planText) {
          return {
            success: false,
            error: "No Business Plan found in this conversation. Generate one first (ideally in Polsia-ready mode), then export it to Polsia.",
          };
        }
        const parsed = parseBusinessPlanMarkdown(planText);
        if (!parsed || parsed.sections.length === 0) {
          return { success: false, error: "Could not parse the Business Plan into sections." };
        }
        const brief = buildPolsiaCompanyBrief(parsed, planText, {
          websiteUrl: typeof args.website_url === "string" ? args.website_url.trim() : undefined,
          githubRepo: typeof args.github_repo === "string" ? args.github_repo.trim() : undefined,
          monthlyTargetUsd: typeof args.monthly_target_usd === "number" && args.monthly_target_usd > 0 ? args.monthly_target_usd : undefined,
        });
        const filename = `polsia-company-${brief.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "brief"}.json`;
        console.log("[polsia_handoff] brief built", {
          user_id: userId,
          name: brief.name,
          fit_score: brief.fit.score,
          agents_planned: Object.keys(brief.agent_plan).length,
        });
        return {
          success: true,
          data: {
            client_action: "download_polsia_brief",
            filename,
            brief,
            polsia_new_url: "https://polsia.com/new",
            next_steps: [
              "Open polsia.com/new → Create a new company",
              "Paste the onboarding description, then fill mission / target market / pricing from the brief",
              "Connect Stripe, GitHub, X and email so each Polsia agent can run its lane",
              "Come back to Mya daily with Polsia's evening summary to steer strategy",
            ],
          },
        };
      }

      case "ingest_youtube_url": {
        const url = typeof args.url === "string" ? args.url.trim() : "";
        if (!url) return { success: false, error: "ingest_youtube_url requires a YouTube URL." };
        const intent = typeof args.intent === "string" ? args.intent : "summarize";
        try {
          const ingestion = await ingestYoutubeUrl(url);
          // Hard cap transcript size returned to the model to keep context lean.
          const MAX_CHARS = 18000;
          const transcript =
            ingestion.transcript.length > MAX_CHARS
              ? ingestion.transcript.slice(0, MAX_CHARS) + "\n…[truncated]"
              : ingestion.transcript;
          return {
            success: true,
            data: {
              intent,
              source: ingestion.source,
              video_id: ingestion.meta.video_id,
              url: ingestion.meta.url,
              title: ingestion.meta.title,
              author: ingestion.meta.author,
              thumbnail: ingestion.meta.thumbnail,
              duration_sec: ingestion.meta.duration_sec,
              transcript_chars: transcript.length,
              transcript,
              warning: ingestion.warning,
            },
          };
        } catch (e: any) {
          return { success: false, error: e?.message || "YouTube ingestion failed." };
        }
      }

      case "ingest_website_url": {
        const url = typeof args.url === "string" ? args.url.trim() : "";
        if (!url) return { success: false, error: "ingest_website_url requires a URL." };
        const intent = typeof args.intent === "string" ? args.intent : "summarize";
        console.log("[ingest_website_url] start", { url, intent });
        try {
          const ingestion = await ingestWebsiteUrl(url);
          console.log("[ingest_website_url] ok", {
            url,
            source: ingestion.source,
            chars: ingestion.text.length,
          });
          return {
            success: true,
            data: {
              intent,
              source: ingestion.source,
              url: ingestion.meta.url,
              final_url: ingestion.meta.final_url,
              title: ingestion.meta.title,
              description: ingestion.meta.description,
              site_name: ingestion.meta.site_name,
              text_chars: ingestion.text.length,
              text: ingestion.text,
              warning: ingestion.warning,
            },
          };
        } catch (e: any) {
          const message = e?.message || "Website ingestion failed.";
          console.error("[ingest_website_url] failed", { url, message });
          return { success: false, error: message };
        }
      }


      case "save_system_blueprint": {
        const title = typeof args.title === "string" ? args.title.trim() : "";
        const blueprint = (args.blueprint && typeof args.blueprint === "object") ? args.blueprint as Record<string, unknown> : null;
        if (!title || !blueprint) return { success: false, error: "save_system_blueprint requires title and blueprint." };
        const row = {
          user_id: userId,
          title,
          summary: typeof args.summary === "string" ? args.summary : null,
          source_type: typeof args.source_type === "string" ? args.source_type : "manual",
          source_url: typeof args.source_url === "string" ? args.source_url : null,
          source_metadata: (args.source_metadata && typeof args.source_metadata === "object") ? args.source_metadata : {},
          blueprint,
          tags: Array.isArray(args.tags) ? args.tags.filter((t) => typeof t === "string") : [],
          facets: (args.facets && typeof args.facets === "object") ? args.facets : {},
          handoff_package: (args.handoff_package && typeof args.handoff_package === "object") ? args.handoff_package : {},
          status: "ready",
        };
        const { data, error } = await supabaseAdmin
          .from("system_blueprints")
          .insert(row)
          .select("id, title")
          .single();
        if (error) return { success: false, error: error.message };
        return {
          success: true,
          data: {
            blueprint_id: (data as any).id,
            title: (data as any).title,
            section_count: Object.keys(blueprint).length,
            library_url: "/library",
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool execution error (${toolName}):`, err);
    return { success: false, error: err instanceof Error ? err.message : "Execution failed" };
  }
}

// ─── System Prompt ───
const SYSTEM_PROMPT = `# SYSTEM-WIDE ZENITH — PRODUCT DOCTRINE (HIGHEST PRIORITY)

This is your strategic alignment for bbuilder. Absorb it before any other instruction in this prompt.

## Your Mission
You are the **Product Lead for bbuilder**. Your purpose is not content production — it is **Clarity and Direction.** Build a product that creates massive leverage for its users. Optimize for signal. Relentlessly remove noise.

## Your Role in the Crew
You define the **"What"** and the **"Why."** Anjel (Chief of Staff) defines the **"How"** and manages execution inside Mission Control. Every directive you give will be operationalized into real tasks, opportunities, and revenue tracking.

## Decision Framework (The Product Doctrine)
1. Prefer simplicity over complexity.
2. Build for the future operator.
3. Every feature must map back to a core user value.
4. Favor durable product architecture over "hacks."

## Operating Principle
Act as if you are building the flagship product of an enduring firm. Direction must be clear enough for Anjel to turn into a tracked project, but visionary enough to stay ahead of the market.

When the user issues a product update, respond as Product Lead: name the "What" and "Why," apply the Doctrine, and hand a crisp directive to Anjel/Mission Control.

---

You are **Mya** (Mission Yield Accelerator) — the user's AI business partner and autonomous operating system for building a $10K/month business.

## PHILOSOPHY — EFFORTLESS SUCCESS
Your core belief: success is not just possible — it is **inevitable** for anyone who follows your guidance. You operate from the principle of "effortlessly attaining 100% success while having fun building towards it." $10K/month is the baseline, not the ceiling. Every single interaction you have should move the user measurably closer to that goal.

**Every tool you execute is a Quest** — a concrete step on the $10K/month mission. Frame it that way. "Quest complete: lead added ✅ — one step closer to $10K."

## IDENTITY
You are a successful consultant who has already built what the user is building. You don't cheerlead — you **eliminate guesswork**. You see the entire board, know exactly what moves to make, and execute them directly. Challenges are adventures, not obstacles. Setbacks are data, not defeat.

**Personality traits:**
- Confident and direct — you give the answer, not five options
- Warm but efficient — celebrate wins briefly, then pivot to the next move
- Playfully assured — "Of course that worked. What did you expect? 😏"
- Mission-driven — every response ties back to the $10K/month quest

## CRITICAL RULE — TOOL-FIRST EXECUTION
You have 23 tools that let you take **direct action** on behalf of the user. NEVER describe what you "would" do or explain steps — **just DO IT** by calling the tool. If the user's intent matches a tool's purpose, call it immediately.

After every tool execution, do TWO things:
1. **Suggest the logical next step** to keep momentum
2. **Acknowledge the Triad sync** when applicable

Next-step examples:
- After add_lead → "Quest complete ✅ I've synced this to your NexusAI dashboard. Want me to set up an outreach workflow for them?"
- After create_workflow → "Workflow activated and tracked across the Triad ⚡ Should I schedule this to run daily?"
- After log_revenue → "Revenue logged! I've sent a milestone to NexusVocal — a celebration post is being drafted 🎉 Want to see your updated $10K progress?"
- After move_lead_stage to "won" → "Lead won! NexusAI is updated. Let's log that revenue — how much was the deal?"
- After trigger_workflow → "Running now — NexusAI is tracking execution status. I'll let you know how it goes."
- After get_business_summary → "Here's your latest synced business identity. Want me to check pipeline health?"

Occasionally (not every time), add a proactive sync note like:
"I've synced this update to your NexusAI dashboard and drafted a celebration post in NexusVocal. We're moving fast! 🚀"

## TOOL CAPABILITIES — YOUR CORE QUEST ACTIONS

### 🔧 Workflows & Automation (5 tools)
| Intent | Tool | Triad Effect |
|---|---|---|
| Create/build an automation | \`create_workflow\` | → WORKFLOW_ACTIVATED to NexusAI |
| Run/trigger/test a workflow | \`trigger_workflow\` | → WORKFLOW_ACTIVATED to NexusAI |
| See existing workflows | \`list_workflows\` | read-only |
| Set a recurring schedule | \`schedule_workflow\` | — |
| Remove a workflow | \`delete_workflow\` | — |

### 👥 Lead & CRM Management (6 tools)
| Intent | Tool | Triad Effect |
|---|---|---|
| Add a prospect/contact/lead | \`add_lead\` | → CRM_UPDATE to NexusAI |
| View pipeline / list leads | \`list_leads\` | read-only |
| Change lead details | \`update_lead\` | → CRM_UPDATE to NexusAI |
| Advance lead through funnel | \`move_lead_stage\` | → CRM_UPDATE to NexusAI |
| Log a call/email/meeting/note | \`log_lead_activity\` | — |
| Remove a lead | \`delete_lead\` | — |

### 💰 Revenue & Analytics (2 tools)
| Intent | Tool | Triad Effect |
|---|---|---|
| Record income/payment | \`log_revenue\` | → REVENUE_MILESTONE to NexusVocal |
| Check revenue stats & $10K progress | \`get_revenue_stats\` | reads Triad event data |

### 📊 Business Intelligence (2 tools)
| Intent | Tool | Triad Effect |
|---|---|---|
| Pipeline health & conversion rates | \`get_pipeline_stats\` | reads Triad event data |
| Recall business identity & strategy | \`get_business_summary\` | reads latest triad_manifest |

### 🏢 Polsia Handoff (1 tool)
| Intent | Tool | Triad Effect |
|---|---|---|
| Export plan as Polsia company brief | \`export_polsia_company_brief\` | builds CompanyConfig JSON deterministically |

### 🏥 System Diagnostics (2 tools)
| Intent | Tool | Triad Effect |
|---|---|---|
| Check system health / why red light | \`check_system_health\` | pings NexusAI, n8n, NexusVocal |
| Fix sync / re-send manifest | \`fix_sync\` | re-sends manifest to targets |

## TRIAD ECOSYSTEM — REAL-TIME SYNC
You are the command center of the Triad. Every action you take ripples across the entire system:
- **CRM actions** (add/update/move lead) → instantly mirrored in NexusAI's CRM
- **Revenue milestones** → NexusVocal automatically drafts celebration content
- **Workflow activations** → NexusAI tracks execution status in real-time
- **Stats & summaries** → pull live data from the unified Triad event stream

When you execute a tool with a Triad effect, the broadcast happens automatically. Your tool result will include a \`triad_sync\` field:
- If \`triad_sync.synced\` is true → confirm it: "I've updated your NexusAI pipeline and notified NexusVocal. We're one step closer to that $10K goal! 🚀"
- If \`triad_sync.synced\` is false → still celebrate the local action, but add: "The sync to Nexus is pending, but I've saved it here for now!"
- If \`triad_sync.targets_reached\` lists specific targets, mention them by name (NexusAI, NexusVocal)

## RESPONSE STYLE
- Use markdown formatting with strategic emoji — not emoji soup
- Be concise: act first, explain briefly after
- Frame every result as a **Quest step** toward $10K/month
- NEVER say "I can help you with that" — just do it
- After tool results: one-line quest completion → Triad sync note (occasionally) → next strategic move

## EXPERTISE
Online business models, AI automation, n8n workflows, sales pipelines, revenue modeling, market validation, content strategy, and scaling solopreneur operations.

## N8N TROUBLESHOOTING
When users need help with n8n nodes, analyze configurations and provide specific fixes with exact field names and values. You are a consultant, not a tutorial — give the fix, not the theory.

## SYSTEM DEBUGGER SUPER-SKILL
You are also the proactive monitor for the entire Triad system. You have two diagnostic tools:

### 🏥 \`check_system_health\` — Diagnostic Scanner
Call this when the user asks about system status, health, why something is down, or when you detect issues. It pings NexusAI, n8n, and NexusVocal and returns their status plus recent error events.

When reporting results:
- Green service → "✅ NexusAI: Online"
- Red service → "🔴 NexusAI: Offline (timeout)" — explain what this means and suggest fixes
- If there are recent errors, proactively alert: "⚠️ System Alert: [event_type] failed [time ago]. Error: [message]. Should I attempt a re-sync?"

### 🔧 \`fix_sync\` — Self-Healing Re-Sync
Call this when the user says "fix the sync", "re-sync", "refresh Nexus", or when you detect stale data. It re-sends the full business manifest to NexusAI/NexusVocal with the x-triad-key header.

After fixing, confirm: "🔄 Re-sync complete: [manifest name] sent to [targets]. All systems updated."

### Proactive Error Reporting
If \`check_system_health\` reveals failed events, interrupt your normal response to alert:
"🚨 **System Alert:** The [workflow/outreach] for **[Lead Name]** just failed in [system]. The error was: \`[error message]\`. Should I attempt a re-sync or do you want to check the logs?"

## 📄 PDF EXPORT SUPER-SKILL
When the user asks for a PDF, document, printable, one-pager, proposal, brief, script, checklist, "send me this in writing", "save this as a PDF", or anything similar — call \`generate_pdf\` instead of pasting the whole document into chat. Structure it into clean sections with short headings and use \`**bold**\` and \`- \` bullets sparingly. After it's delivered, give a one-sentence confirmation like "📄 Sent — your PDF just downloaded." and offer one specific next step.

### 🔒 BUSINESS PLAN EXPORT FIDELITY (CRITICAL)
Whenever the most recent Business Plan in this conversation is the thing the user wants on paper, you MUST call \`export_business_plan_pdf\` — NEVER \`generate_pdf\`. This rule fires for ANY of the following phrasings (non-exhaustive): "export the plan", "download the plan", "send me the PDF", "save as PDF", "give me the document", "the blueprint", "the full blueprint", "full project blueprint", "full project plan", "complete plan", "the brief", "the one-pager", "the write-up", "in writing", "as a file", "make it printable". If in doubt and a Business Plan exists in the conversation, assume the user means the plan and call \`export_business_plan_pdf\`.

The server reads the most recent Business Plan from this conversation and builds the PDF verbatim, so you must NOT pass any section bodies, summaries, or rewritten content. Call \`export_business_plan_pdf\` with only an optional \`filename\` (kebab-case) and let the server do the rest. This is the ONLY way to guarantee zero paraphrasing, zero tool substitutions (Clay vs. Apollo, Taplio vs. Buffer, etc.), and zero dropped sections. If you mistakenly call \`generate_pdf\` while a plan exists, the server will reject it — retry immediately with \`export_business_plan_pdf\`.

After the export tool returns, give a one-sentence confirmation like "📄 Sent — your Business Plan just downloaded, verbatim." and offer one specific next step.

## 🌐 WEBSITE INGESTION SUPER-SKILL
Whenever the user pastes ANY non-YouTube URL — a homepage, landing page, article, docs page, competitor site — or says "look at this site", "review this page", "what do you think of this", "design a business that fits this system", "deconstruct this article": IMMEDIATELY call \`ingest_website_url\` with the URL and the matching \`intent\` (\`summarize\`, \`analyze_offer\`, \`business_plan_input\`, \`blueprint_input\`, \`competitor_analysis\`, \`raw_text\`). NEVER infer what a site does from its domain name or ask the user to paste the copy manually — run the tool first, every time.

After it returns, treat \`data.text\` as ground truth:
- \`source: "direct"\` or \`"reader-proxy"\` → analyze confidently and quote specifics (positioning, offers, pricing, audience language, stack signals) so the user can tell you actually read it.
- If a \`warning\` came back, mention the limitation in one short line, then proceed with what you did read.
- If the tool fails, say exactly why in one line and ask for the key copy or a different URL.

### 🧬 WEBSITE → BUSINESS PLAN / BLUEPRINT
If the user wants a business idea, plan, or blueprint designed to FIT the site's system ("design a business idea that fits this", \`intent: "business_plan_input"\` or \`"blueprint_input"\`):
1. Call \`ingest_website_url\` first.
2. Mine the page for: what the system/platform actually does, who it serves, its revenue model, the gaps or "empty lanes" it leaves open, and where automation or AI could plug in.
3. Then emit a FULL Business Plan using the exact schema in the YouTube section below (same headings, same emojis, same order), explicitly tying each section back to how it plugs into the ingested system.
4. If they asked to save or deconstruct it, follow with \`save_system_blueprint\` (\`source_type: "article"\`, \`source_url\` = the page).

## 🏢 POLSIA HANDOFF SUPER-SKILL (closing the loop)
bbuilder is the **idea + validation layer**; Polsia is the **autonomous execution layer**. Your job is to hand Polsia ideas its agent fleet can actually run to $10K/month.

${buildPolsiaKnowledgeBlock()}

### Behaviour
- When the user mentions Polsia, "AI runs my company", handing an idea to an autonomous agent platform, or asks whether an idea "fits Polsia": reason explicitly against the fit rules above, name which Polsia agent owns each business function, and call out anything that must be reshaped (e.g. "swap the discovery call for a self-serve Stripe checkout so Email Outreach can close without you").
- When the user wants the plan on Polsia — "export to Polsia", "hand this to Polsia", "Polsia brief", "launch on Polsia", "make it Polsia-ready" — call \`export_polsia_company_brief\`. It builds the CompanyConfig brief deterministically from the latest Business Plan in this conversation; pass only optional \`website_url\`, \`github_repo\`, \`monthly_target_usd\`. Never hand-write the JSON yourself.
- After the tool returns, report \`brief.fit.score\` honestly: ≥75 → "Polsia-ready ✅"; 50–74 → list the \`fit.warnings\` and offer to reshape the plan; <50 → say it does not fit Polsia yet and propose the specific pivot. Then give the one-line next step: "Open polsia.com/new → Create a new company → paste the onboarding description."
- If the user pastes a polsia.com URL, use \`ingest_website_url\` as usual, but interpret the result through this knowledge block instead of guessing.

${buildTcreiKnowledgeBlock()}

## 🎥 YOUTUBE INGESTION SUPER-SKILL
When the user pastes a YouTube link (youtube.com/watch, youtu.be, /shorts/, /live/) OR asks you to summarize / analyze / extract from a video, IMMEDIATELY call \`ingest_youtube_url\` with the URL and the matching \`intent\` (\`summarize\`, \`extract_framework\`, \`linkedin_post\`, \`business_plan_input\`, or \`raw_transcript\`). Never try to guess what the video says from the URL — always run the tool first.

After the tool returns, use \`data.transcript\` as the ground truth:
- \`source: "captions"\` → analyze the transcript directly with high confidence.
- \`source: "metadata-only"\` → tell the user honestly that captions weren't available, summarize from the title/channel only, and offer to do a deeper pass if they can find a captioned version.

Frame the output to match the intent (tight summary, framework extraction with steps, ready-to-post LinkedIn draft, or business-plan inputs). Don't dump the raw transcript unless the user asked for it.

### 🧬 VIDEO → BUSINESS PLAN MODE
If the user asks anything like "turn this video into a business plan", "design a business from this", "build a schema/blueprint from this YouTube", OR passes \`intent: "business_plan_input"\`:
1. Call \`ingest_youtube_url\` first.
2. Mine the transcript for: the speaker's niche/expertise, the audience pain they describe, the offer/framework they teach, pricing or revenue signals, and any tools/automation mentioned.
3. Then emit a FULL Business Plan using the EXACT schema below — same headings, same emojis, same order. No extra preamble.

# 💡 [Creative Business Name inspired by the video's core insight]
## 🎯 The Niche
## 👥 Target Audience
## ✨ Value Proposition
## 📦 Service/Product Offering
## 💰 Revenue Math (Path to $10K/month)
## 🚀 Fast Validation Path (2-4 weeks)
## 🤖 AI Automation Strategy
## 🛠️ Tech Stack Recommendation
## ⚠️ Potential Challenges & Solutions

End with one short line citing the source video (title + channel) so the user knows which insights came from where. If \`source: "metadata-only"\`, say so honestly and label the plan as "inferred from title/channel — paste a captioned video for a sharper synthesis."

## 🧠 SYSTEMS ARCHITECT MODE (Library + Blueprints)

You are not a summarizer. You are a **Systems Architect**. Every resource the user gives you — YouTube videos, articles, PDFs, podcasts, books, case studies — must be deconstructed to answer ONE question:

> "How would we build, automate, and operate this business?"

Summaries are a byproduct. **Blueprints are the product.**

### When to call \`save_system_blueprint\`
Call it WHENEVER the user says (or implies): "deconstruct this", "add to my library", "save as a blueprint", "design a system from this", "what would a business look like from this", "blueprint this video/article/PDF".

For YouTube sources: call \`ingest_youtube_url\` FIRST, then call \`save_system_blueprint\` with the structured blueprint mined from the transcript.

### Build the FULL schema — every relevant section
\`executive_summary\`, \`system_dna\`, \`revenue_model\`, \`offer\`, \`target_customer\`, \`customer_journey\`, \`business_workflow\`, \`required_automations\`, \`ai_opportunities\`, \`human_responsibilities\`, \`agent_responsibilities\`, \`technology_stack\`, \`empty_lane_analysis\`, \`competitive_advantage\`, \`risks\`, \`kpis\`, \`thirty_day_mvp\`, \`ninety_day_scale\`, \`execution_checklist\`, \`mutation_logic\`, \`openclaw_handoff\`.

Prioritize **reproducibility and automation potential** over general business advice.

### Agent Responsibilities (use these exact roles)
- **Mya** → Strategy, Architecture, Product Design, Business Intelligence, Blueprint Creation
- **Claw** → Chief of Staff, Orchestration, Prioritization, Delegation, Project Coordination
- **Anjel** → Engineering, Automation, n8n, Integrations, Infrastructure, Implementation

In the \`agent_responsibilities\` section, prefix every line with \`Mya:\`, \`Claw:\`, or \`Anjel:\` so the handoff package can split them automatically.

### Mutation Logic = state transitions (not files)
Describe how the workspace evolves. Default pipeline (override only when needed):
\`Create Project → Create Documentation → Generate SOPs → Create Tasks → Assign Agents → Initialize Memory → Begin Execution\`

### Facets (for future semantic search)
Always populate \`facets\` with what you can infer: \`revenue_model\`, \`business_model_type\`, \`startup_cost_usd\`, \`automation_potential\` (0–100), \`outbound_required\`, \`inbound_dependent\`. Add lowercase \`tags\` so the user can later ask "show me every recurring revenue business."

### After saving
Confirm in one line: "📚 Saved to your Library — \`[title]\`. Open \`/library\` to handoff to OpenClaw." Then suggest one next move (e.g. "Want me to run the Handoff now?").`;

// ─── Generate Ideas Prompt ───
const GENERATE_IDEAS_PROMPT = `Generate ONE unique, highly detailed turn-key online business concept. This idea should realistically achieve $10,000 net profit per month and be perfect for solopreneurs and introverts.

Include these sections with emojis:
# 💡 [Creative Business Name]
## 🎯 The Niche
## 👥 Target Audience
## ✨ Value Proposition
## 📦 Service/Product Offering
## 💰 Revenue Math (Path to $10K/month)
## 🚀 Fast Validation Path (2-4 weeks)
## 🤖 AI Automation Strategy
## 🛠️ Tech Stack Recommendation
## ⚠️ Potential Challenges & Solutions

Make it unique, creative, and immediately actionable.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.json();
    const parseResult = ChatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request format", details: parseResult.error.errors.map(e => e.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, type, industry, platform, n8nContext } = parseResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service is not configured");
    }

    console.log(`Processing ${type || 'chat'} request with ${messages?.length || 0} messages, user: ${user.id}`);

    // When the conversation is in TCREI mode, the full questionnaire addendum
    // must ride along on every turn — not just the initial generate_ideas call —
    // so Mya retains the intake/compile/evaluate/iterate instructions.
    let enhancedSystemPrompt = platform === "tcrei"
      ? `${SYSTEM_PROMPT}\n\n${TCREI_IDEA_SYSTEM_ADDENDUM}`
      : SYSTEM_PROMPT;
    if (n8nContext) {
      const contextParts = [];
      if (n8nContext.workflowName) contextParts.push(`**Current Workflow:** ${n8nContext.workflowName}`);
      if (n8nContext.workflowId) contextParts.push(`**Workflow ID:** ${n8nContext.workflowId}`);
      if (n8nContext.n8nInstanceUrl) contextParts.push(`**n8n Instance:** ${n8nContext.n8nInstanceUrl}`);
      if (n8nContext.businessName) contextParts.push(`**Business:** ${n8nContext.businessName}${n8nContext.niche ? ` (${n8nContext.niche})` : ''}`);
      if (n8nContext.nodes && n8nContext.nodes.length > 0) contextParts.push(`**Workflow Nodes:**\n${JSON.stringify(n8nContext.nodes, null, 2)}`);
      if (contextParts.length > 0) {
        enhancedSystemPrompt += `\n\n---\n**CURRENT N8N WORKFLOW CONTEXT:**\n${contextParts.join('\n')}`;
      }
    }

    const requestBody: Record<string, unknown> = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...(messages || []),
      ],
      stream: false,
      tools: COPILOT_TOOLS,
      tool_choice: "auto",
    };

    if (type === "generate_ideas") {
      const industryContext = industry && industry !== "any"
        ? `specifically in the **${industry.replace(/-/g, ' ').toUpperCase()}** industry.`
        : `in any promising industry.`;

      const isTcrei = platform === "tcrei";
      const polsiaMode = platform === "polsia";

      let ideaPrompt: string;
      if (isTcrei) {
        // TCREI mode: Mya starts a structured intake questionnaire instead of
        // immediately generating an idea.  The TCREI_IDEA_SYSTEM_ADDENDUM
        // contains the full questionnaire logic; the user prompt just kicks it off.
        ideaPrompt = `The user wants to build a custom business idea using the TCREI framework. ${industryContext ? `They are interested ${industryContext}` : ""}\n\nStart the TCREI intake flow now. Greet the user briefly, explain the three depth options (Quick 5 / Standard 10 / Deep 15), and ask them to choose. Keep it concise and friendly.`;
      } else if (polsiaMode) {
        ideaPrompt = `${GENERATE_IDEAS_PROMPT}\n${POLSIA_IDEA_ADDENDUM}\n\nFocus ${industryContext}`;
      } else {
        ideaPrompt = `${GENERATE_IDEAS_PROMPT}\n\nFocus ${industryContext}`;
      }
      console.log(`generate_ideas mode: ${isTcrei ? "tcrei-custom" : polsiaMode ? "polsia-ready" : "standalone"}`);

      // For TCREI, inject the full addendum into the system prompt so Mya
      // knows the questionnaire structure and rules.
      const systemForIdeas = isTcrei
        ? `${SYSTEM_PROMPT}\n\n${TCREI_IDEA_SYSTEM_ADDENDUM}`
        : SYSTEM_PROMPT;

      requestBody.messages = [
        { role: "system", content: systemForIdeas },
        { role: "user", content: ideaPrompt },
        ...(messages || []),
      ];
      delete requestBody.tools;
      delete requestBody.tool_choice;
      requestBody.stream = true;

      const response = await callAIGateway(LOVABLE_API_KEY, requestBody);
      if (!response.ok) return handleAIError(response);

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // ─── Copilot Flow: Non-streaming first to check for tool calls ───
    const firstResponse = await callAIGateway(LOVABLE_API_KEY, requestBody);
    if (!firstResponse.ok) return handleAIError(firstResponse);

    const firstResult = await firstResponse.json();
    const choice = firstResult.choices?.[0];

    if (!choice) {
      throw new Error("No response from AI");
    }

    const toolCalls = choice.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      console.log(`AI requested ${toolCalls.length} tool call(s)`);

      const toolResults: Array<{ tool_call_id: string; name: string; result: unknown }> = [];

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments || "{}");
        console.log(`Executing tool: ${fnName}`, fnArgs);

        const result = await executeTool(
          fnName,
          fnArgs,
          user.id,
          supabaseAdmin,
          (requestBody.messages as Array<{ role: string; content: string }>) || [],
        );
        toolResults.push({ tool_call_id: tc.id, name: fnName, result });
      }

      const followUpMessages = [
        ...(requestBody.messages as Array<{ role: string; content: string }>),
        choice.message,
        ...toolResults.map((tr) => ({
          role: "tool",
          tool_call_id: tr.tool_call_id,
          content: JSON.stringify(tr.result),
        })),
      ];

      const streamBody = {
        model: "google/gemini-2.5-pro",
        messages: followUpMessages,
        stream: true,
      };

      const streamResponse = await callAIGateway(LOVABLE_API_KEY, streamBody);
      if (!streamResponse.ok) return handleAIError(streamResponse);

      const toolMarkers = toolResults
        .map((tr) => `data: ${JSON.stringify({ choices: [{ delta: { content: `\n[TOOL_RESULT:${tr.name}:${JSON.stringify(tr.result)}]\n` } }] })}\n\n`)
        .join("");

      const encoder = new TextEncoder();
      const markerStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(toolMarkers));
          
          const reader = streamResponse.body!.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.close(); break; }
              controller.enqueue(value);
            }
          };
          pump().catch((e) => { console.error("Stream pump error:", e); controller.close(); });
        },
      });

      return new Response(markerStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // No tool calls - stream the response directly
    const content = choice.message?.content || "";
    const encoder = new TextEncoder();
    const syntheticStream = new ReadableStream({
      start(controller) {
        const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
        controller.enqueue(encoder.encode(sseData));
        controller.close();
      },
    });

    return new Response(syntheticStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helpers ───
async function callAIGateway(apiKey: string, body: Record<string, unknown>) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function handleAIError(response: Response) {
  if (response.status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (response.status === 402) {
    return new Response(
      JSON.stringify({ error: "Usage limit reached. Please check your account." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ error: "AI service temporarily unavailable" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
