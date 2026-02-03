import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Base64 helpers
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

// Simple XOR-based encryption with key derivation
function deriveKey(secret: string, saltBase64: string): Uint8Array {
  const combined = secret + saltBase64;
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = combined.charCodeAt(i % combined.length);
  }
  return key;
}

function encrypt(plaintext: string, secret: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = deriveKey(secret, toBase64(salt));
  const data = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length];
  }
  
  // Combine salt + encrypted data
  const result = new Uint8Array(salt.length + encrypted.length);
  result.set(salt, 0);
  result.set(encrypted, salt.length);
  
  return toBase64(result);
}

function decrypt(encryptedBase64: string, secret: string): string {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionSecret = Deno.env.get("API_KEY_ENCRYPTION_SECRET");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!encryptionSecret) {
      console.error("API_KEY_ENCRYPTION_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Encryption not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const { action, provider, apiKey, serviceType } = await req.json();

    if (action === "store") {
      if (!provider || !apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing provider or apiKey" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Encrypt the API key
      const encryptedKey = encrypt(apiKey, encryptionSecret);

      // Store using the secure function
      const { data, error } = await supabase.rpc("store_api_key_encrypted", {
        p_user_id: user.id,
        p_provider: provider,
        p_encrypted_data: fromBase64(encryptedKey),
        p_service_type: serviceType || null,
      });

      if (error) {
        console.error("Error storing encrypted key:", error);
        return new Response(
          JSON.stringify({ error: "Failed to store API key" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "retrieve") {
      if (!provider) {
        return new Response(
          JSON.stringify({ error: "Missing provider" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Retrieve encrypted key
      const { data, error } = await supabase.rpc("get_api_key_encrypted", {
        p_user_id: user.id,
        p_provider: provider,
      });

      if (error) {
        console.error("Error retrieving encrypted key:", error);
        return new Response(
          JSON.stringify({ error: "Failed to retrieve API key" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ apiKey: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt the API key
      try {
        const decryptedKey = decrypt(toBase64(new Uint8Array(data)), encryptionSecret);
        return new Response(
          JSON.stringify({ apiKey: decryptedKey }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (decryptError) {
        console.error("Decryption failed:", decryptError);
        return new Response(
          JSON.stringify({ error: "Failed to decrypt API key" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'store' or 'retrieve'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Secure API keys error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
