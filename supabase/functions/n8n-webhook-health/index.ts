import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HealthCheckRequest {
  urls: string[];
}

interface WebhookTestRequest {
  url: string;
  method?: "GET" | "POST" | "PUT";
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface HealthCheckResponse {
  health: Record<string, "healthy" | "unhealthy" | "unknown">;
  checkedAt: string;
}

interface WebhookTestResponse {
  success: boolean;
  status: number;
  statusText: string;
  body: string;
  headers: Record<string, string>;
  latencyMs: number;
  testedAt: string;
}

async function checkWebhookHealth(url: string): Promise<"healthy" | "unhealthy" | "unknown"> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "OPTIONS",
      signal: controller.signal,
      headers: {
        "Accept": "*/*",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 204 || response.status === 405) {
      return "healthy";
    }

    if (response.status === 404) {
      return "unhealthy";
    }

    return "unknown";
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return "unhealthy";
      }
      if (error.name === "TypeError" && error.message.includes("network")) {
        return "unknown";
      }
    }
    return "unknown";
  }
}

async function testWebhook(request: WebhookTestRequest): Promise<WebhookTestResponse> {
  const startTime = Date.now();
  const method = request.method || "POST";
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for tests

    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(request.headers || {}),
      },
    };

    // Add body for POST/PUT requests
    if ((method === "POST" || method === "PUT") && request.payload) {
      fetchOptions.body = JSON.stringify(request.payload);
    }

    const response = await fetch(request.url, fetchOptions);
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    // Read response body
    let body = "";
    try {
      body = await response.text();
      // Try to parse as JSON and re-stringify for formatting
      const jsonBody = JSON.parse(body);
      body = JSON.stringify(jsonBody, null, 2);
    } catch {
      // Keep as plain text if not JSON
    }

    // Extract response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: body.slice(0, 5000), // Limit body size
      headers,
      latencyMs,
      testedAt: new Date().toISOString(),
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    let errorMessage = "Unknown error";
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timed out after 15 seconds";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      status: 0,
      statusText: "Error",
      body: errorMessage,
      headers: {},
      latencyMs,
      testedAt: new Date().toISOString(),
    };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Route 1: Health check (existing functionality)
    if (body.urls && Array.isArray(body.urls)) {
      const urlsToCheck = body.urls.slice(0, 10);

      const healthResults = await Promise.all(
        urlsToCheck.map(async (url: string) => {
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
    }

    // Route 2: Webhook test (new functionality)
    if (body.test && body.url) {
      const testRequest: WebhookTestRequest = {
        url: body.url,
        method: body.method || "POST",
        payload: body.payload || { test: true, timestamp: new Date().toISOString(), source: "lovable-automation" },
        headers: body.headers,
      };

      const result = await testWebhook(testRequest);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid request. Provide 'urls' array for health check or 'test: true' with 'url' for webhook test." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
