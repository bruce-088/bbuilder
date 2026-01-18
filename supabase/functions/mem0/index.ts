import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MEM0_API_KEY = Deno.env.get("MEM0_API_KEY");

    if (!MEM0_API_KEY) {
      console.error("MEM0_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Memory service not configured", memories: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, userId, messages, query } = await req.json();
    console.log(`Mem0 action: ${action} for user: ${userId}`);

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
          user_id: userId,
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
          user_id: userId,
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
      const response = await fetch(`${baseUrl}/memories/?user_id=${userId}`, {
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
