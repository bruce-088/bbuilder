import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface BrowserAction {
  type: "navigate" | "wait" | "act" | "screenshot" | "extract";
  url?: string;
  selector?: string;
  instruction?: string;
  timeout?: number;
}

interface InterpretRequest {
  message: string;
  n8nInstanceUrl: string;
  n8nContext?: {
    workflowName?: string;
    workflowId?: string;
    nodes?: Array<{ name: string; type: string }>;
  };
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface InterpretResponse {
  actions: BrowserAction[];
  narration: string;
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InterpretRequest = await req.json();
    const { message, n8nInstanceUrl, n8nContext, conversationHistory } = body;

    if (!message || !n8nInstanceUrl) {
      return new Response(
        JSON.stringify({ error: "message and n8nInstanceUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are Mya's browser automation interpreter. Your job is to translate natural language instructions into structured Browserbase browser actions for controlling an n8n workflow automation instance.

The user's n8n instance is at: ${n8nInstanceUrl}
${n8nContext?.workflowName ? `Current workflow: "${n8nContext.workflowName}" (ID: ${n8nContext.workflowId})` : ""}
${n8nContext?.nodes?.length ? `Workflow nodes: ${n8nContext.nodes.map(n => `${n.name} (${n.type})`).join(", ")}` : ""}

You must respond with valid JSON only, no markdown. The JSON must have this structure:
{
  "actions": [
    { "type": "navigate", "url": "<full URL>" },
    { "type": "wait", "timeout": <ms> },
    { "type": "act", "instruction": "<what to click/type/interact with>" },
    { "type": "screenshot" },
    { "type": "extract", "instruction": "<what data to extract>" }
  ],
  "narration": "<what Mya says while executing, 1-2 sentences, friendly tone>",
  "summary": "<very brief 5-word summary of what this does>"
}

IMPORTANT RULES:
- Always start with a "navigate" action to the correct n8n URL
- Always end with a "screenshot" action so the user can see the result
- Use "act" with clear, specific instructions referencing n8n UI elements
- For n8n selectors, use descriptive text like "Click the 'Execute Workflow' button" or "Click on the 'HTTP Request' node"
- Add "wait" actions (1000-3000ms) after navigation and major interactions
- The n8n workflow editor is usually at: ${n8nInstanceUrl}/workflow/<id>
- The workflow list is at: ${n8nInstanceUrl}/home/workflows
- Keep actions focused and minimal (3-8 actions typically)
- If the user asks something you can't do via browser automation, set actions to empty array and explain in narration`;

    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Add recent conversation history for context (last 4 messages)
    if (conversationHistory?.length) {
      const recent = conversationHistory.slice(-4);
      for (const msg of recent) {
        messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      return new Response(
        JSON.stringify({ error: "AI interpretation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from the AI response
    let parsed: InterpretResponse;
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = {
        actions: [],
        narration: "I wasn't sure how to do that. Could you be more specific about what you'd like me to do in n8n?",
        summary: "Could not interpret",
      };
    }

    // Validate actions
    const validTypes = ["navigate", "wait", "act", "screenshot", "extract"];
    parsed.actions = (parsed.actions || []).filter(
      (a) => a && validTypes.includes(a.type)
    );

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cowork-interpret error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
