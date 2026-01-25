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
      verificationData,
      stageTitle,
      businessContext,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert n8n automation auditor. Your job is to analyze a configuration step and provide a structured verification checklist that helps users confirm their setup is correct.

You will receive:
- A setup step description
- Success indicators (what a correct setup looks like)
- Failure indicators (signs of incorrect configuration)
- Business context

Generate a practical verification checklist that the user can work through to confirm the step was completed correctly. For each checklist item, assess the likelihood it was done correctly based on common mistakes.

IMPORTANT: Be helpful and actionable. Focus on what the user can actually verify in their n8n instance, API dashboards, or connected services.

Return your response as valid JSON with this exact structure:
{
  "status": "PASS" | "NEEDS_ATTENTION" | "MANUAL_CHECK_REQUIRED",
  "confidence": "high" | "medium" | "low",
  "summary": "Brief 1-2 sentence summary",
  "checklist": [
    { "item": "What to verify", "status": "check" | "warning" | "error", "howToVerify": "Specific steps to check this" }
  ],
  "suggestions": ["Actionable suggestion if issues found"],
  "commonMistakes": ["Common mistake to watch for"]
}`;

    const userPrompt = `## CONTEXT
- Business: ${businessContext?.businessName || "User's Business"}
- Industry/Niche: ${businessContext?.niche || "Not specified"}
- Target Audience: ${businessContext?.targetAudience || "Not specified"}
- Stage: ${stageTitle}

## STEP TO VERIFY
${stepText}

## VERIFICATION CRITERIA
**What indicates SUCCESS:**
${verificationData?.successIndicators?.map((s: string) => `✅ ${s}`).join('\n') || "Not specified"}

**What indicates FAILURE:**
${verificationData?.failureIndicators?.map((f: string) => `❌ ${f}`).join('\n') || "Not specified"}

**Check Description:** ${verificationData?.checkDescription || "Verify the step was completed correctly"}

**Automated Actions to Perform:**
${verificationData?.automatedActions?.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n') || "Manual verification required"}

## TASK
Analyze this step and generate a verification checklist. Consider:
1. What specific things can the user check in their n8n workflow?
2. What should they verify in the external service (Apollo.io, Google Sheets, etc.)?
3. What common mistakes might they have made?
4. What's the most likely status based on the complexity of the step?

Respond with ONLY valid JSON, no markdown code blocks.`;

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
        JSON.stringify({ error: "Failed to generate verification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from the AI
    let verificationResult;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      verificationResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a fallback response
      verificationResult = {
        status: "MANUAL_CHECK_REQUIRED",
        confidence: "low",
        summary: "Automatic verification unavailable. Please verify manually using the checklist below.",
        checklist: [
          { item: "Verify the configuration exists", status: "warning", howToVerify: "Check your n8n workflow for the relevant node" },
          { item: "Test with sample data", status: "warning", howToVerify: "Run the workflow with test inputs" },
          { item: "Check for error messages", status: "warning", howToVerify: "Review n8n execution logs" }
        ],
        suggestions: ["Run a manual test of this step", "Check the n8n execution history for errors"],
        commonMistakes: ["Missing API credentials", "Incorrect field mappings"]
      };
    }

    return new Response(
      JSON.stringify(verificationResult),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-step error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
