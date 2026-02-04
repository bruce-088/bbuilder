import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Encryption helpers (must match secure-api-keys function)
function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function deriveKey(secret: string, saltBase64: string): Uint8Array {
  const combined = secret + saltBase64;
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = combined.charCodeAt(i % combined.length);
  }
  return key;
}

function decryptApiKey(encryptedBase64: string, secret: string): string {
  const combined = fromBase64(encryptedBase64);
  const salt = combined.slice(0, 16);
  const encrypted = combined.slice(16);
  const key = deriveKey(secret, toBase64(salt));
  
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }
  
  return new TextDecoder().decode(decrypted);
}

// Retrieve and decrypt API key from database
async function getDecryptedApiKey(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<string | null> {
  const encryptionSecret = Deno.env.get("API_KEY_ENCRYPTION_SECRET");
  if (!encryptionSecret) {
    console.error("API_KEY_ENCRYPTION_SECRET not configured");
    return null;
  }

  // Get encrypted key using the secure RPC function
  const { data, error } = await supabase.rpc("get_api_key_encrypted", {
    p_user_id: userId,
    p_provider: provider,
  });

  if (error) {
    console.error(`Error retrieving encrypted key for ${provider}:`, error);
    return null;
  }

  if (!data) {
    return null;
  }

  try {
    // Convert bytea to base64 string for decryption
    const encryptedBase64 = toBase64(new Uint8Array(data));
    return decryptApiKey(encryptedBase64, encryptionSecret);
  } catch (decryptError) {
    console.error(`Decryption failed for ${provider}:`, decryptError);
    return null;
  }
}

interface AIFix {
  phase: string;
  rootCause: string;
  solution: string;
  steps: string[];
  prevention: string;
  confidence: "high" | "medium" | "low";
  automatable: boolean;
  automationMethod?: "workflow_json" | "api_call" | "none";
  workflowPatch?: Record<string, unknown>;
  requiredUserAction?: string;
}

interface AutomationRequest {
  action: "full-automation" | "analyze" | "generate" | "deploy" | "verify" | "diagnose" | "validate" | "apply-fixes" | "execute-fix";
  businessIdeaId: string;
  aiProvider?: "lovable" | "openai" | "claude" | "perplexity" | "gemini";
  runId?: string;
  phase?: string;
  nodeData?: Record<string, unknown>;
  exceptions?: PhaseResult[];
  fix?: AIFix;
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

// AI Provider call functions
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

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<Response> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  return response;
}

async function callClaude(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<Response> {
  // Convert messages to Claude format (no system in messages array)
  const systemMessage = messages.find((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemMessage?.content || "",
      messages: otherMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  return response;
}

async function callPerplexity(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<Response> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages,
    }),
  });

  return response;
}

async function callGemini(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<Response> {
  // Convert messages to Gemini format
  const systemMessage = messages.find((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");
  
  const contents = otherMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
      }),
    }
  );

  return response;
}

// Helper to call the appropriate AI provider
async function callAI(
  messages: Array<{ role: string; content: string }>,
  provider: string,
  supabase: SupabaseClient,
  userId: string,
  tools?: Array<Record<string, unknown>>
): Promise<Response> {
  switch (provider) {
    case "openai": {
      const apiKey = await getDecryptedApiKey(supabase, userId, "openai");
      if (!apiKey) {
        throw new Error("OpenAI API key not configured. Please add your API key in AI Settings.");
      }
      return callOpenAI(messages, apiKey);
    }

    case "claude": {
      const apiKey = await getDecryptedApiKey(supabase, userId, "claude");
      if (!apiKey) {
        throw new Error("Claude API key not configured. Please add your API key in AI Settings.");
      }
      return callClaude(messages, apiKey);
    }

    case "perplexity": {
      const apiKey = await getDecryptedApiKey(supabase, userId, "perplexity");
      if (!apiKey) {
        throw new Error("Perplexity API key not configured. Please add your API key in AI Settings.");
      }
      return callPerplexity(messages, apiKey);
    }

    case "gemini": {
      const apiKey = await getDecryptedApiKey(supabase, userId, "gemini");
      if (!apiKey) {
        throw new Error("Gemini API key not configured. Please add your API key in AI Settings.");
      }
      return callGemini(messages, apiKey);
    }

    default:
      return callLovableAI(messages, tools);
  }
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

async function applyAIFixes(
  exceptions: PhaseResult[],
  businessIdea: Record<string, unknown>,
  provider: string,
  supabase: SupabaseClient,
  userId: string
): Promise<PhaseResult> {
  if (!exceptions || exceptions.length === 0) {
    return {
      phase: "apply-fixes",
      status: "success",
      message: "No exceptions to fix",
      timestamp: new Date().toISOString(),
    };
  }

  const systemPrompt = `You are an expert automation troubleshooter. Analyze these automation exceptions and provide actionable fixes.

Business Context:
${JSON.stringify(businessIdea, null, 2)}

Exceptions to fix:
${exceptions.map((e) => `- Phase: ${e.phase}, Status: ${e.status}, Message: ${e.message}`).join("\n")}

For each exception, determine if it can be automated or requires manual user action:

AUTOMATABLE fixes (set automatable: true):
- Updating node parameters via n8n API
- Generating corrected workflow JSON for re-import
- Creating credentials configuration templates
- Fixing webhook URLs or API endpoints
- Correcting data mapping/transformations

MANUAL fixes (set automatable: false):
- OAuth authentication flows (user must click "Authorize")
- API key retrieval from external services
- Billing/payment issues
- Third-party dashboard configurations
- User account setup on external platforms

For each exception, provide:
1. Root cause analysis
2. Step-by-step fix instructions
3. Prevention strategies
4. Whether it can be automated
5. If automatable, the method (workflow_json or api_call)
6. If manual, what specific user action is required

Be specific and actionable. Return JSON:
{
  "fixes": [
    {
      "phase": "string",
      "rootCause": "string",
      "solution": "string",
      "steps": ["step1", "step2"],
      "prevention": "string",
      "confidence": "high" | "medium" | "low",
      "automatable": boolean,
      "automationMethod": "workflow_json" | "api_call" | "none",
      "workflowPatch": { /* optional: corrected node config if automatable */ },
      "requiredUserAction": "string (required if automatable is false)"
    }
  ],
  "summary": "Overall summary of fixes applied",
  "requiresManualAction": boolean
}`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ exceptions, businessIdea }) },
      ],
      provider,
      supabase,
      userId
    );

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limits
      if (response.status === 429) {
        return {
          phase: "apply-fixes",
          status: "warning",
          message: "AI rate limit reached. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        };
      }
      
      // Handle payment required
      if (response.status === 402) {
        return {
          phase: "apply-fixes",
          status: "error",
          message: "AI credits exhausted. Please add credits to continue.",
          timestamp: new Date().toISOString(),
        };
      }

      return {
        phase: "apply-fixes",
        status: "error",
        message: `AI analysis failed: ${errorText}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Parse response based on provider
    let content = "";
    const data = await response.json();
    
    if (provider === "claude") {
      content = data.content?.[0]?.text || "";
    } else if (provider === "gemini") {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      content = data.choices?.[0]?.message?.content || "";
    }

    const fixes = extractJsonFromContent(content);
    const fixesData = fixes as { fixes?: unknown[]; summary?: string; requiresManualAction?: boolean } | null;

    return {
      phase: "apply-fixes",
      status: fixesData?.fixes && fixesData.fixes.length > 0 ? "success" : "warning",
      message: fixesData?.summary || `Generated ${fixesData?.fixes?.length || 0} fix recommendations`,
      data: {
        fixes: fixesData?.fixes || [],
        requiresManualAction: fixesData?.requiresManualAction ?? true,
        originalExceptions: exceptions.length,
        provider,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Apply fixes error:", error);
    return {
      phase: "apply-fixes",
      status: "error",
      message: error instanceof Error ? error.message : "Failed to apply AI fixes",
      timestamp: new Date().toISOString(),
    };
  }
}

async function executeAIFix(
  fix: AIFix,
  businessIdea: Record<string, unknown>,
  provider: string,
  supabase: SupabaseClient,
  userId: string
): Promise<PhaseResult> {
  if (!fix.automatable) {
    return {
      phase: "execute-fix",
      status: "error",
      message: "This fix requires manual action and cannot be automated.",
      data: { requiredUserAction: fix.requiredUserAction },
      timestamp: new Date().toISOString(),
    };
  }

  const systemPrompt = `You are an n8n workflow expert. Generate a corrected workflow JSON patch based on this fix.

Business Context:
${JSON.stringify(businessIdea, null, 2)}

Fix to execute:
- Phase: ${fix.phase}
- Root Cause: ${fix.rootCause}
- Solution: ${fix.solution}
- Steps: ${fix.steps.join(", ")}
- Automation Method: ${fix.automationMethod}
${fix.workflowPatch ? `- Existing Patch: ${JSON.stringify(fix.workflowPatch)}` : ""}

Generate:
1. A complete, valid n8n workflow JSON that implements this fix
2. The workflow should be immediately importable into n8n
3. Use only valid n8n node types

Return JSON:
{
  "success": boolean,
  "workflowJson": { /* complete n8n workflow */ },
  "importInstructions": "string with steps to import",
  "message": "string describing what was fixed"
}`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ fix, businessIdea }) },
      ],
      provider,
      supabase,
      userId
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        phase: "execute-fix",
        status: "error",
        message: `Failed to generate fix: ${errorText}`,
        timestamp: new Date().toISOString(),
      };
    }

    let content = "";
    const data = await response.json();
    
    if (provider === "claude") {
      content = data.content?.[0]?.text || "";
    } else if (provider === "gemini") {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      content = data.choices?.[0]?.message?.content || "";
    }

    const result = extractJsonFromContent(content) as {
      success?: boolean;
      workflowJson?: object;
      importInstructions?: string;
      message?: string;
    } | null;

    if (result?.success && result.workflowJson) {
      // Save the updated workflow to the database
      const { error: snapshotError } = await supabase
        .from("n8n_workflow_snapshots")
        .insert({
          user_id: userId,
          workflow_id: `fix-${fix.phase}-${Date.now()}`,
          workflow_name: `Fixed: ${fix.phase} - ${fix.solution.slice(0, 50)}`,
          nodes: result.workflowJson,
          source: "ai-fix",
        });

      if (snapshotError) {
        console.error("Failed to save workflow snapshot:", snapshotError);
      }

      return {
        phase: "execute-fix",
        status: "success",
        message: result.message || "Fix executed successfully",
        data: {
          updatedWorkflowJson: result.workflowJson,
          importInstructions: result.importInstructions,
          snapshotSaved: !snapshotError,
        },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      phase: "execute-fix",
      status: "warning",
      message: "Fix generated but may need manual verification",
      data: { rawContent: content },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Execute fix error:", error);
    return {
      phase: "execute-fix",
      status: "error",
      message: error instanceof Error ? error.message : "Failed to execute fix",
      timestamp: new Date().toISOString(),
    };
  }
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
        case "apply-fixes":
          result = await applyAIFixes(
            body.exceptions || [],
            businessIdea as Record<string, unknown>,
            aiProvider,
            supabase,
            user.id
          );
          break;
        case "execute-fix":
          if (!body.fix) {
            result = {
              phase: "execute-fix",
              status: "error",
              message: "No fix provided to execute",
              timestamp: new Date().toISOString(),
            };
          } else {
            result = await executeAIFix(
              body.fix,
              businessIdea as Record<string, unknown>,
              aiProvider,
              supabase,
              user.id
            );
          }
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
