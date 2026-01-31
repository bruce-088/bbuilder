import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ValidateRequest {
  provider: "openai" | "claude" | "perplexity" | "gemini";
  apiKey: string;
}

async function validateOpenAI(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    const errorText = await response.text();
    return { valid: false, error: `OpenAI API error: ${errorText}` };
  } catch (err) {
    console.error("OpenAI validation error:", err);
    return { valid: false, error: "Failed to connect to OpenAI" };
  }
}

async function validateClaude(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Claude doesn't have a lightweight endpoint, so we'll make a minimal completion request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    return { 
      valid: false, 
      error: errorData.error?.message || `Claude API error: ${response.status}` 
    };
  } catch (err) {
    console.error("Claude validation error:", err);
    return { valid: false, error: "Failed to connect to Claude" };
  }
}

async function validatePerplexity(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1,
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    return { 
      valid: false, 
      error: errorData.error?.message || `Perplexity API error: ${response.status}` 
    };
  } catch (err) {
    console.error("Perplexity validation error:", err);
    return { valid: false, error: "Failed to connect to Perplexity" };
  }
}

async function validateGemini(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hi" }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    return { 
      valid: false, 
      error: errorData.error?.message || `Gemini API error: ${response.status}` 
    };
  } catch (err) {
    console.error("Gemini validation error:", err);
    return { valid: false, error: "Failed to connect to Gemini" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ValidateRequest = await req.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing provider or apiKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: { valid: boolean; error?: string };

    switch (provider) {
      case "openai":
        result = await validateOpenAI(apiKey);
        break;
      case "claude":
        result = await validateClaude(apiKey);
        break;
      case "perplexity":
        result = await validatePerplexity(apiKey);
        break;
      case "gemini":
        result = await validateGemini(apiKey);
        break;
      default:
        result = { valid: false, error: `Unknown provider: ${provider}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Validation error:", err);
    return new Response(
      JSON.stringify({ valid: false, error: "Validation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
