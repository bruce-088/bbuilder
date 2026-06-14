import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Validation schemas
const MAX_CONTENT_CHARS = 50000;
const MemoryMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).transform((s) => (s.length > MAX_CONTENT_CHARS ? s.slice(0, MAX_CONTENT_CHARS) : s)),
});

const Mem0RequestSchema = z.object({
  action: z.enum(["add", "search", "getAll"]),
  userId: z.string().uuid().optional(),
  messages: z.array(MemoryMessageSchema).max(50).optional(),
  query: z.string().max(50000).optional(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required", memories: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", memories: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MEM0_API_KEY = Deno.env.get("MEM0_API_KEY");

    if (!MEM0_API_KEY) {
      console.error("MEM0_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Memory service not configured", memories: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate request body
    const rawBody = await req.json();
    const parseResult = Mem0RequestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid request format", details: parseResult.error.errors.map(e => e.message), memories: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, userId, messages, query } = parseResult.data;
    
    // Validate that the requested userId matches the authenticated user
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "Access denied", memories: [] }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveUserId = userId || user.id;
    console.log(`Mem0 action: ${action} for user: ${effectiveUserId}`);

    const baseUrl = "https://api.mem0.ai/v1";

    if (action === "add") {
      // Add memories
      const response = await fetch(`${baseUrl}/memories/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${MEM0_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          user_id: effectiveUserId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Mem0 add error:", response.status, errorText);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to add memories" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("Memories added:", data);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      // Search memories
      const response = await fetch(`${baseUrl}/memories/search/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${MEM0_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          user_id: effectiveUserId,
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Mem0 search error:", response.status, errorText);
        return new Response(
          JSON.stringify({ memories: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("Search results:", data);
      return new Response(
        JSON.stringify({ memories: data.results || data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "getAll") {
      // Get all memories for user
      const response = await fetch(`${baseUrl}/memories/?user_id=${effectiveUserId}`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${MEM0_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Mem0 getAll error:", response.status, errorText);
        return new Response(
          JSON.stringify({ memories: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("All memories:", data);
      return new Response(
        JSON.stringify({ memories: data.results || data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mem0 function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred", memories: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
