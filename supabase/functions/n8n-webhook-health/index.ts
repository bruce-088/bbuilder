import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HealthCheckRequest {
  urls: string[];
}

interface HealthCheckResponse {
  health: Record<string, "healthy" | "unhealthy" | "unknown">;
  checkedAt: string;
}

async function checkWebhookHealth(url: string): Promise<"healthy" | "unhealthy" | "unknown"> {
  try {
    // Use OPTIONS request to check CORS-compatible endpoints
    // or HEAD for simpler checks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: "OPTIONS",
      signal: controller.signal,
      headers: {
        "Accept": "*/*",
      },
    });

    clearTimeout(timeoutId);

    // OPTIONS requests typically return 204 or 200
    // n8n webhooks waiting for data return 200
    if (response.ok || response.status === 204 || response.status === 405) {
      return "healthy";
    }

    // 404 means the webhook path doesn't exist
    if (response.status === 404) {
      return "unhealthy";
    }

    // Other errors - try a GET as fallback
    return "unknown";
  } catch (error) {
    if (error instanceof Error) {
      // Network errors, timeouts, CORS blocks
      if (error.name === "AbortError") {
        return "unhealthy"; // Timeout means unhealthy
      }
      // CORS errors in Deno throw TypeError
      if (error.name === "TypeError" && error.message.includes("network")) {
        return "unknown"; // Can't determine due to CORS
      }
    }
    return "unknown";
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls }: HealthCheckRequest = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return new Response(
        JSON.stringify({ error: "urls array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Limit to 10 URLs per request to prevent abuse
    const urlsToCheck = urls.slice(0, 10);

    // Check all webhooks in parallel with rate limiting
    const healthResults = await Promise.all(
      urlsToCheck.map(async (url) => {
        const health = await checkWebhookHealth(url);
        return [url, health] as const;
      })
    );

    const health: Record<string, "healthy" | "unhealthy" | "unknown"> = {};
    for (const [url, status] of healthResults) {
      health[url] = status;
    }

    const response: HealthCheckResponse = {
      health,
      checkedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in webhook health check:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
