import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function postToService(
  url: string,
  secret: string,
  payload: Record<string, unknown>,
  label: string
): Promise<{ sent: boolean; message: string; response_body?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-triad-key": secret,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`${label} error [${res.status}]: ${body}`);
      return { sent: true, message: `${label} returned ${res.status}`, response_body: body };
    }
    return { sent: true, message: "ok" };
  } catch (err) {
    console.error(`${label} fetch error:`, err);
    return { sent: false, message: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_idea_id } = await req.json();
    if (!business_idea_id) {
      return new Response(JSON.stringify({ error: "business_idea_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the business idea
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

    // Build content pillars
    const contentPillars = [
      `${idea.niche} Authority`,
      `${idea.target_audience} Pain Points`,
      `${idea.service_offering?.split(" ").slice(0, 3).join(" ") || idea.niche} Solutions`,
      "Social Proof",
    ];
    const crmStages = ["captured", "qualified", "proposal", "negotiation", "won", "lost"];

    // Upsert manifest
    const { error: upsertError } = await supabase
      .from("triad_manifests")
      .upsert(
        {
          id: user.id,
          business_name: idea.business_name,
          niche: idea.niche,
          target_audience: idea.target_audience,
          content_pillars: contentPillars,
          crm_stages: crmStages,
          status: "active",
          metadata: { source_idea_id: business_idea_id, synced_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save manifest", details: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the event
    await supabase.from("triad_events").insert({
      user_id: user.id,
      event_type: "MANIFEST_SYNCED",
      source_app: "business_builder",
      payload: { business_idea_id, business_name: idea.business_name },
    });

    // Shared payload for downstream services
    const syncPayload = {
      user_id: user.id,
      business_name: idea.business_name,
      niche: idea.niche,
      target_audience: idea.target_audience,
      value_proposition: idea.value_proposition,
      content_pillars: contentPillars,
      crm_stages: crmStages,
      synced_at: new Date().toISOString(),
    };

    const triadSyncSecret = Deno.env.get("TRIAD_SYNC_SECRET") || "";

    // Send to Nexus and WeatherPost in parallel
    const nexusApiUrl = Deno.env.get("NEXUS_API_URL");
    const weatherpostApiUrl = Deno.env.get("WEATHERPOST_API_URL");

    const [nexusSyncResult, weatherpostSyncResult] = await Promise.all([
      nexusApiUrl && triadSyncSecret
        ? postToService(nexusApiUrl, triadSyncSecret, syncPayload, "Nexus")
        : Promise.resolve({ sent: false, message: "NEXUS_API_URL not configured" }),
      weatherpostApiUrl && triadSyncSecret
        ? postToService(weatherpostApiUrl, triadSyncSecret, syncPayload, "WeatherPost")
        : Promise.resolve({ sent: false, message: "WEATHERPOST_API_URL not configured" }),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        manifest_saved: true,
        nexus_sync: nexusSyncResult,
        weatherpost_sync: weatherpostSyncResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-to-triad error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
