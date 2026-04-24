import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You convert a business idea into an Exec Browser Automation Transcript.

Exec is an automation engine whose input is plain English — one imperative
sentence per line — which Exec compiles into 11 step types:
navigate, click, fill, select, wait, scroll, copy, scrape, open-window,
switch-window, branch.

Output rules (strict):

1. First line: a one-sentence goal describing the automation's purpose.
2. Second line: \`Go to https://<real-url>.\` (navigate).
3. One action per line, imperative mood. No numbering, no bullets.
4. Use LITERAL values — no \`<placeholder>\` and no \`{{var}}\` unless the
   value was captured earlier with a \`copy\` step.
5. For multi-tab flows, label windows in quotes:
     Open a new tab labelled "gmail" and navigate to https://mail.google.com/...
     Switch back to the "main" tab.
6. Clipboard captures: \`Copy the <thing> from <selector-or-description>\`.
   Reference later as \`{{<snake_case_key>}}\`.
7. For scrapes: \`Scrape the top <N> <things> into "<list_name>" with
   <field1>, <field2>, <field3>.\`
8. Never include real credentials, real card numbers, or real PII. Use
   synthetic but realistic values (e.g. ada@example.com, HunterHunter!2,
   4242424242424242).
9. Keep the transcript to 8–25 lines. Pick ONE concrete browser flow
   that advances the business idea (examples: reserve a domain, publish
   a landing page, create a Stripe Payment Link, schedule 10 LinkedIn DMs,
   submit to Product Hunt, register the trademark on USPTO TEAS).
10. Do NOT include narration, markdown headings, or code fences in the
    final output. Plain text only.

Return ONLY the transcript. No preface. No postscript.`;

function buildUserPrompt(idea: Record<string, unknown>): string {
  const title = (idea.business_name as string) || "Untitled";
  const niche = (idea.niche as string) || "general";
  const target = (idea.target_audience as string) || "early adopters";
  const offer =
    (idea.service_offering as string) || (idea.value_proposition as string) || "core service";
  const price = extractPrice(idea.revenue_math as string);
  const channel = guessChannel(idea);

  return `BUSINESS IDEA:
Title: ${title}
Niche: ${niche}
Target customer: ${target}
Core offer: ${offer}
Price point: ${price}
First channel: ${channel}

Your task: pick the single HIGHEST-LEVERAGE browser action the founder
should run TODAY to move from idea → first paying customer for this
specific offer. Write the Exec transcript for that action.

Preferred flow archetypes (pick the most relevant ONE):
  (a) Reserve the .com via Namecheap or Porkbun
  (b) Publish a Carrd / Framer landing page with the offer
  (c) Create a Stripe Payment Link at the chosen price
  (d) Queue 10 personalised LinkedIn DMs to target customers
  (e) Submit to Product Hunt or BetaList
  (f) Post a launch tweet and schedule 5 follow-ups via Typefully
  (g) Register the trademark search on USPTO TEAS
  (h) Create a Calendly event for discovery calls at ${price}/call`;
}

function extractPrice(revenueMath: string | undefined): string {
  if (!revenueMath) return "$99";
  const match = revenueMath.match(/\$\s?(\d{1,3}(?:[,]\d{3})*|\d+)/);
  return match ? `$${match[1]}` : "$99";
}

function guessChannel(idea: Record<string, unknown>): string {
  const text = JSON.stringify(idea).toLowerCase();
  if (text.includes("linkedin")) return "LinkedIn DMs";
  if (text.includes("twitter") || text.includes(" x ")) return "Twitter / X";
  if (text.includes("product hunt")) return "Product Hunt";
  if (text.includes("email")) return "Cold email";
  return "LinkedIn DMs";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { idea_id } = await req.json();
    if (!idea_id || typeof idea_id !== "string") {
      return new Response(JSON.stringify({ error: "idea_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // user-scoped client to verify ownership via RLS
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: idea, error: ideaErr } = await userClient
      .from("business_ideas")
      .select("*")
      .eq("id", idea_id)
      .maybeSingle();

    if (ideaErr || !idea) {
      return new Response(
        JSON.stringify({ error: "Business idea not found or unauthorized" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = buildUserPrompt(idea as Record<string, unknown>);

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.85, // ensure variety on regenerate
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content:
                userPrompt +
                `\n\nVariation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            },
          ],
        }),
      },
    );

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: txt }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiJson = await aiRes.json();
    let transcript: string =
      aiJson?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    // strip accidental code fences
    transcript = transcript
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "Empty transcript from AI" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // persist with service role (RLS already validated above)
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: updErr } = await adminClient
      .from("business_ideas")
      .update({ exec_transcript: transcript })
      .eq("id", idea_id);

    if (updErr) {
      return new Response(
        JSON.stringify({ error: "Failed to persist", detail: updErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
