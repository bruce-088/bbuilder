import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowSnapshot {
  workflowId: string;
  workflowName: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    parameters?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    position?: [number, number];
  }>;
  connections?: Record<string, unknown>;
}

interface AnalyzeIssueRequest {
  workflowSnapshot: WorkflowSnapshot;
  nodeName?: string;
  issueDescription?: string;
}

interface AnalysisResult {
  status: "configured" | "incomplete" | "missing";
  issues: string[];
  suggestions: string[];
  nodeDetails?: {
    name: string;
    type: string;
    hasCredentials: boolean;
    parameters: Record<string, unknown>;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "save-snapshot") {
      // Save a workflow snapshot to the database
      const body = await req.json();
      const { workflowId, workflowName, nodes, connections, conversationId } = body;

      if (!workflowId || !workflowName || !nodes) {
        return new Response(
          JSON.stringify({ error: "workflowId, workflowName, and nodes are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert the snapshot (update if exists for same workflow+conversation, insert otherwise)
      const { data, error } = await supabase
        .from("n8n_workflow_snapshots")
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowName,
          nodes,
          connections,
          conversation_id: conversationId || null,
          captured_at: new Date().toISOString(),
          source: "mcp_cache",
        }, {
          onConflict: "workflow_id,conversation_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      // If upsert fails due to no unique constraint, try insert
      if (error && error.code === "42P10") {
        const { data: insertData, error: insertError } = await supabase
          .from("n8n_workflow_snapshots")
          .insert({
            user_id: user.id,
            workflow_id: workflowId,
            workflow_name: workflowName,
            nodes,
            connections,
            conversation_id: conversationId || null,
            captured_at: new Date().toISOString(),
            source: "mcp_cache",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error saving snapshot:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to save snapshot" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, snapshot: insertData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (error) {
        console.error("Error saving snapshot:", error);
        return new Response(
          JSON.stringify({ error: "Failed to save snapshot" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, snapshot: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-snapshot") {
      // Get the latest snapshot for a workflow
      const body = await req.json();
      const { workflowId, conversationId } = body;

      let query = supabase
        .from("n8n_workflow_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("captured_at", { ascending: false })
        .limit(1);

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Error fetching snapshot:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch snapshot" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ snapshot: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-snapshots") {
      // List all snapshots for the user
      const { data, error } = await supabase
        .from("n8n_workflow_snapshots")
        .select("id, workflow_id, workflow_name, captured_at, source, conversation_id")
        .eq("user_id", user.id)
        .order("captured_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error listing snapshots:", error);
        return new Response(
          JSON.stringify({ error: "Failed to list snapshots" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ snapshots: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analyze-issue") {
      // Analyze a workflow or specific node for issues
      const body: AnalyzeIssueRequest = await req.json();
      const { workflowSnapshot, nodeName, issueDescription } = body;

      if (!workflowSnapshot || !workflowSnapshot.nodes) {
        return new Response(
          JSON.stringify({ error: "workflowSnapshot with nodes is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Record<string, AnalysisResult> = {};

      // If nodeName specified, analyze just that node
      const nodesToAnalyze = nodeName
        ? workflowSnapshot.nodes.filter(n => n.name === nodeName || n.id === nodeName)
        : workflowSnapshot.nodes;

      for (const node of nodesToAnalyze) {
        const analysis = analyzeNode(node, issueDescription);
        results[node.name] = analysis;
      }

      return new Response(
        JSON.stringify({ 
          workflowName: workflowSnapshot.workflowName,
          analysis: results,
          summary: generateAnalysisSummary(results),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "compare-snapshots") {
      // Compare two snapshots to find differences
      const body = await req.json();
      const { snapshotIdBefore, snapshotIdAfter } = body;

      const { data: snapshots, error } = await supabase
        .from("n8n_workflow_snapshots")
        .select("*")
        .in("id", [snapshotIdBefore, snapshotIdAfter])
        .eq("user_id", user.id);

      if (error || !snapshots || snapshots.length !== 2) {
        return new Response(
          JSON.stringify({ error: "Could not find both snapshots" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const before = snapshots.find(s => s.id === snapshotIdBefore);
      const after = snapshots.find(s => s.id === snapshotIdAfter);

      const diff = compareSnapshots(before, after);

      return new Response(
        JSON.stringify({ diff }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: save-snapshot, get-snapshot, list-snapshots, analyze-issue, compare-snapshots" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("n8n-data-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Analyze a single node for configuration issues
function analyzeNode(node: any, issueDescription?: string): AnalysisResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let status: "configured" | "incomplete" | "missing" = "configured";

  const nodeType = node.type || "";
  const params = node.parameters || {};
  const hasCredentials = !!(node.credentials && Object.keys(node.credentials).length > 0);

  // Check for common issues by node type
  if (nodeType.includes("googleSheets")) {
    if (!params.documentId && !params.sheetId && !params.spreadsheetId) {
      issues.push("Missing spreadsheet ID");
      suggestions.push("Set the Document ID parameter to your Google Sheets spreadsheet ID (from the URL)");
      status = "incomplete";
    }
    if (!hasCredentials) {
      issues.push("No credentials configured");
      suggestions.push("Connect Google OAuth2 credentials via Credentials → Create New → Google Sheets OAuth2 API");
      status = "incomplete";
    }
  }

  if (nodeType.includes("gmail") || nodeType.includes("email")) {
    if (!hasCredentials) {
      issues.push("No email credentials configured");
      suggestions.push("Connect Google OAuth2 credentials with Gmail scopes");
      status = "incomplete";
    }
  }

  if (nodeType.includes("slack")) {
    if (!hasCredentials && !params.webhookUrl) {
      issues.push("No Slack connection configured");
      suggestions.push("Either connect Slack OAuth2 credentials or use an Incoming Webhook URL");
      status = "incomplete";
    }
  }

  if (nodeType.includes("httpRequest")) {
    if (!params.url) {
      issues.push("Missing URL parameter");
      suggestions.push("Set the URL for the HTTP request");
      status = "incomplete";
    }
  }

  if (nodeType.includes("airtable")) {
    if (!params.baseId) {
      issues.push("Missing Airtable Base ID");
      suggestions.push("Set the Base ID from your Airtable base URL");
      status = "incomplete";
    }
    if (!hasCredentials) {
      issues.push("No Airtable API key configured");
      suggestions.push("Add your Airtable API key in Credentials");
      status = "incomplete";
    }
  }

  // Generic checks
  if (Object.keys(params).length === 0 && !nodeType.includes("manualTrigger") && !nodeType.includes("start")) {
    issues.push("No parameters configured");
    suggestions.push("Configure the required parameters for this node");
    status = "incomplete";
  }

  // If user provided an issue description, add it as context
  if (issueDescription) {
    issues.push(`User reported: ${issueDescription}`);
  }

  return {
    status,
    issues,
    suggestions,
    nodeDetails: {
      name: node.name,
      type: nodeType,
      hasCredentials,
      parameters: params,
    },
  };
}

// Generate a summary of the analysis
function generateAnalysisSummary(results: Record<string, AnalysisResult>): {
  totalNodes: number;
  configured: number;
  incomplete: number;
  missing: number;
  criticalIssues: string[];
} {
  const nodes = Object.values(results);
  const criticalIssues: string[] = [];

  nodes.forEach(node => {
    if (node.status === "incomplete" || node.status === "missing") {
      node.issues.forEach(issue => {
        if (issue.toLowerCase().includes("credential") || issue.toLowerCase().includes("missing")) {
          criticalIssues.push(`${node.nodeDetails?.name}: ${issue}`);
        }
      });
    }
  });

  return {
    totalNodes: nodes.length,
    configured: nodes.filter(n => n.status === "configured").length,
    incomplete: nodes.filter(n => n.status === "incomplete").length,
    missing: nodes.filter(n => n.status === "missing").length,
    criticalIssues: criticalIssues.slice(0, 5),
  };
}

interface WorkflowNode {
  name: string;
  credentials?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

// Compare two snapshots and return differences
function compareSnapshots(before: any, after: any): {
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesModified: Array<{ name: string; changes: string[] }>;
  credentialsAdded: string[];
  summary: string;
} {
  const beforeNodes = new Map<string, WorkflowNode>(
    ((before?.nodes || []) as WorkflowNode[]).map((n) => [n.name, n])
  );
  const afterNodes = new Map<string, WorkflowNode>(
    ((after?.nodes || []) as WorkflowNode[]).map((n) => [n.name, n])
  );

  const nodesAdded: string[] = [];
  const nodesRemoved: string[] = [];
  const nodesModified: Array<{ name: string; changes: string[] }> = [];
  const credentialsAdded: string[] = [];

  // Find added nodes
  for (const [name] of afterNodes) {
    if (!beforeNodes.has(name)) {
      nodesAdded.push(name);
    }
  }

  // Find removed nodes
  for (const [name] of beforeNodes) {
    if (!afterNodes.has(name)) {
      nodesRemoved.push(name);
    }
  }

  // Find modified nodes
  for (const [name, afterNode] of afterNodes) {
    const beforeNode = beforeNodes.get(name);
    if (beforeNode) {
      const changes: string[] = [];

      // Check credentials
      const beforeCreds = beforeNode.credentials ? Object.keys(beforeNode.credentials).length : 0;
      const afterCreds = afterNode.credentials ? Object.keys(afterNode.credentials).length : 0;
      if (afterCreds > beforeCreds) {
        changes.push("Credentials connected");
        credentialsAdded.push(name);
      }

      // Check parameters
      const beforeParams = JSON.stringify(beforeNode.parameters || {});
      const afterParams = JSON.stringify(afterNode.parameters || {});
      if (beforeParams !== afterParams) {
        changes.push("Parameters updated");
      }

      if (changes.length > 0) {
        nodesModified.push({ name, changes });
      }
    }
  }

  // Generate summary
  const parts: string[] = [];
  if (nodesAdded.length) parts.push(`${nodesAdded.length} node(s) added`);
  if (nodesRemoved.length) parts.push(`${nodesRemoved.length} node(s) removed`);
  if (nodesModified.length) parts.push(`${nodesModified.length} node(s) modified`);
  if (credentialsAdded.length) parts.push(`Credentials connected to ${credentialsAdded.length} node(s)`);

  return {
    nodesAdded,
    nodesRemoved,
    nodesModified,
    credentialsAdded,
    summary: parts.length > 0 ? parts.join(", ") : "No changes detected",
  };
}
