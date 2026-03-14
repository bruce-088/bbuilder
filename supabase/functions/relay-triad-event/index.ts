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
    // 1. Auth check
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const eventType = body.event_type as string;
    const sourceApp = (body.source_app as string) || "business_builder";
    const payload = body.payload as Record<string, unknown> | undefined;

    if (!eventType || !payload) {
      return new Response(
        JSON.stringify({ error: "event_type and payload are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Persist event locally
    const { error: insertErr } = await supabase.from("triad_events").insert({
      user_id: user.id,
      event_type: eventType,
      source_app: sourceApp,
      payload,
    });
    if (insertErr) console.warn("triad_events insert:", insertErr.message);

    // 4. Secret check
    const syncSecret = Deno.env.get("TRIAD_SYNC_SECRET");
    if (!syncSecret) {
      return new Response(
        JSON.stringify({ error: "SYNC_SECRET_MISSING", message: "TRIAD_SYNC_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Build targets
    const nexusUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
    const vocalUrl = (Deno.env.get("WEATHERPOST_API_URL") || "").trim();

    const eventPayload = {
      event_type: eventType,
      source_app: sourceApp,
      user_id: user.id,
      payload,
      ts: new Date().toISOString(),
    };

    const targets: { label: string; url: string; body: string }[] = [];

    if (nexusUrl && !nexusUrl.includes("localhost") && !nexusUrl.includes("127.0.0.1") && !nexusUrl.includes("id-preview--")) {
      targets.push({ label: "NexusAI", url: nexusUrl, body: JSON.stringify(eventPayload) });
    }
    if (vocalUrl && !vocalUrl.includes("localhost") && !vocalUrl.includes("127.0.0.1") && !vocalUrl.includes("id-preview--")) {
      targets.push({ label: "NexusVocal", url: vocalUrl, body: JSON.stringify({ action: "event", ...eventPayload }) });
    }

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          event_saved: !insertErr,
          error: "NO_SYNC_TARGETS",
          message: "No valid external sync targets configured",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Send to targets in parallel (10s timeout)
    async function sendToTarget(target: { label: string; url: string; body: string }) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 10000);
      try {
        const res = await fetch(target.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-triad-key": syncSecret! },
          body: target.body,
          signal: ctrl.signal,
        });
        const text = await res.text();
        clearTimeout(tid);

        if (!res.ok) {
          console.error(`${target.label} rejected [${res.status}]:`, text);
          return { label: target.label, success: false, status_code: res.status, response: text.substring(0, 500) };
        }

        console.log(`${target.label} OK for ${eventType}`);
        return { label: target.label, success: true, status_code: 200, response: text.substring(0, 200) };
      } catch (err: any) {
        clearTimeout(tid);
        const msg = err?.name === "AbortError" ? "Timeout after 10s" : String(err);
        console.error(`${target.label} error:`, msg);
        return { label: target.label, success: false, status_code: 0, response: msg };
      }
    }

    const results = await Promise.all(targets.map(sendToTarget));
    const allSuccess = results.every((r) => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        event_saved: !insertErr,
        event_type: eventType,
        results,
      }),
      { status: allSuccess ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("relay-triad-event error:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
