import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map phases to setup guide capability IDs (mirrors useRoadmapProgress)
const PHASE_CAPABILITY_MAP: Record<string, string[]> = {
  validation: ["qualification"],
  landing: ["pipeline"],
  offer: ["closing"],
  outreach: ["lead-gen", "outreach"],
  sale: ["closing", "analytics"],
};

const CAPABILITY_STEP_COUNTS: Record<string, number> = {
  "lead-gen": 5, pipeline: 5, outreach: 5, qualification: 5, closing: 5, automation: 6, analytics: 5,
};

const PHASE_TASKS: Record<string, { name: string; description: string; tasks: { title: string }[] }> = {
  validation: {
    name: "Market Validation",
    description: "Validate your niche and target audience",
    tasks: [
      { title: "Define target audience persona" },
      { title: "Research competitor positioning" },
      { title: "Identify 3 key pain points" },
      { title: "Validate demand with 5 prospect conversations" },
      { title: "Document unique value proposition" },
    ],
  },
  landing: {
    name: "Landing Page",
    description: "Build your online presence",
    tasks: [
      { title: "Choose domain and hosting" },
      { title: "Write headline and hero copy" },
      { title: "Create lead capture form" },
      { title: "Add social proof section" },
      { title: "Set up analytics tracking" },
    ],
  },
  offer: {
    name: "Offer Creation",
    description: "Define your service and pricing",
    tasks: [
      { title: "Define core service package" },
      { title: "Set pricing strategy" },
      { title: "Create proposal template" },
      { title: "Build onboarding checklist" },
      { title: "Prepare contract template" },
    ],
  },
  outreach: {
    name: "Lead Outreach",
    description: "Start reaching out to prospects",
    tasks: [
      { title: "Build prospect list of 50 leads" },
      { title: "Write cold outreach templates" },
      { title: "Set up email sequences" },
      { title: "Launch LinkedIn outreach campaign" },
      { title: "Schedule 10 discovery calls" },
    ],
  },
  sale: {
    name: "First Sale",
    description: "Close your first customer",
    tasks: [
      { title: "Send 3 personalized proposals" },
      { title: "Follow up on open proposals" },
      { title: "Negotiate and close first deal" },
      { title: "Collect first payment" },
      { title: "Deliver onboarding experience" },
    ],
  },
};

function getPhaseStatus(phaseId: string, progress: Record<string, boolean[]>): { status: string; percentage: number } {
  const caps = PHASE_CAPABILITY_MAP[phaseId] || [];
  let total = 0;
  let completed = 0;
  for (const capId of caps) {
    const stepCount = CAPABILITY_STEP_COUNTS[capId] ?? 0;
    total += stepCount;
    const arr = progress[capId];
    if (arr) completed += arr.filter(Boolean).length;
  }
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const status = percentage === 100 ? "completed" : percentage > 0 ? "in-progress" : "pending";
  return { status, percentage };
}

function assignTaskStatuses(tasks: { title: string }[], phaseStatus: string, percentage: number): { title: string; status: string }[] {
  if (phaseStatus === "completed") return tasks.map((t) => ({ ...t, status: "completed" }));
  if (phaseStatus === "pending") return tasks.map((t) => ({ ...t, status: "pending" }));
  const doneCount = Math.floor((percentage / 100) * tasks.length);
  return tasks.map((t, i) => ({ ...t, status: i < doneCount ? "completed" : "pending" }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Secret check — return structured error so UI can show warning
    const syncSecret = Deno.env.get("TRIAD_SYNC_SECRET");
    if (!syncSecret) {
      console.error("TRIAD_SYNC_SECRET is missing from environment");
      return new Response(
        JSON.stringify({ error: "SYNC_SECRET_MISSING", message: "Sync Disabled: Missing Secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Auth check
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

    const userId = user.id;

    // 3. Parse body
    const body = await req.json().catch(() => ({}));
    const business_idea_id = body?.business_idea_id as string | undefined;
    const phase_id = body?.phase_id as string | undefined;
    const incomingManifest = body?.manifest as Record<string, unknown> | undefined;

    if (!business_idea_id && !incomingManifest) {
      return new Response(JSON.stringify({ error: "business_idea_id or manifest is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. URL check — validate NEXUS_API_URL
    const nexusApiUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
    if (!nexusApiUrl) {
      return new Response(JSON.stringify({ error: "NEXUS_API_URL is missing or empty" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block localhost / preview URLs — only allow published .app URLs
    if (nexusApiUrl.includes("localhost") || nexusApiUrl.includes("127.0.0.1") || nexusApiUrl.includes("id-preview--")) {
      console.error("NEXUS_API_URL points to a non-production URL:", nexusApiUrl);
      return new Response(
        JSON.stringify({
          error: "INVALID_NEXUS_URL",
          message: `Sync target is not a live URL: ${nexusApiUrl}. Update NEXUS_API_URL to the published app URL.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Build manifest
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

      let userProgress: Record<string, boolean[]> = {};
      try {
        const { data: progressData } = await supabase
          .from("setup_guide_progress")
          .select("progress")
          .eq("user_id", userId)
          .maybeSingle();
        if (progressData?.progress) {
          userProgress = progressData.progress as Record<string, boolean[]>;
        }
      } catch (e) {
        console.warn("Could not fetch setup_guide_progress, defaulting to pending:", e);
      }

      let tasks: { title: string; status: string; phase: string; phase_name: string }[] = [];

      if (phase_id && PHASE_TASKS[phase_id]) {
        const phaseDef = PHASE_TASKS[phase_id];
        const { status, percentage } = getPhaseStatus(phase_id, userProgress);
        const statusedTasks = assignTaskStatuses(phaseDef.tasks, status, percentage);
        tasks = statusedTasks.map((t) => ({ ...t, phase: phase_id, phase_name: phaseDef.name }));
      } else {
        for (const [pid, phaseDef] of Object.entries(PHASE_TASKS)) {
          const { status, percentage } = getPhaseStatus(pid, userProgress);
          const statusedTasks = assignTaskStatuses(phaseDef.tasks, status, percentage);
          for (const task of statusedTasks) {
            tasks.push({ ...task, phase: pid, phase_name: phaseDef.name });
          }
        }
      }

      const content_pillars = [
        `${idea.niche || "Business"} Authority`,
        `${idea.target_audience || "Customer"} Pain Points`,
        `${idea.service_offering?.split(" ").slice(0, 3).join(" ") || idea.niche || "Service"} Solutions`,
        "Social Proof",
      ];

      manifest = {
        user_id: userId,
        business_name: idea.business_name || "My Business",
        niche: idea.niche || "general",
        target_audience: idea.target_audience || "small business owners",
        value_proposition: idea.value_proposition || "",
        content_pillars,
        phase_id: phase_id || "all",
        phase_name: phase_id ? PHASE_TASKS[phase_id]?.name : "All Phases",
        tasks,
        synced_at: new Date().toISOString(),
      };
    }

    // 6. Payload validation — abort if manifest is empty or has no tasks
    if (!manifest || Object.keys(manifest).length === 0) {
      console.error("Manifest is empty or undefined. Aborting sync.");
      return new Response(
        JSON.stringify({ error: "EMPTY_MANIFEST", message: "Manifest is empty. Sync aborted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const manifestTasks = (manifest as any).tasks;
    if (!manifestTasks || (Array.isArray(manifestTasks) && manifestTasks.length === 0)) {
      console.error("Manifest has zero tasks. Aborting sync.");
      return new Response(
        JSON.stringify({ error: "NO_TASKS", message: "Manifest has no tasks. Sync aborted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Log full payload before sending
    console.log("=== SYNC-TO-NEXUS PRE-SEND ===");
    console.log("Target URL:", nexusApiUrl);
    console.log("Tasks count:", Array.isArray(manifestTasks) ? manifestTasks.length : "N/A");
    console.log("Manifest:", JSON.stringify(manifest, null, 2));

    // 8. Send to Nexus
    const res = await fetch(nexusApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-triad-key": syncSecret,
      },
      body: JSON.stringify(manifest),
    });

    const responseText = await res.text();

    // 9. Strict success check — surface exact error text
    if (!res.ok) {
      console.error(`Nexus rejected [${res.status}]:`, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "NEXUS_REJECTED",
          status_code: res.status,
          nexus_response: responseText,
          message: `Nexus returned ${res.status}: ${responseText}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Even on 200, verify the response body indicates success
    let parsedResponse: any = null;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // Non-JSON 200 response — suspicious
      console.warn("Nexus returned 200 but non-JSON body:", responseText);
    }

    if (parsedResponse && parsedResponse.error) {
      console.error("Nexus returned 200 but with error in body:", parsedResponse.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "NEXUS_BODY_ERROR",
          nexus_response: responseText,
          message: `Nexus responded with error: ${parsedResponse.error}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("=== SYNC SUCCESS ===", responseText);

    return new Response(
      JSON.stringify({
        success: true,
        tasks_sent: Array.isArray(manifestTasks) ? manifestTasks.length : 0,
        nexus_response: responseText,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-to-nexus critical error:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
