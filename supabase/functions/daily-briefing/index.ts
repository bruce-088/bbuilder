import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent events, lead stats, and mission in parallel
    const [eventsResult, leadsResult, missionResult, profileResult] = await Promise.all([
      supabase
        .from("mission_events")
        .select("event_type, xp_awarded, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("lead_contacts")
        .select("stage")
        .eq("user_id", user.id),
      supabase
        .from("user_missions")
        .select("xp_earned, current_stage, target_date")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const events = eventsResult.data || [];
    const leads = leadsResult.data || [];
    const mission = missionResult.data;
    const displayName = profileResult.data?.display_name || "there";

    // Calculate stats
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentEvents = events.filter((e: { created_at: string }) => e.created_at > dayAgo);
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l: { stage: string }) => l.stage === "won").length;
    const pipelineLeads = leads.filter((l: { stage: string }) => !["won", "lost"].includes(l.stage)).length;
    const xp = mission?.xp_earned || 0;
    const stage = mission?.current_stage || 1;

    // Determine the greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Build context for AI
    const context = `
User name: ${displayName}
XP earned: ${xp}
Current stage: ${stage}/5
Events in last 24h: ${recentEvents.length}
Recent event types: ${recentEvents.map((e: { event_type: string }) => e.event_type).join(", ") || "none"}
Total leads: ${totalLeads}
Leads in pipeline: ${pipelineLeads}
Won deals: ${wonLeads}
Days remaining: ${mission?.target_date ? Math.max(0, Math.ceil((new Date(mission.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 14}
    `.trim();

    // Use Lovable AI to generate the briefing
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (lovableApiKey) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are Mya, a warm and confident AI business coach. Generate a 2-3 sentence daily briefing. Be encouraging, specific, and action-oriented. Reference actual stats. Frame success as inevitable. Use the user's first name. Keep it conversational and warm like a supportive mentor.`,
            },
            {
              role: "user",
              content: `Generate a personalized daily briefing based on this data:\n${context}\n\n${greeting}, ${displayName}!`,
            },
          ],
          max_tokens: 200,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const briefing = aiData.choices?.[0]?.message?.content || "";

        return new Response(JSON.stringify({ briefing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback briefing without AI
    let briefing = `${greeting}, ${displayName}! `;

    if (recentEvents.length > 0) {
      briefing += `You've been busy — ${recentEvents.length} action${recentEvents.length > 1 ? "s" : ""} in the last 24 hours. `;
    }

    if (pipelineLeads > 0) {
      briefing += `You have ${pipelineLeads} lead${pipelineLeads > 1 ? "s" : ""} in your pipeline. `;
    }

    if (stage <= 2) {
      briefing += "Let's keep building your foundation — every step gets you closer to that first customer.";
    } else if (stage <= 4) {
      briefing += "You're in the build phase now. Keep that momentum going!";
    } else {
      briefing += "You're so close to the finish line. Let's land that first customer!";
    }

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in daily-briefing:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
