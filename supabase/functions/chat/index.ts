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

    // For business idea generation - one detailed idea at a time
    if (type === "generate_ideas") {
      requestBody.messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate ONE unique, highly detailed turn-key online business concept that can realistically achieve $10,000 net profit per month. This idea should be perfect for solopreneurs and introverts.

# 💡 [Creative Business Name]

## 🎯 The Niche
Provide a specific, underserved niche with clear market opportunity. Explain why this niche is ideal right now.

## 👥 Target Audience
Create a detailed customer avatar:
- Demographics (age, location, profession)
- Psychographics (pain points, desires, fears)
- Where they hang out online
- What keeps them up at night

## ✨ Value Proposition
A compelling one-liner that makes prospects say "I need this!" followed by 3-4 key benefits.

## 📦 Service/Product Offering
Detailed breakdown of exactly what you deliver:
- Core deliverables
- Timeline and process
- What's included vs. add-ons
- Specific outcomes clients can expect

## 💰 Revenue Math (Path to $10K/month)
Show the exact numbers:
- **Pricing:** $X per [unit/package/retainer]
- **Clients needed:** X clients/month
- **Average client lifetime value:** $X
- **Estimated monthly costs:** $X (tools, ads, contractors)
- **Net profit calculation:** Revenue - Costs = $10K+
- **Scaling path:** How to grow beyond $10K

## 🚀 Fast Validation Path (Get First Customer in 2-4 Weeks)
Week-by-week action plan:
- **Week 1:** [Specific actions]
- **Week 2:** [Specific actions]
- **Week 3-4:** [Specific actions]
- First customer acquisition strategy
- How to get testimonials quickly

## 🤖 AI Automation Strategy
Detailed prompts and tools for each sales stage:

### Prospecting
- AI tools to use (with specific examples)
- Sample AI prompt for finding leads
- Automation workflow

### Qualification & Discovery
- AI-powered qualification questions
- How to automate initial outreach
- Sample scripts

### Presentation & Proposal
- AI-generated proposal templates
- Personalization at scale
- Video/demo automation

### Objection Handling
- Common objections for this niche
- AI response frameworks
- FAQ automation

### Closing
- AI-assisted follow-up sequences
- Payment and onboarding automation
- Contract generation

### Client Success & Follow-up
- Automated check-ins
- Upsell/cross-sell sequences
- Referral request automation

## 🛠️ Tech Stack Recommendation
Specific tools needed to run this business (keep it simple and affordable).

## ⚠️ Potential Challenges & Solutions
3 likely obstacles and how to overcome them.

---

Make this idea unique, creative, and immediately actionable. Be specific with examples, not generic. The reader should be able to start TODAY.`,
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
