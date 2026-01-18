import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are IdeaForge AI, an expert business consultant specializing in creating turn-key online business concepts for solopreneurs and introverts. Your goal is to help users discover, validate, and launch profitable online businesses that can generate $10,000+ net profit per month.

You have deep expertise in:
- Online business models (agencies, SaaS, productized services, digital products)
- AI automation for sales and client management
- Fast validation strategies
- Revenue modeling and pricing
- Market research and niche selection

When generating business ideas, always provide:
1. Business Name and Niche - catchy, memorable, and descriptive
2. Target Audience - specific demographics and psychographics
3. Value Proposition - the unique benefit you provide
4. Service/Product Offering - detailed description of deliverables
5. Revenue Math - clear breakdown showing path to $10K/month
6. Fast Validation Path - steps to get first paying customer in 2-4 weeks
7. AI Automation Strategy - how AI can handle prospecting, qualification, presentation, objection handling, closing, and follow-up

Be encouraging, practical, and specific. Focus on businesses that:
- Can be started with minimal upfront investment
- Don't require extensive technical skills
- Leverage AI tools for automation
- Can scale without proportional time investment
- Are suitable for introverts (minimal cold calling, relationship-focused)

Format your responses with clear sections and bullet points for readability. Use markdown formatting.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log(`Processing ${type || 'chat'} request with ${messages?.length || 0} messages`);

    // Build the request body
    const requestBody: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(messages || []),
      ],
      stream: true,
    };

    // For business idea generation, we could use structured output
    if (type === "generate_ideas") {
      requestBody.messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate 5 unique, turn-key online business concepts that can realistically achieve $10,000 net profit per month. Each idea should be perfect for solopreneurs and introverts.

For EACH of the 5 business ideas, provide:

## Business Idea [Number]: [Business Name]

### Niche
[Specific niche/industry]

### Target Audience
[Detailed description of ideal customers]

### Value Proposition
[The unique value you provide]

### Service Offering
[Detailed description of what you sell/deliver]

### Revenue Math
[Clear breakdown showing path to $10K/month profit]
- Pricing: $X per [unit]
- Clients needed: X
- Estimated costs: $X
- Net profit calculation

### Fast Validation Path (2-4 weeks)
[Step-by-step plan to get first paying customer]

### AI Automation Strategy
- **Prospecting:** How AI finds leads
- **Qualification:** How AI qualifies prospects
- **Presentation:** How AI delivers pitches
- **Objection Handling:** How AI addresses concerns
- **Closing:** How AI facilitates sales
- **Follow-up:** How AI nurtures relationships

---

Make each idea distinct, practical, and achievable. Focus on high-value services that introverts can deliver effectively.`,
        },
        ...(messages || []),
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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

      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
