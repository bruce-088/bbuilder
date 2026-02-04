import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExecutionPayload {
  workflowId: string;
  workflowName: string;
  executionId: string;
  status: "running" | "success" | "error" | "waiting";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  errorNode?: string;
  triggerType?: string;
  nodeExecutionCount?: number;
  retryCount?: number;
  executionData?: Record<string, unknown>;
}

serve(async (req: Request) => {
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
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (req.method === "POST" && path === "log") {
      // Log a single execution
      const payload: ExecutionPayload = await req.json();

      const { data, error } = await supabase
        .from("n8n_execution_logs")
        .upsert({
          user_id: user.id,
          workflow_id: payload.workflowId,
          workflow_name: payload.workflowName,
          execution_id: payload.executionId,
          status: payload.status,
          started_at: payload.startedAt,
          finished_at: payload.finishedAt,
          duration_ms: payload.durationMs,
          error_message: payload.errorMessage,
          error_node: payload.errorNode,
          trigger_type: payload.triggerType,
          node_execution_count: payload.nodeExecutionCount || 0,
          retry_count: payload.retryCount || 0,
          execution_data: payload.executionData || {},
        }, { onConflict: "execution_id" })
        .select()
        .single();

      if (error) {
        console.error("Error logging execution:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, execution: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "batch") {
      // Log multiple executions at once
      const { executions }: { executions: ExecutionPayload[] } = await req.json();

      const insertData = executions.map((e) => ({
        user_id: user.id,
        workflow_id: e.workflowId,
        workflow_name: e.workflowName,
        execution_id: e.executionId,
        status: e.status,
        started_at: e.startedAt,
        finished_at: e.finishedAt,
        duration_ms: e.durationMs,
        error_message: e.errorMessage,
        error_node: e.errorNode,
        trigger_type: e.triggerType,
        node_execution_count: e.nodeExecutionCount || 0,
        retry_count: e.retryCount || 0,
        execution_data: e.executionData || {},
      }));

      const { data, error } = await supabase
        .from("n8n_execution_logs")
        .upsert(insertData, { onConflict: "execution_id" })
        .select();

      if (error) {
        console.error("Error batch logging executions:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && path === "stats") {
      // Get workflow stats
      const workflowId = url.searchParams.get("workflowId");

      let query = supabase
        .from("n8n_workflow_stats")
        .select("*");

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching stats:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ stats: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && path === "recent") {
      // Get recent executions
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const workflowId = url.searchParams.get("workflowId");
      const status = url.searchParams.get("status");

      let query = supabase
        .from("n8n_execution_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching executions:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ executions: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in n8n-execution-sync:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
