import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Build a workflow that covers the business's key automation needs using HTTP requests to external APIs. After the JSON block, briefly explain what each node does.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { businessIdeaId, regenerate } = await req.json();

    if (!businessIdeaId) {
      return new Response(
        JSON.stringify({ error: "Missing businessIdeaId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating n8n workflow for business idea: ${businessIdeaId}, regenerate: ${regenerate}`);

    // Check for existing n8n prompt
    const { data: existingPrompt } = await supabaseClient
      .from("ai_prompts")
      .select("*")
      .eq("business_idea_id", businessIdeaId)
      .eq("prompt_type", "n8n_workflow")
      .single();

    if (existingPrompt && !regenerate) {
      console.log("Found existing n8n workflow prompt");
      return new Response(
        JSON.stringify({ prompt: existingPrompt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If regenerating, delete the old prompt first
    if (existingPrompt && regenerate) {
      console.log("Deleting existing prompt for regeneration");
      const { error: deleteError } = await supabaseClient
        .from("ai_prompts")
        .delete()
        .eq("id", existingPrompt.id);
      
      if (deleteError) {
        console.error("Failed to delete existing prompt:", deleteError);
      }
    }

    // Fetch the business idea
    const { data: businessIdea, error: ideaError } = await supabaseClient
      .from("business_ideas")
      .select("*")
      .eq("id", businessIdeaId)
      .single();

    if (ideaError || !businessIdea) {
      return new Response(
        JSON.stringify({ error: "Business idea not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from business idea
    const ideaContext = `
# Business Idea: ${businessIdea.business_name}

## Niche
${businessIdea.niche}

## Target Audience
${businessIdea.target_audience}

## Value Proposition
${businessIdea.value_proposition}

## Service Offering
${businessIdea.service_offering}

## Revenue Math
${businessIdea.revenue_math}

## Validation Path
${businessIdea.validation_path}

## Current AI Automation Strategy
${typeof businessIdea.ai_automation_strategy === 'object' 
  ? JSON.stringify(businessIdea.ai_automation_strategy, null, 2) 
  : businessIdea.ai_automation_strategy}
`;

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
            content: `Create a comprehensive n8n workflow automation for this business:\n\n${ideaContext}\n\nProvide a complete, ready-to-use n8n workflow that automates the key sales and client management processes for this specific business. Include specific node configurations, webhook endpoints, and integration details.`
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

    console.log("Generated n8n workflow prompt, saving to database...");

    // Save the prompt to the database
    const { data: savedPrompt, error: saveError } = await supabaseClient
      .from("ai_prompts")
      .insert({
        business_idea_id: businessIdeaId,
        user_id: user.id,
        prompt_type: "n8n_workflow",
        prompt_content: generatedContent,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving prompt:", saveError);
      // Still return the content even if saving fails
      return new Response(
        JSON.stringify({ 
          prompt: { 
            prompt_content: generatedContent,
            prompt_type: "n8n_workflow",
            business_idea_id: businessIdeaId
          },
          saved: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ prompt: savedPrompt, saved: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate n8n workflow error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
