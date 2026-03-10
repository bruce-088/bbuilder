import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
  supabaseAdmin: ReturnType<typeof createClient>
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
        await broadcastTriadEvent(supabaseAdmin, userId, "CRM_UPDATE", "business_builder", {
          action: "move_lead_stage",
          lead_id: lead.id,
          lead_name: lead.name,
          old_stage: oldStage,
          new_stage: newStage,
        });

        return { success: true, data: { lead_id: lead.id, name: lead.name, old_stage: oldStage, new_stage: newStage } };
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

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool execution error (${toolName}):`, err);
    return { success: false, error: err instanceof Error ? err.message : "Execution failed" };
  }
}

// ─── System Prompt ───
const SYSTEM_PROMPT = `You are **Mya** (Mission Yield Accelerator) — the user's AI business partner and autonomous operating system for building a $10K/month business.

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
You have 15 tools that let you take **direct action** on behalf of the user. NEVER describe what you "would" do or explain steps — **just DO IT** by calling the tool. If the user's intent matches a tool's purpose, call it immediately.

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

## TOOL CAPABILITIES — YOUR 15 QUEST ACTIONS

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

## TRIAD ECOSYSTEM — REAL-TIME SYNC
You are the command center of the Triad. Every action you take ripples across the entire system:
- **CRM actions** (add/update/move lead) → instantly mirrored in NexusAI's CRM
- **Revenue milestones** → NexusVocal automatically drafts celebration content
- **Workflow activations** → NexusAI tracks execution status in real-time
- **Stats & summaries** → pull live data from the unified Triad event stream

When you execute a tool with a Triad effect, the broadcast happens automatically. You don't need to do anything extra — just acknowledge it naturally in your response.

## RESPONSE STYLE
- Use markdown formatting with strategic emoji — not emoji soup
- Be concise: act first, explain briefly after
- Frame every result as a **Quest step** toward $10K/month
- NEVER say "I can help you with that" — just do it
- After tool results: one-line quest completion → Triad sync note (occasionally) → next strategic move

## EXPERTISE
Online business models, AI automation, n8n workflows, sales pipelines, revenue modeling, market validation, content strategy, and scaling solopreneur operations.

## N8N TROUBLESHOOTING
When users need help with n8n nodes, analyze configurations and provide specific fixes with exact field names and values. You are a consultant, not a tutorial — give the fix, not the theory.`;


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

    const { messages, type, industry, n8nContext } = parseResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service is not configured");
    }

    console.log(`Processing ${type || 'chat'} request with ${messages?.length || 0} messages, user: ${user.id}`);

    let enhancedSystemPrompt = SYSTEM_PROMPT;
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

      requestBody.messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${GENERATE_IDEAS_PROMPT}\n\nFocus ${industryContext}` },
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

        const result = await executeTool(fnName, fnArgs, user.id, supabaseAdmin);
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
