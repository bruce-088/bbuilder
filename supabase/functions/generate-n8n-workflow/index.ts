import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_PROMPT = `You are an expert n8n workflow automation architect. Given a business idea, generate a COMPLETE, VALID n8n workflow JSON that can be directly imported into n8n.

CRITICAL: Your output must include a SINGLE JSON code block containing a valid n8n workflow with this EXACT structure:

\`\`\`json
{
  "name": "Workflow Name Here",
  "nodes": [
    {
      "id": "unique-uuid-here",
      "name": "Node Display Name",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {}
    }
  ],
  "connections": {
    "Source Node Name": {
      "main": [[{ "node": "Target Node Name", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "active": false
}
\`\`\`

VALID n8n node types to use:
- n8n-nodes-base.manualTrigger - Manual trigger to start workflow
- n8n-nodes-base.scheduleTrigger - Schedule-based trigger
- n8n-nodes-base.webhook - Webhook trigger
- n8n-nodes-base.httpRequest - Make HTTP/API requests
- n8n-nodes-base.gmail - Send/read Gmail emails
- n8n-nodes-base.slack - Send Slack messages
- n8n-nodes-base.if - Conditional branching
- n8n-nodes-base.switch - Multiple condition routing
- n8n-nodes-base.code - Custom JavaScript code
- n8n-nodes-base.set - Set/transform data
- n8n-nodes-base.merge - Merge data streams
- n8n-nodes-base.wait - Delay execution
- n8n-nodes-base.noOp - No operation placeholder
- @n8n/n8n-nodes-langchain.agent - AI Agent node
- @n8n/n8n-nodes-langchain.lmChatOpenAi - OpenAI Chat

Create a comprehensive workflow for the business that covers:
1. Lead capture/prospecting trigger
2. Data processing and enrichment
3. Outreach automation (email/messaging)
4. Follow-up sequences with delays
5. Notification/reporting

Output the complete workflow JSON first, then provide a brief explanation of each node's purpose.`;

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

    const { businessIdeaId } = await req.json();

    if (!businessIdeaId) {
      return new Response(
        JSON.stringify({ error: "Missing businessIdeaId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating n8n workflow for business idea: ${businessIdeaId}`);

    // Check for existing n8n prompt
    const { data: existingPrompt } = await supabaseClient
      .from("ai_prompts")
      .select("*")
      .eq("business_idea_id", businessIdeaId)
      .eq("prompt_type", "n8n_workflow")
      .single();

    if (existingPrompt) {
      console.log("Found existing n8n workflow prompt");
      return new Response(
        JSON.stringify({ prompt: existingPrompt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
