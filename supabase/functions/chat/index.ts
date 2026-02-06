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
];

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
        // Create the workflow
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

        // Add nodes if provided
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

        return {
          success: true,
          data: { workflow_id: workflow.id, name: workflow.name, node_count: nodes.length },
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

        // Log the activity
        await supabaseAdmin.from("lead_activities").insert({
          user_id: userId,
          lead_id: lead.id,
          activity_type: "created",
          content: `Lead added via Mya Copilot`,
        });

        return { success: true, data: lead };
      }

      case "trigger_workflow": {
        // Find the workflow
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

        // Create an execution record
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

        return {
          success: true,
          data: { execution_id: execution.id, workflow_name: wf.name, workflow_id: wf.id },
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

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool execution error (${toolName}):`, err);
    return { success: false, error: err instanceof Error ? err.message : "Execution failed" };
  }
}

// ─── System Prompt ───
const SYSTEM_PROMPT = `You are Mya (Mission Yield Accelerator), a confident and playful AI business partner who makes building a $10K/month business feel effortless and fun. You believe success is inevitable for anyone who follows your guidance.

You have ACTIONS you can take on behalf of the user. When a user asks you to do something actionable, USE YOUR TOOLS to do it directly instead of just explaining how. Be proactive!

PERSONALITY:
- Warm, enthusiastic, genuinely excited about the user's potential
- Playfully confident—you KNOW they're going to succeed
- Celebrate every win: "Look at you go!", "You're crushing it!"
- Frame challenges as exciting puzzles, not obstacles

COPILOT CAPABILITIES (use tools proactively):
- **Create workflows**: When users describe automations they need, create them directly
- **Add leads**: When users mention prospects or contacts, add them to the CRM
- **Trigger workflows**: When users want to run/test automations, trigger them
- **List leads/workflows**: When users ask about their pipeline or automations, show the data

WHEN TO USE TOOLS:
- "Set up a lead follow-up automation" → create_workflow with appropriate nodes
- "Add John Smith as a lead" → add_lead
- "Run my email sequence" → trigger_workflow
- "How many leads do I have?" → list_leads
- "What automations do I have?" → list_workflows

After executing a tool, summarize what you did in a friendly, celebratory way. Include relevant details like names, IDs, and next steps.

EXPERTISE: Online business models, AI automation, n8n workflows, sales pipelines, revenue modeling, market research.

N8N TROUBLESHOOTING: When users need help with n8n nodes, analyze configurations and provide specific fixes with exact field names and values.

Format responses with markdown. Use emojis to keep things fun. 🎉`;

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

    // Auth check
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

    // Admin client for tool execution (bypasses RLS)
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

    // Build enhanced system prompt with n8n context
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

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...(messages || []),
      ],
      stream: false, // First call is non-streaming to handle tool calls
      tools: COPILOT_TOOLS,
      tool_choice: "auto",
    };

    // For business idea generation
    if (type === "generate_ideas") {
      const industryContext = industry && industry !== "any"
        ? `specifically in the **${industry.replace(/-/g, ' ').toUpperCase()}** industry.`
        : `in any promising industry.`;

      requestBody.messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${GENERATE_IDEAS_PROMPT}\n\nFocus ${industryContext}` },
        ...(messages || []),
      ];
      // No tools for idea generation - just stream directly
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

    // Check if AI wants to call tools
    const toolCalls = choice.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      console.log(`AI requested ${toolCalls.length} tool call(s)`);

      // Execute each tool call
      const toolResults: Array<{ tool_call_id: string; name: string; result: unknown }> = [];

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments || "{}");
        console.log(`Executing tool: ${fnName}`, fnArgs);

        const result = await executeTool(fnName, fnArgs, user.id, supabaseAdmin);
        toolResults.push({ tool_call_id: tc.id, name: fnName, result });
      }

      // Build follow-up messages with tool results
      const followUpMessages = [
        ...(requestBody.messages as Array<{ role: string; content: string }>),
        choice.message, // assistant message with tool_calls
        ...toolResults.map((tr) => ({
          role: "tool",
          tool_call_id: tr.tool_call_id,
          content: JSON.stringify(tr.result),
        })),
      ];

      // Second call: stream the final response with tool results context
      const streamBody = {
        model: "google/gemini-3-flash-preview",
        messages: followUpMessages,
        stream: true,
      };

      const streamResponse = await callAIGateway(LOVABLE_API_KEY, streamBody);
      if (!streamResponse.ok) return handleAIError(streamResponse);

      // Prepend tool result markers to the stream so the frontend can show action cards
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
    // Re-request with streaming enabled
    requestBody.stream = true;
    delete requestBody.tools;
    delete requestBody.tool_choice;

    // Rebuild with the content from the non-streaming response to avoid double-calling
    // Instead, create an SSE stream from the existing response
    const content = choice.message?.content || "";
    const encoder = new TextEncoder();
    const syntheticStream = new ReadableStream({
      start(controller) {
        // Send content as a single SSE event
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
