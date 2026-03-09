import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("TRIAD_SYNC_SECRET")) {
      throw new Error("TRIAD_SYNC_SECRET is not set in Lovable Secrets");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json().catch(() => ({}));
    const business_idea_id = body?.business_idea_id as string | undefined;
    const incomingManifest = body?.manifest as Record<string, unknown> | undefined;

    if (!business_idea_id && !incomingManifest) {
      return new Response(JSON.stringify({ error: "business_idea_id or manifest is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nexusApiUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
    if (!nexusApiUrl) {
      return new Response(JSON.stringify({ error: "NEXUS_API_URL is missing or empty" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let manifest: Record<string, unknown>;

    if (incomingManifest) {
      manifest = incomingManifest;
    } else {
      const { data: idea, error: ideaError } = await supabase
        .from("business_ideas")
        .select("business_name, niche, target_audience, value_proposition, service_offering")
        .eq("id", business_idea_id)
        .single();

      if (ideaError || !idea) {
        return new Response(JSON.stringify({ error: "Business idea not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const content_pillars = [
        `${idea.niche} Authority`,
        `${idea.target_audience} Pain Points`,
        `${idea.service_offering?.split(" ").slice(0, 3).join(" ") || idea.niche} Solutions`,
        "Social Proof",
      ];

      manifest = {
        user_id: userId,
        business_name: idea.business_name,
        niche: idea.niche,
        target_audience: idea.target_audience,
        value_proposition: idea.value_proposition,
        content_pillars,
        synced_at: new Date().toISOString(),
      };
    }

    // Deep logging for debugging
    console.log("Sending manifest to:", nexusApiUrl);
    console.log("Payload:", JSON.stringify(manifest));

    const res = await fetch(nexusApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-triad-key": Deno.env.get("TRIAD_SYNC_SECRET")!,
      },
      body: JSON.stringify(manifest),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error(`Nexus error [${res.status}]:`, responseText);
      throw new Error(responseText || `Nexus returned ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-to-nexus error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
