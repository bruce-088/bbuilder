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

    // 4. URL checks — validate both target URLs
    const nexusApiUrl = (Deno.env.get("NEXUS_API_URL") || "").trim();
    const vocalApiUrl = (Deno.env.get("WEATHERPOST_API_URL") || "").trim();

    const targets: { label: string; url: string }[] = [];
    const urlWarnings: string[] = [];

    if (nexusApiUrl) {
      if (nexusApiUrl.includes("localhost") || nexusApiUrl.includes("127.0.0.1") || nexusApiUrl.includes("id-preview--")) {
        urlWarnings.push(`NexusAI URL is non-production: ${nexusApiUrl}`);
      } else {
        targets.push({ label: "NexusAI", url: nexusApiUrl });
      }
    } else {
      urlWarnings.push("NEXUS_API_URL is missing or empty");
    }

    if (vocalApiUrl) {
      if (vocalApiUrl.includes("localhost") || vocalApiUrl.includes("127.0.0.1") || vocalApiUrl.includes("id-preview--")) {
        urlWarnings.push(`NexusVocal URL is non-production: ${vocalApiUrl}`);
      } else {
        targets.push({ label: "NexusVocal", url: vocalApiUrl });
      }
    } else {
      urlWarnings.push("WEATHERPOST_API_URL is missing or empty");
    }

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ error: "NO_SYNC_TARGETS", message: `No valid sync targets. ${urlWarnings.join("; ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // 6. Payload validation
    if (!manifest || Object.keys(manifest).length === 0) {
      return new Response(
        JSON.stringify({ error: "EMPTY_MANIFEST", message: "Manifest is empty. Sync aborted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const manifestTasks = (manifest as any).tasks;
    if (!manifestTasks || (Array.isArray(manifestTasks) && manifestTasks.length === 0)) {
      return new Response(
        JSON.stringify({ error: "NO_TASKS", message: "Manifest has no tasks. Sync aborted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Log pre-send
    console.log("=== SYNC-TO-NEXUS PRE-SEND ===");
    console.log("Targets:", targets.map(t => `${t.label}: ${t.url}`).join(" | "));
    console.log("Tasks count:", Array.isArray(manifestTasks) ? manifestTasks.length : "N/A");

    // 8. Send to ALL targets in parallel (10s timeout each)
    const bodyStr = JSON.stringify(manifest);

    async function syncToTarget(target: { label: string; url: string }): Promise<{
      label: string;
      success: boolean;
      status_code: number;
      response_text: string;
      error?: string;
    }> {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 10000);
      try {
        const res = await fetch(target.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-triad-key": syncSecret },
          body: bodyStr,
          signal: ctrl.signal,
        });
        const text = await res.text();
        clearTimeout(tid);

        if (!res.ok) {
          console.error(`${target.label} rejected [${res.status}]:`, text);
          return { label: target.label, success: false, status_code: res.status, response_text: text, error: `${target.label} returned ${res.status}: ${text}` };
        }

        // Check for error in body even on 200
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) {
            console.error(`${target.label} 200 but body error:`, parsed.error);
            return { label: target.label, success: false, status_code: 200, response_text: text, error: `${target.label} body error: ${parsed.error}` };
          }
        } catch { /* non-JSON 200 is fine */ }

        console.log(`${target.label} SUCCESS:`, text.substring(0, 200));
        return { label: target.label, success: true, status_code: 200, response_text: text };
      } catch (fetchErr: any) {
        clearTimeout(tid);
        const isTimeout = fetchErr?.name === "AbortError";
        const msg = isTimeout
          ? `${target.label} timeout after 10s — target may be down`
          : `${target.label} fetch failed: ${String(fetchErr)}`;
        console.error(msg);
        return { label: target.label, success: false, status_code: 0, response_text: "", error: msg };
      }
    }

    const results = await Promise.all(targets.map(syncToTarget));

    const allSuccess = results.every(r => r.success);
    const tasksCount = Array.isArray(manifestTasks) ? manifestTasks.length : 0;

    console.log("=== SYNC RESULTS ===", JSON.stringify(results.map(r => ({ label: r.label, success: r.success, status: r.status_code }))));

    return new Response(
      JSON.stringify({
        success: allSuccess,
        tasks_sent: tasksCount,
        url_warnings: urlWarnings.length > 0 ? urlWarnings : undefined,
        results: results.map(r => ({
          label: r.label,
          success: r.success,
          status_code: r.status_code,
          response_text: r.response_text.substring(0, 500),
          error: r.error,
        })),
      }),
      { status: allSuccess ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-to-nexus critical error:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
