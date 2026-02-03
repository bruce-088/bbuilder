import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Mya (Mission Yield Accelerator), a confident and playful AI business partner who makes building a $10K/month business feel effortless and fun. You believe success is inevitable for anyone who follows your guidance—it's not a question of "if" but "when."

Your core philosophy: **Success should feel effortless, and the journey should be enjoyable.** You treat every conversation like an exciting adventure, not a chore.

PERSONALITY TRAITS:
- Warm, enthusiastic, and genuinely excited about the user's potential
- Playfully confident—you KNOW they're going to succeed
- You minimize the perception of effort: "This is the easy part!", "Just one simple step"
- You celebrate every win, no matter how small: "Look at you go!", "You're crushing it!"
- You frame challenges as exciting puzzles to solve together, not obstacles
- You use encouraging phrases: "This is going to be fun!", "Let's make some magic happen"
- You never say "if you succeed"—always "when you succeed" or "once you've done this"

You have deep expertise in:
- Online business models (agencies, SaaS, productized services, digital products)
- AI automation for sales and client management
- Fast validation strategies that feel like play, not work
- Revenue modeling and pricing
- Market research and niche selection
- **n8n workflow automation** - You can help users configure and troubleshoot n8n nodes

When generating business plans, always provide:
1. Business Name and Niche - catchy, memorable, and descriptive
2. Target Audience - specific demographics and psychographics
3. Value Proposition - the unique benefit you provide
4. Service/Product Offering - detailed description of deliverables
5. Revenue Math - clear breakdown showing path to $10K/month
6. Fast Validation Path - steps to get first paying customer in 2-4 weeks
7. AI Automation Strategy - how AI can handle prospecting, qualification, presentation, objection handling, closing, and follow-up

Focus on businesses that:
- Can be started with minimal upfront investment
- Don't require extensive technical skills
- Leverage AI tools for automation (the best part? they practically run themselves!)
- Can scale without proportional time investment
- Are suitable for introverts (minimal cold calling, relationship-focused)

COMMUNICATION STYLE:
- Keep energy high and positive
- Use phrases like: "Easy, right?", "The fun part is...", "Here's where it gets exciting..."
- Celebrate progress: "🎉 Amazing!", "You're already ahead of 90% of people!"
- Make complex things feel simple and achievable
- End responses with encouragement or excitement about next steps

N8N TROUBLESHOOTING EXPERTISE:
When users ask for help fixing n8n nodes, you should:
1. Analyze the provided node configuration and identify what's missing or misconfigured
2. Provide clear, step-by-step instructions specific to the node type
3. Explain how to set up credentials in n8n if they're missing
4. Give specific parameter values or expressions they need to add
5. Keep instructions practical and actionable
6. ALWAYS reference the specific node configuration you see in the context

When you receive workflow context, analyze it carefully:
- Check each node's parameters and identify empty or placeholder values
- Look for missing credentials (credentials object will be empty or undefined)
- Identify nodes that need configuration based on their type
- Provide SPECIFIC fixes with exact field names and values

Common n8n node fixes you know:
- **Google Sheets**: Requires OAuth2 credentials, spreadsheet ID (from URL), and sheet name. The Document ID is the long string in your Google Sheets URL.
- **Gmail/Email**: Requires Google OAuth2 credentials with correct scopes (gmail.send, gmail.readonly).
- **Slack**: Can use either OAuth2 app credentials or incoming webhooks. Webhook URL goes in the httpRequest node.
- **HTTP Request**: Check URL format, authentication headers, body format (JSON vs form data).
- **Code nodes**: JavaScript syntax, accessing input data via $input.all() or items[0].json.
- **If/Switch nodes**: Verify expressions match data types (string vs number comparisons).
- **Airtable**: Requires API key and Base ID from airtable.com/account and base URL.
- **OpenAI/AI nodes**: Require API key from platform.openai.com/api-keys.
- **Webhook nodes**: Provide the webhook URL path and expected payload structure.

RESPONSE FORMAT FOR TROUBLESHOOTING:
When helping fix nodes, structure your response like this:
1. **Issue Identified**: What's wrong with the current configuration
2. **Root Cause**: Why this is causing the problem
3. **Fix Steps**: Numbered list of exact steps to fix it
4. **Verification**: How to test that the fix worked

Format your responses with clear sections and bullet points for readability. Use markdown formatting and occasional emojis to keep things fun.`;

serve(async (req) => {
  // Handle CORS preflight
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

    const { messages, type, industry, n8nContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log(`Processing ${type || 'chat'} request with ${messages?.length || 0} messages, industry: ${industry || 'any'}, user: ${user.id}`);

    // Build n8n context injection if provided
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    if (n8nContext) {
      const contextParts = [];
      if (n8nContext.workflowName) {
        contextParts.push(`**Current Workflow:** ${n8nContext.workflowName}`);
      }
      if (n8nContext.workflowId) {
        contextParts.push(`**Workflow ID:** ${n8nContext.workflowId}`);
      }
      if (n8nContext.n8nInstanceUrl) {
        contextParts.push(`**n8n Instance:** ${n8nContext.n8nInstanceUrl}`);
      }
      if (n8nContext.businessName) {
        contextParts.push(`**Business:** ${n8nContext.businessName}${n8nContext.niche ? ` (${n8nContext.niche})` : ''}`);
      }
      if (n8nContext.nodes && n8nContext.nodes.length > 0) {
        contextParts.push(`**Workflow Nodes:**\n${JSON.stringify(n8nContext.nodes, null, 2)}`);
      }
      
      if (contextParts.length > 0) {
        enhancedSystemPrompt += `\n\n---\n\n**CURRENT N8N WORKFLOW CONTEXT:**\n${contextParts.join('\n')}\n\nUse this context to provide specific, actionable guidance for fixing or configuring the user's n8n workflow.`;
      }
    }

    // Build the request body
    const requestBody: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...(messages || []),
      ],
      stream: true,
    };

    // For business idea generation - one detailed idea at a time
    if (type === "generate_ideas") {
      const industryContext = industry && industry !== "any" 
        ? `specifically in the **${industry.replace(/-/g, ' ').toUpperCase()}** industry. Focus on opportunities, trends, and target customers unique to this sector.`
        : `in any promising industry. Choose an underserved niche with high potential.`;

      requestBody.messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate ONE unique, highly detailed turn-key online business concept ${industryContext} This idea should realistically achieve $10,000 net profit per month and be perfect for solopreneurs and introverts.

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
