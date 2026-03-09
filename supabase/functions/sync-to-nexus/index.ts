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

// Phase definitions with tasks that map to the Visual Strategy Roadmap
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

// Compute phase status from setup_guide_progress data
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

// Distribute phase-level progress across individual tasks
function assignTaskStatuses(tasks: { title: string }[], phaseStatus: string, percentage: number): { title: string; status: string }[] {
  if (phaseStatus === "completed") return tasks.map((t) => ({ ...t, status: "completed" }));
  if (phaseStatus === "pending") return tasks.map((t) => ({ ...t, status: "pending" }));
  // in-progress: mark proportional tasks as completed
  const doneCount = Math.floor((percentage / 100) * tasks.length);
  return tasks.map((t, i) => ({ ...t, status: i < doneCount ? "completed" : "pending" }));
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Read secret from environment
    const syncSecret = Deno.env.get("TRIAD_SYNC_SECRET");
    console.log("Sending key with length:", syncSecret?.length);

    if (!syncSecret) {
      return new Response(
        JSON.stringify({ error: "Secret not found in environment." }),
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

    const nexusApiUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
    if (!nexusApiUrl) {
      return new Response(JSON.stringify({ error: "NEXUS_API_URL is missing or empty" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Build manifest
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

      // Build tasks from phase definitions
      let tasks: { title: string; status: string; phase: string; phase_name: string }[] = [];

      if (phase_id && PHASE_TASKS[phase_id]) {
        // Sync a specific phase
        const phaseDef = PHASE_TASKS[phase_id];
        tasks = phaseDef.tasks.map((t) => ({
          ...t,
          phase: phase_id,
          phase_name: phaseDef.name,
        }));
      } else {
        // Sync all phases
        for (const [pid, phaseDef] of Object.entries(PHASE_TASKS)) {
          for (const task of phaseDef.tasks) {
            tasks.push({
              ...task,
              phase: pid,
              phase_name: phaseDef.name,
            });
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

    // 5. Validate manifest has tasks
    const manifestTasks = (manifest as any).tasks;
    if (!manifestTasks || (Array.isArray(manifestTasks) && manifestTasks.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Manifest has no tasks. Skipping sync." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Send to Nexus
    console.log("Sending manifest to:", nexusApiUrl);
    console.log("Tasks count:", Array.isArray(manifestTasks) ? manifestTasks.length : "N/A");
    console.log("Payload:", JSON.stringify(manifest));

    const res = await fetch(nexusApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-triad-key": syncSecret,
      },
      body: JSON.stringify(manifest),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error(`Nexus error [${res.status}]:`, responseText);
      throw new Error(responseText || `Nexus returned ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true, tasks_sent: Array.isArray(manifestTasks) ? manifestTasks.length : 0 }), {
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
