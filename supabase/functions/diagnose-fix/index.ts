import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      stepText,
      checkDescription,
      failureIndicators,
      successIndicators,
      automatedActions,
      stageTitle,
      businessContext,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert troubleshooter for n8n automation workflows and sales automation systems. A user has failed a verification step in their automation setup and needs help diagnosing and fixing it.

Your role is to:
1. Analyze the failure indicators and determine the most likely root cause
2. Provide specific, actionable fix instructions with exact UI paths
3. Generate a Director.ai-compatible prompt to automate the fix

Be extremely specific. Reference exact menu paths, button names, field labels, and URLs.
Format your response in clean markdown with clear sections.`;

    const userPrompt = `## CONTEXT
- Business: ${businessContext?.businessName || "User's Business"}
- Industry/Niche: ${businessContext?.niche || "Not specified"}
- Target Audience: ${businessContext?.targetAudience || "Not specified"}
- Stage: ${stageTitle}

## STEP BEING VERIFIED
${stepText}

## VERIFICATION DETAILS
**What we checked:** ${checkDescription}

**What would indicate success:**
${successIndicators?.map((s: string) => `✅ ${s}`).join('\n') || "Not specified"}

**What indicates failure:**
${failureIndicators?.map((f: string) => `❌ ${f}`).join('\n') || "Not specified"}

**Automated verification actions:**
${automatedActions?.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n') || "Not specified"}

## TASK
Analyze this failed verification and provide:

1. **🔍 Root Cause Analysis** - Explain the most likely reasons for failure (1-2 paragraphs)

2. **🔧 Fix Instructions** - Numbered list with SPECIFIC UI paths and actions. Be precise about:
   - Exact URLs to navigate to
   - Exact button/menu names to click
   - Exact field names and values to enter
   - Screenshots or visual cues to look for

3. **⚠️ Common Mistakes** - Bullet list of things that often cause this issue

4. **🤖 Director.ai Fix Prompt** - A structured automation prompt in a code block that Director.ai can execute to fix this issue automatically. Format it as step-by-step instructions with clear success criteria.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate diagnosis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("diagnose-fix error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
