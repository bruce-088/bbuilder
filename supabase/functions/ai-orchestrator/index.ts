import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AutomationRequest {
  action: "full-automation" | "analyze" | "generate" | "deploy" | "verify" | "diagnose" | "validate";
  businessIdeaId: string;
  aiProvider?: "lovable" | "openai" | "claude" | "perplexity";
  runId?: string;
  phase?: string;
  nodeData?: Record<string, unknown>;
}

interface PhaseResult {
  phase: string;
  status: "success" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const AUTOMATION_PHASES = [
  { id: "analyze", name: "Analyze Business Plan", description: "Extract ICP, services, and automation requirements" },
  { id: "generate", name: "Generate Workflows", description: "Create n8n workflow JSON for all 6 stages" },
  { id: "deploy", name: "Deploy to n8n", description: "Deploy workflows via MCP or prepare download bundle" },
  { id: "verify", name: "Verify Configuration", description: "Check each node's configuration" },
  { id: "fix", name: "Auto-Fix Issues", description: "AI-powered diagnosis and fixes" },
  { id: "validate", name: "Final Validation", description: "End-to-end verification" },
];

async function callLovableAI(
  messages: Array<{ role: string; content: string }>,
  tools?: Array<Record<string, unknown>>
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
    stream: false,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}

async function analyzeBusinessPlan(businessIdea: Record<string, unknown>): Promise<PhaseResult> {
  const systemPrompt = `You are an automation architect. Analyze this business plan and extract:
1. Target audience (ICP) characteristics
2. Core services and their automation potential
3. Key automation workflows needed for the 6-stage funnel:
   - Stage 1: Lead Capture (how to attract leads)
   - Stage 2: Lead Qualification (how to filter/score leads)
   - Stage 3: Outreach (how to contact qualified leads)
   - Stage 4: Nurturing (how to maintain engagement)
   - Stage 5: Conversion (how to close deals)
   - Stage 6: Retention (how to keep customers)

Return a structured JSON with automation recommendations.`;

  const response = await callLovableAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(businessIdea) },
  ]);

  if (!response.ok) {
    const errorText = await response.text();
    return {
      phase: "analyze",
      status: "error",
      message: `AI analysis failed: ${errorText}`,
      timestamp: new Date().toISOString(),
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  return {
    phase: "analyze",
    status: "success",
    message: "Business plan analyzed successfully",
    data: { analysis: content, recommendations: extractJsonFromContent(content) },
    timestamp: new Date().toISOString(),
  };
}

async function generateWorkflows(
  businessIdea: Record<string, unknown>,
  analysis: Record<string, unknown>
): Promise<PhaseResult> {
  const systemPrompt = `You are an n8n workflow generator. Based on the business analysis, generate valid n8n workflow JSON for each automation stage.

Requirements:
- Use only valid n8n node types (e.g., 'n8n-nodes-base.manualTrigger', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.googleSheets')
- Include proper node positioning
- Define connections between nodes
- Add placeholder credentials that need configuration

Return a JSON object with keys: stage1, stage2, stage3, stage4, stage5, stage6
Each stage should have: { name, description, nodes, connections }`;

  const response = await callLovableAI([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Business: ${JSON.stringify(businessIdea)}\n\nAnalysis: ${JSON.stringify(analysis)}`,
    },
  ]);

  if (!response.ok) {
    return {
      phase: "generate",
      status: "error",
      message: "Workflow generation failed",
      timestamp: new Date().toISOString(),
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const workflows = extractJsonFromContent(content);

  return {
    phase: "generate",
    status: workflows ? "success" : "warning",
    message: workflows ? "Workflows generated successfully" : "Workflows generated with warnings",
    data: { workflows, rawContent: content },
    timestamp: new Date().toISOString(),
  };
}

async function deployWorkflows(
  workflows: Record<string, unknown>,
  mcpConnected: boolean
): Promise<PhaseResult> {
  if (mcpConnected) {
    return {
      phase: "deploy",
      status: "warning",
      message: "MCP deployment ready - awaiting n8n MCP integration",
      data: { workflows, deploymentMethod: "mcp" },
      timestamp: new Date().toISOString(),
    };
  }

  return {
    phase: "deploy",
    status: "success",
    message: "Workflows prepared for manual import",
    data: { workflows, deploymentMethod: "download" },
    timestamp: new Date().toISOString(),
  };
}

async function verifyWorkflows(workflows: Record<string, unknown>): Promise<PhaseResult> {
  const issues: Array<{ node: string; issue: string; severity: string }> = [];

  const workflowEntries = Object.entries(workflows || {});
  for (const [, workflow] of workflowEntries) {
    const wf = workflow as Record<string, unknown>;
    const nodes = (wf?.nodes as Array<Record<string, unknown>>) || [];
    
    for (const node of nodes) {
      if (requiresCredentials(node.type as string) && !node.credentials) {
        issues.push({
          node: (node.name as string) || "Unknown",
          issue: `Missing credentials for ${node.type}`,
          severity: "error",
        });
      }

      const params = (node.parameters as Record<string, unknown>) || {};
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string" && isPlaceholder(value)) {
          issues.push({
            node: (node.name as string) || "Unknown",
            issue: `Placeholder value in ${key}: "${value}"`,
            severity: "warning",
          });
        }
      }
    }
  }

  return {
    phase: "verify",
    status: issues.some((i) => i.severity === "error") ? "error" : issues.length > 0 ? "warning" : "success",
    message: issues.length > 0 ? `Found ${issues.length} configuration issues` : "All workflows verified",
    data: { issues, totalChecked: workflowEntries.length },
    timestamp: new Date().toISOString(),
  };
}

async function diagnoseAndFix(
  issues: Array<{ node: string; issue: string; severity: string }>,
  workflows: Record<string, unknown>
): Promise<PhaseResult> {
  if (issues.length === 0) {
    return {
      phase: "fix",
      status: "success",
      message: "No issues to fix",
      timestamp: new Date().toISOString(),
    };
  }

  const systemPrompt = `You are an n8n troubleshooting expert. Given these workflow issues, provide specific fixes:

Issues:
${issues.map((i) => `- ${i.node}: ${i.issue} (${i.severity})`).join("\n")}

For each issue, provide:
1. Root cause explanation
2. Exact fix steps
3. Updated node configuration if applicable

Return JSON with: { fixes: [{ node, issue, solution, updatedConfig }] }`;

  const response = await callLovableAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify({ issues, workflows }) },
  ]);

  if (!response.ok) {
    return {
      phase: "fix",
      status: "warning",
      message: "Auto-fix analysis incomplete - manual review needed",
      data: { issues },
      timestamp: new Date().toISOString(),
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const fixes = extractJsonFromContent(content);
  const fixesArray = (fixes as { fixes?: unknown[] })?.fixes;

  return {
    phase: "fix",
    status: fixesArray && fixesArray.length > 0 ? "success" : "warning",
    message: `Generated ${fixesArray?.length || 0} fix recommendations`,
    data: { fixes: fixesArray || [], issues },
    timestamp: new Date().toISOString(),
  };
}

async function validateAutomation(results: PhaseResult[]): Promise<PhaseResult> {
  const hasErrors = results.some((r) => r.status === "error");
  const hasWarnings = results.some((r) => r.status === "warning");

  // Create a summary without including the full results to avoid circular references
  const phaseSummaries = results.map((r) => ({
    phase: r.phase,
    status: r.status,
    message: r.message,
  }));

  return {
    phase: "validate",
    status: hasErrors ? "error" : hasWarnings ? "warning" : "success",
    message: hasErrors
      ? "Automation completed with errors - review required"
      : hasWarnings
      ? "Automation completed with warnings"
      : "Automation completed successfully!",
    data: {
      summary: {
        totalPhases: results.length,
        successful: results.filter((r) => r.status === "success").length,
        warnings: results.filter((r) => r.status === "warning").length,
        errors: results.filter((r) => r.status === "error").length,
      },
      phaseSummaries,
    },
    timestamp: new Date().toISOString(),
  };
}

function requiresCredentials(nodeType: string): boolean {
  const credentialNodes = [
    "googleSheets", "slack", "gmail", "stripe", "notion",
    "airtable", "hubspot", "salesforce", "mailchimp", "sendgrid", "twilio", "openAi",
  ];
  return credentialNodes.some((cn) => nodeType?.toLowerCase().includes(cn.toLowerCase()));
}

function isPlaceholder(value: string): boolean {
  const patterns = [/YOUR_.*_KEY/i, /REPLACE_WITH/i, /TODO/i, /PLACEHOLDER/i, /<.*>/, /\[.*\]/, /xxx/i];
  return patterns.some((p) => p.test(value));
}

function extractJsonFromContent(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function updateRunPhase(supabase: SupabaseClient, runId: string, phase: string): Promise<void> {
  await supabase
    .from("automation_runs")
    .update({ current_phase: phase, updated_at: new Date().toISOString() })
    .eq("id", runId);
}

async function finalizeRun(
  supabase: SupabaseClient,
  runId: string,
  status: string,
  results: PhaseResult[]
): Promise<void> {
  await supabase
    .from("automation_runs")
    .update({
      status,
      phases_completed: results.map((r) => r.phase),
      phase_logs: results,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AutomationRequest = await req.json();
    const { action, businessIdeaId, aiProvider = "lovable", runId } = body;

    const { data: businessIdea, error: ideaError } = await supabase
      .from("business_ideas")
      .select("*")
      .eq("id", businessIdeaId)
      .single();

    if (ideaError || !businessIdea) {
      return new Response(JSON.stringify({ error: "Business idea not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "full-automation") {
      let result: PhaseResult;

      switch (action) {
        case "analyze":
          result = await analyzeBusinessPlan(businessIdea as Record<string, unknown>);
          break;
        case "generate":
          result = await generateWorkflows(businessIdea as Record<string, unknown>, body.nodeData || {});
          break;
        case "verify":
          result = await verifyWorkflows(body.nodeData || {});
          break;
        case "diagnose":
          result = await diagnoseAndFix(
            (body.nodeData?.issues as Array<{ node: string; issue: string; severity: string }>) || [],
            (body.nodeData?.workflows as Record<string, unknown>) || {}
          );
          break;
        default:
          result = {
            phase: action,
            status: "error",
            message: `Unknown action: ${action}`,
            timestamp: new Date().toISOString(),
          };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full automation flow
    const results: PhaseResult[] = [];
    let automationRunId: string = runId || "";

    if (!automationRunId) {
      const { data: newRun, error: runError } = await supabase
        .from("automation_runs")
        .insert({
          user_id: user.id,
          business_idea_id: businessIdeaId,
          status: "running",
          current_phase: "analyze",
          ai_provider: aiProvider,
        })
        .select("id")
        .single();

      if (runError || !newRun) {
        return new Response(JSON.stringify({ error: "Failed to create automation run" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      automationRunId = newRun.id;
    }

    if (!automationRunId) {
      return new Response(JSON.stringify({ error: "No automation run ID" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase 1: Analyze
    await updateRunPhase(supabase, automationRunId, "analyze");
    const analyzeResult = await analyzeBusinessPlan(businessIdea as Record<string, unknown>);
    results.push(analyzeResult);

    if (analyzeResult.status === "error") {
      await finalizeRun(supabase, automationRunId, "failed", results);
      return new Response(JSON.stringify({ runId: automationRunId, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase 2: Generate
    await updateRunPhase(supabase, automationRunId, "generate");
    const generateResult = await generateWorkflows(
      businessIdea as Record<string, unknown>,
      (analyzeResult.data?.recommendations as Record<string, unknown>) || {}
    );
    results.push(generateResult);

    // Phase 3: Deploy
    await updateRunPhase(supabase, automationRunId, "deploy");
    const mcpConnected = false;
    const deployResult = await deployWorkflows(
      (generateResult.data?.workflows as Record<string, unknown>) || {},
      mcpConnected
    );
    results.push(deployResult);

    // Phase 4: Verify
    await updateRunPhase(supabase, automationRunId, "verify");
    const verifyResult = await verifyWorkflows(
      (generateResult.data?.workflows as Record<string, unknown>) || {}
    );
    results.push(verifyResult);

    // Phase 5: Fix
    await updateRunPhase(supabase, automationRunId, "fix");
    const fixResult = await diagnoseAndFix(
      (verifyResult.data?.issues as Array<{ node: string; issue: string; severity: string }>) || [],
      (generateResult.data?.workflows as Record<string, unknown>) || {}
    );
    results.push(fixResult);

    // Phase 6: Validate
    await updateRunPhase(supabase, automationRunId, "validate");
    const validateResult = await validateAutomation(results);
    results.push(validateResult);

    const finalStatus = validateResult.status === "error" ? "failed" : "completed";
    await finalizeRun(supabase, automationRunId, finalStatus, results);

    return new Response(
      JSON.stringify({
        runId: automationRunId,
        status: finalStatus,
        results,
        phases: AUTOMATION_PHASES,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
