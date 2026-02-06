import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──────────────────────────────────────────────────────
interface WorkflowNode {
  id: string;
  workflow_id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  ai_prompt?: string | null;
  ai_model?: string | null;
}

interface WorkflowEdge {
  source_node_id: string;
  target_node_id: string;
}

// ── Topological Sort (Kahn's algorithm) ────────────────────────
function topoSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source_node_id)?.push(e.target_node_id);
    inDegree.set(e.target_node_id, (inDegree.get(e.target_node_id) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
  const sorted: string[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    sorted.push(cur);
    for (const next of adj.get(cur) ?? []) {
      const d = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  if (sorted.length !== nodes.length) throw new Error("Cycle detected in workflow");
  return sorted;
}

// ── Built-in tools for AI Agent tool-calling ──────────────────
function getBuiltInTools() {
  return [
    {
      type: "function" as const,
      function: {
        name: "http_request",
        description: "Make an HTTP request to an external API. Use this to fetch data, call webhooks, or interact with services.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL to request" },
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method" },
            body: { type: "object", description: "Request body for POST/PUT/PATCH" },
            headers: { type: "object", description: "Additional headers" },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "run_code",
        description: "Execute a JavaScript code snippet to transform, calculate, or process data. The code should return a value.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "JavaScript code to execute. Use 'return ...' to return data." },
          },
          required: ["code"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "search_data",
        description: "Search and filter an array of objects by a field value.",
        parameters: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" }, description: "Array to search" },
            field: { type: "string", description: "Field name to match" },
            value: { type: "string", description: "Value to match" },
          },
          required: ["data", "field", "value"],
          additionalProperties: false,
        },
      },
    },
  ];
}

// ── Execute a tool call made by the AI ────────────────────────
async function executeToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "http_request": {
      const url = args.url as string;
      const method = ((args.method as string) || "GET").toUpperCase();
      const headers = (args.headers as Record<string, string>) ?? {};
      const fetchOpts: RequestInit = { method, headers };
      if (["POST", "PUT", "PATCH"].includes(method) && args.body) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        fetchOpts.body = JSON.stringify(args.body);
      }
      const resp = await fetch(url, fetchOpts);
      const text = await resp.text();
      try { return JSON.parse(text); } catch { return { status: resp.status, body: text }; }
    }
    case "run_code": {
      const code = (args.code as string) || "return null;";
      try {
        const fn = new Function("input", code);
        return fn(null);
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
    case "search_data": {
      const data = (args.data as Record<string, unknown>[]) ?? [];
      const field = args.field as string;
      const value = args.value as string;
      return data.filter((item) => String(item[field]) === value);
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── AI Agent with Tool Calling & Multi-Turn Reasoning ─────────
async function executeAIAgent(
  node: WorkflowNode,
  input: unknown
): Promise<unknown> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const model = (node.ai_model as string) || "google/gemini-3-flash-preview";
  const systemPrompt = (node.ai_prompt as string) || "You are a helpful AI assistant.";
  const cfg = node.config ?? {};
  const temperature = (cfg.temperature as number) ?? 0.7;
  const enableToolCalling = cfg.tool_calling_enabled === true;
  const maxIterations = Math.min((cfg.max_iterations as number) || 3, 10);
  const outputSchema = cfg.output_schema as string | undefined;

  // Build messages
  const messages: Array<{ role: string; content: string; tool_call_id?: string }> = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: typeof input === "string" ? input : JSON.stringify(input, null, 2),
    },
  ];

  // Build request body
  const buildBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
    };

    // Add tools if enabled
    if (enableToolCalling) {
      body.tools = getBuiltInTools();
      body.tool_choice = "auto";
    }

    // Add structured output via tool if schema defined
    if (outputSchema) {
      try {
        const schema = JSON.parse(outputSchema);
        const outputTool = {
          type: "function",
          function: {
            name: "structured_output",
            description: "Return the final structured result in the required format.",
            parameters: schema,
          },
        };
        body.tools = [...(body.tools as unknown[] || []), outputTool];
        if (!enableToolCalling) {
          body.tool_choice = { type: "function", function: { name: "structured_output" } };
        }
      } catch {
        // Invalid schema, skip structured output
      }
    }

    return body;
  };

  // Multi-turn reasoning loop
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildBody()),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${t}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) throw new Error("No response from AI model");

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Add assistant message with tool calls
      messages.push(message);

      // Execute each tool call and add results
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch { /* empty args */ }

        // If it's the structured_output tool, return the parsed args directly
        if (fnName === "structured_output") {
          return fnArgs;
        }

        const result = await executeToolCall(fnName, fnArgs);
        messages.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
      // Continue the loop for the next reasoning iteration
      continue;
    }

    // No tool calls — return the final content
    const content = message.content;
    try { return JSON.parse(content); } catch { return content; }
  }

  // Max iterations reached — return last message
  const lastMsg = messages[messages.length - 1];
  return lastMsg?.content || "Max reasoning iterations reached";
}

// ── Other Node Executors (unchanged) ──────────────────────────

async function executeHttpRequest(node: WorkflowNode, input: unknown): Promise<unknown> {
  const cfg = node.config ?? {};
  let url = (cfg.url as string) || "";
  const method = ((cfg.method as string) || "GET").toUpperCase();
  const headers = (cfg.headers as Record<string, string>) ?? {};
  if (!url) throw new Error("HTTP Request node has no URL configured");
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      url = url.replace(`{{${k}}}`, String(v));
    }
  }
  const fetchOpts: RequestInit = { method, headers };
  if (["POST", "PUT", "PATCH"].includes(method)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    fetchOpts.body = JSON.stringify(input);
  }
  const resp = await fetch(url, fetchOpts);
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { status: resp.status, body: text }; }
}

function executeFilter(node: WorkflowNode, input: unknown): { passed: boolean; data: unknown } {
  const cfg = node.config ?? {};
  const condition = (cfg.condition as string) || "";
  const operator = (cfg.operator as string) || "equals";
  const value = cfg.value;
  if (!condition || input == null || typeof input !== "object") return { passed: true, data: input };
  const actual = (input as Record<string, unknown>)[condition];
  let passed = false;
  switch (operator) {
    case "equals": passed = actual == value; break;
    case "not_equals": passed = actual != value; break;
    case "greater_than": passed = Number(actual) > Number(value); break;
    case "less_than": passed = Number(actual) < Number(value); break;
    case "contains": passed = String(actual).includes(String(value)); break;
    case "exists": passed = actual !== undefined && actual !== null; break;
    default: passed = true;
  }
  return { passed, data: input };
}

function executeCode(node: WorkflowNode, input: unknown): unknown {
  const code = (node.config?.code as string) || "return input;";
  try {
    const fn = new Function("input", code);
    return fn(input);
  } catch (e) {
    throw new Error(`Code execution error: ${(e as Error).message}`);
  }
}

function executeTransform(node: WorkflowNode, input: unknown): unknown {
  const mappings = (node.config?.mappings as Array<{ from: string; to: string }>) ?? [];
  if (!mappings.length || !input || typeof input !== "object") return input;
  const result: Record<string, unknown> = {};
  const src = input as Record<string, unknown>;
  for (const m of mappings) result[m.to] = src[m.from];
  return result;
}

async function executeDelay(node: WorkflowNode, input: unknown): Promise<unknown> {
  const seconds = (node.config?.seconds as number) ?? 5;
  const capped = Math.min(seconds, 30);
  await new Promise((r) => setTimeout(r, capped * 1000));
  return input;
}

async function executeEmailSend(node: WorkflowNode, input: unknown): Promise<unknown> {
  const cfg = node.config ?? {};
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  let to = (cfg.to as string) || "";
  let subject = (cfg.subject as string) || "";
  let body = (cfg.body as string) || "";
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      to = to.replace(`{{${k}}}`, String(v));
      subject = subject.replace(`{{${k}}}`, String(v));
      body = body.replace(`{{${k}}}`, String(v));
    }
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Mya <onboarding@resend.dev>", to: [to], subject, html: body }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Email send failed: ${JSON.stringify(data)}`);
  return data;
}

// ── Main Handler ───────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workflow_id, trigger_data } = await req.json();
    if (!workflow_id) throw new Error("workflow_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: wf, error: wfErr } = await supabase
      .from("workflows").select("*").eq("id", workflow_id).single();
    if (wfErr || !wf) throw new Error("Workflow not found");

    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("workflow_nodes").select("*").eq("workflow_id", workflow_id),
      supabase.from("workflow_edges").select("*").eq("workflow_id", workflow_id),
    ]);
    const nodes: WorkflowNode[] = nodesRes.data ?? [];
    const edges: WorkflowEdge[] = edgesRes.data ?? [];
    if (!nodes.length) throw new Error("Workflow has no nodes");

    const { data: execution, error: execErr } = await supabase
      .from("workflow_executions")
      .insert({ workflow_id, user_id: wf.user_id, status: "running", trigger_data: trigger_data ?? null })
      .select().single();
    if (execErr || !execution) throw new Error("Failed to create execution");

    const executionId = execution.id;
    const logInserts = nodes.map((n) => ({ execution_id: executionId, node_id: n.id, status: "pending" }));
    await supabase.from("workflow_execution_logs").insert(logInserts);

    const sortedIds = topoSort(nodes, edges);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const parentMap = new Map<string, string[]>();
    for (const e of edges) {
      const parents = parentMap.get(e.target_node_id) ?? [];
      parents.push(e.source_node_id);
      parentMap.set(e.target_node_id, parents);
    }

    const outputs = new Map<string, unknown>();
    let workflowFailed = false;

    for (const nodeId of sortedIds) {
      if (workflowFailed) break;
      const node = nodeMap.get(nodeId)!;

      const parents = parentMap.get(nodeId) ?? [];
      let input: unknown;
      if (parents.length === 0) input = trigger_data ?? {};
      else if (parents.length === 1) input = outputs.get(parents[0]);
      else {
        const merged: Record<string, unknown> = {};
        for (const pid of parents) {
          const pOut = outputs.get(pid);
          if (pOut && typeof pOut === "object") Object.assign(merged, pOut);
        }
        input = merged;
      }

      await supabase.from("workflow_execution_logs")
        .update({ status: "running", started_at: new Date().toISOString(), input_data: input as any })
        .eq("execution_id", executionId).eq("node_id", nodeId);

      try {
        let output: unknown;
        switch (node.type) {
          case "webhook_trigger":
          case "schedule_trigger":
            output = input;
            break;
          case "ai_agent":
            output = await executeAIAgent(node, input);
            break;
          case "http_request":
            output = await executeHttpRequest(node, input);
            break;
          case "filter": {
            const filterResult = executeFilter(node, input);
            if (!filterResult.passed) {
              output = { _filtered: true, ...((typeof input === 'object' && input) ? input as object : {}) };
              await supabase.from("workflow_execution_logs")
                .update({ status: "skipped", output_data: output as any, completed_at: new Date().toISOString() })
                .eq("execution_id", executionId).eq("node_id", nodeId);
              outputs.set(nodeId, output);
              continue;
            }
            output = filterResult.data;
            break;
          }
          case "code":
            output = executeCode(node, input);
            break;
          case "transform":
            output = executeTransform(node, input);
            break;
          case "delay":
            output = await executeDelay(node, input);
            break;
          case "email_send":
            output = await executeEmailSend(node, input);
            break;
          default:
            output = input;
        }
        outputs.set(nodeId, output);
        await supabase.from("workflow_execution_logs")
          .update({ status: "completed", output_data: output as any, completed_at: new Date().toISOString() })
          .eq("execution_id", executionId).eq("node_id", nodeId);
      } catch (err) {
        workflowFailed = true;
        const errorMsg = err instanceof Error ? err.message : String(err);
        await supabase.from("workflow_execution_logs")
          .update({ status: "failed", error: errorMsg, completed_at: new Date().toISOString() })
          .eq("execution_id", executionId).eq("node_id", nodeId);
      }
    }

    await supabase.from("workflow_executions")
      .update({ status: workflowFailed ? "failed" : "completed", completed_at: new Date().toISOString() })
      .eq("id", executionId);

    const finalOutputs: Record<string, unknown> = {};
    for (const [k, v] of outputs) finalOutputs[k] = v;

    return new Response(
      JSON.stringify({ execution_id: executionId, status: workflowFailed ? "failed" : "completed", outputs: finalOutputs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("workflow-executor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
