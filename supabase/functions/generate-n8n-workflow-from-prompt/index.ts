import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_PROMPT = `You are an expert n8n workflow automation architect. Generate a COMPLETE, VALID n8n workflow JSON that can be directly imported into n8n via File → Import from File.

CRITICAL RULES - FOLLOW EXACTLY:
1. Output ONLY ONE JSON code block with a complete n8n workflow
2. Use ONLY these EXACT node types (DO NOT invent or modify type names):

TRIGGER NODES (use ONE to start):
- n8n-nodes-base.manualTrigger (typeVersion: 1, parameters: {})
- n8n-nodes-base.scheduleTrigger (typeVersion: 1.2)
- n8n-nodes-base.webhook (typeVersion: 2)

ACTION NODES:
- n8n-nodes-base.httpRequest (typeVersion: 4.2) - for API calls
- n8n-nodes-base.set (typeVersion: 3.4) - for data transformation
- n8n-nodes-base.if (typeVersion: 2.1) - for conditionals
- n8n-nodes-base.code (typeVersion: 2) - for custom JavaScript
- n8n-nodes-base.wait (typeVersion: 1.1) - for delays
- n8n-nodes-base.noOp (typeVersion: 1) - for placeholders

3. NEVER use non-existent types like "openAi", "stripeWebhook", "leadCapture", etc.
4. Keep parameters MINIMAL - only use basic parameters shown in template
5. Each node MUST have: id (uuid format), name, type, typeVersion, position [x,y], parameters

EXACT WORKING TEMPLATE - FOLLOW THIS STRUCTURE:
\`\`\`json
{
  "name": "Business Automation Workflow",
  "nodes": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Start",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {}
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Fetch Data",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [450, 300],
      "parameters": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Process Data",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [650, 300],
      "parameters": {
        "mode": "manual",
        "duplicateItem": false,
        "assignments": {
          "assignments": []
        }
      }
    },
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "name": "Send Notification",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [850, 300],
      "parameters": {
        "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        "method": "POST",
        "body": "json",
        "bodyParameters": {
          "parameters": [
            {"name": "text", "value": "Workflow completed!"}
          ]
        }
      }
    }
  ],
  "connections": {
    "Start": {
      "main": [[{"node": "Fetch Data", "type": "main", "index": 0}]]
    },
    "Fetch Data": {
      "main": [[{"node": "Process Data", "type": "main", "index": 0}]]
    },
    "Process Data": {
      "main": [[{"node": "Send Notification", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "active": false
}
\`\`\`

Build a workflow that covers the specific automation stage using HTTP requests to external APIs.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { workflowPrompt, stageName, businessName } = await req.json();

    if (!workflowPrompt) {
      return new Response(
        JSON.stringify({ error: "Missing workflowPrompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating n8n workflow JSON for stage: ${stageName}, user: ${user.id}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: N8N_PROMPT },
          { 
            role: "user", 
            content: `Create a complete n8n workflow JSON for the "${stageName}" automation stage${businessName ? ` for ${businessName}` : ''}.

Here are the requirements from the workflow prompt:

${workflowPrompt}

Generate a valid, importable n8n workflow JSON that implements this automation. Use only valid n8n node types as specified. Output only the JSON code block.`
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

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

      throw new Error("AI service error");
    }

    const aiResponse = await response.json();
    const generatedContent = aiResponse.choices?.[0]?.message?.content || "";

    console.log("Generated n8n workflow JSON successfully");

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate n8n workflow from prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
