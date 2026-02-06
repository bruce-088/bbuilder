import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple cron expression matcher for: minute hour day-of-month month day-of-week
function cronMatches(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const checks = [
    { value: date.getUTCMinutes(), part: parts[0], max: 59 },
    { value: date.getUTCHours(), part: parts[1], max: 23 },
    { value: date.getUTCDate(), part: parts[2], max: 31 },
    { value: date.getUTCMonth() + 1, part: parts[3], max: 12 },
    { value: date.getUTCDay(), part: parts[4], max: 6 },
  ];

  for (const { value, part } of checks) {
    if (part === "*") continue;
    // Handle */N step values
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2));
      if (step > 0 && value % step !== 0) return false;
      continue;
    }
    // Handle comma-separated values
    const values = part.split(",").map((v) => parseInt(v));
    if (!values.includes(value)) return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    // Round down to the current minute
    now.setUTCSeconds(0, 0);

    // Fetch all enabled schedules
    const { data: schedules, error } = await supabase
      .from("workflow_schedules")
      .select("*, workflows!inner(id, user_id, is_active)")
      .eq("enabled", true);

    if (error) throw error;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let triggered = 0;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    for (const schedule of schedules) {
      // Check if cron matches current time
      if (!cronMatches(schedule.cron_expression, now)) continue;

      // Avoid double-triggering: skip if last_run_at is within this minute
      if (schedule.last_run_at) {
        const lastRun = new Date(schedule.last_run_at);
        lastRun.setUTCSeconds(0, 0);
        if (lastRun.getTime() === now.getTime()) continue;
      }

      // Invoke the workflow executor
      try {
        await fetch(`${supabaseUrl}/functions/v1/workflow-executor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            workflow_id: schedule.workflow_id,
            trigger_data: { scheduled: true, triggered_at: now.toISOString(), cron: schedule.cron_expression },
          }),
        });

        // Update last_run_at
        await supabase
          .from("workflow_schedules")
          .update({ last_run_at: now.toISOString() })
          .eq("id", schedule.id);

        triggered++;
      } catch (err) {
        console.error(`Failed to trigger workflow ${schedule.workflow_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ triggered, checked: schedules.length, time: now.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("workflow-scheduler error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
