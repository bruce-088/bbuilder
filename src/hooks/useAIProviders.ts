import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AIProvider = "lovable" | "openai" | "claude" | "perplexity" | "gemini";

export interface ProviderStatus {
  id: AIProvider;
  name: string;
  description: string;
  configured: boolean;
  available: boolean;
}

interface UserAIPreferences {
  preferred_provider: string | null;
  openai_configured: boolean | null;
  claude_configured: boolean | null;
  perplexity_configured: boolean | null;
  gemini_configured: boolean | null;
}

export function useAIProviders() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<AIProvider | null>(null);
  const [preferences, setPreferences] = useState<UserAIPreferences | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([
    { id: "lovable", name: "Lovable AI", description: "Default - Fast & reliable", configured: true, available: true },
    { id: "openai", name: "OpenAI GPT-5", description: "Advanced reasoning", configured: false, available: false },
    { id: "claude", name: "Claude", description: "Complex multi-step tasks", configured: false, available: false },
    { id: "perplexity", name: "Perplexity", description: "Real-time web research", configured: false, available: false },
    { id: "gemini", name: "Gemini", description: "Google's multimodal AI", configured: false, available: false },
  ]);

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_ai_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading AI preferences:", error);
        return;
      }

      if (data) {
        setPreferences(data);
        setProviders((prev) =>
          prev.map((p) => {
            if (p.id === "openai") {
              return { ...p, configured: data.openai_configured || false, available: data.openai_configured || false };
            }
            if (p.id === "claude") {
              return { ...p, configured: data.claude_configured || false, available: data.claude_configured || false };
            }
            if (p.id === "perplexity") {
              return { ...p, configured: data.perplexity_configured || false, available: data.perplexity_configured || false };
            }
            if (p.id === "gemini") {
              return { ...p, configured: data.gemini_configured || false, available: data.gemini_configured || false };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error("Error loading preferences:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const saveApiKey = async (provider: "openai" | "claude" | "perplexity" | "gemini", apiKey: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to save API keys");
      return false;
    }

    setSaving(true);
    try {
      // First, test the API key
      const testResult = await testApiKey(provider, apiKey);
      if (!testResult) {
        return false;
      }

      // Save/update the key in user_api_keys
      const { error: keyError } = await supabase
        .from("user_api_keys")
        .upsert(
          {
            user_id: user.id,
            provider,
            encrypted_key: apiKey, // Note: In production, encrypt before storing
          },
          { onConflict: "user_id,provider" }
        );

      if (keyError) {
        console.error("Error saving API key:", keyError);
        toast.error("Failed to save API key");
        return false;
      }

      // Update user_ai_preferences
      const updateField = 
        provider === "openai" ? "openai_configured" : 
        provider === "claude" ? "claude_configured" : 
        provider === "gemini" ? "gemini_configured" :
        "perplexity_configured";
      const { error: prefError } = await supabase
        .from("user_ai_preferences")
        .upsert(
          {
            user_id: user.id,
            [updateField]: true,
          },
          { onConflict: "user_id" }
        );

      if (prefError) {
        console.error("Error updating preferences:", prefError);
      }

      // Update local state
      setProviders((prev) =>
        prev.map((p) => (p.id === provider ? { ...p, configured: true, available: true } : p))
      );

      const providerName = 
        provider === "openai" ? "OpenAI" : 
        provider === "claude" ? "Claude" : 
        provider === "gemini" ? "Gemini" :
        "Perplexity";
      toast.success(`${providerName} connected successfully!`);
      return true;
    } catch (err) {
      console.error("Error saving API key:", err);
      toast.error("Failed to save API key");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async (provider: "openai" | "claude" | "perplexity" | "gemini", apiKey: string): Promise<boolean> => {
    setTesting(provider);
    try {
      const response = await supabase.functions.invoke("validate-api-key", {
        body: { provider, apiKey },
      });

      if (response.error) {
        toast.error(`Invalid ${provider === "openai" ? "OpenAI" : "Claude"} API key`);
        return false;
      }

      const data = response.data as { valid: boolean; error?: string };
      const providerName = 
        provider === "openai" ? "OpenAI" : 
        provider === "claude" ? "Claude" : 
        provider === "gemini" ? "Gemini" :
        "Perplexity";
      if (!data.valid) {
        toast.error(data.error || `Invalid ${providerName} API key`);
        return false;
      }

      toast.success("API key validated successfully!");
      return true;
    } catch (err) {
      console.error("Error testing API key:", err);
      toast.error("Failed to validate API key");
      return false;
    } finally {
      setTesting(null);
    }
  };

  const removeApiKey = async (provider: "openai" | "claude" | "perplexity" | "gemini"): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);
    try {
      // Remove from user_api_keys
      const { error: keyError } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (keyError) {
        console.error("Error removing API key:", keyError);
        toast.error("Failed to remove API key");
        return false;
      }

      // Update preferences
      const updateField = 
        provider === "openai" ? "openai_configured" : 
        provider === "claude" ? "claude_configured" : 
        provider === "gemini" ? "gemini_configured" :
        "perplexity_configured";
      await supabase
        .from("user_ai_preferences")
        .update({ [updateField]: false })
        .eq("user_id", user.id);

      // Update local state
      setProviders((prev) =>
        prev.map((p) => (p.id === provider ? { ...p, configured: false, available: false } : p))
      );

      const providerName = 
        provider === "openai" ? "OpenAI" : 
        provider === "claude" ? "Claude" : 
        provider === "gemini" ? "Gemini" :
        "Perplexity";
      toast.success(`${providerName} disconnected`);
      return true;
    } catch (err) {
      console.error("Error removing API key:", err);
      toast.error("Failed to remove API key");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getApiKey = async (provider: "openai" | "claude" | "perplexity" | "gemini"): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("encrypted_key")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .maybeSingle();

      if (error || !data) return null;
      return data.encrypted_key;
    } catch {
      return null;
    }
  };

  return {
    loading,
    saving,
    testing,
    providers,
    preferences,
    saveApiKey,
    testApiKey,
    removeApiKey,
    getApiKey,
    refresh: loadPreferences,
  };
}
