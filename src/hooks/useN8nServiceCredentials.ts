import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ServiceCredential {
  provider: string;
  hasKey: boolean;
  n8nCredentialId?: string;
}

// Service types that can be used in n8n workflows
export const N8N_SERVICE_TYPES: Record<string, { label: string; placeholder: string; oauth?: boolean }> = {
  slack: { label: "Slack Bot Token", placeholder: "xoxb-..." },
  apollo: { label: "Apollo API Key", placeholder: "apollo_..." },
  googleSheets: { label: "Google Sheets", placeholder: "OAuth (manual)", oauth: true },
  gmail: { label: "Gmail", placeholder: "OAuth (manual)", oauth: true },
  stripe: { label: "Stripe API Key", placeholder: "sk_live_..." },
  sendgrid: { label: "SendGrid API Key", placeholder: "SG...." },
  hubspot: { label: "HubSpot API Key", placeholder: "pat-..." },
  notion: { label: "Notion API Key", placeholder: "secret_..." },
  airtable: { label: "Airtable API Key", placeholder: "pat..." },
  openai: { label: "OpenAI API Key", placeholder: "sk-..." },
  anthropic: { label: "Anthropic API Key", placeholder: "sk-ant-..." },
};

export type N8nServiceType = string;

export function useN8nServiceCredentials(requiredServices: string[]) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<ServiceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch existing credentials for required services
  const fetchCredentials = useCallback(async () => {
    if (!user?.id || requiredServices.length === 0) {
      setCredentials([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("provider, encrypted_key")
        .eq("user_id", user.id)
        .in("provider", requiredServices);

      if (error) throw error;

      const existingProviders = new Set(data?.map(d => d.provider) || []);
      
      const credentialStatus: ServiceCredential[] = requiredServices.map(service => ({
        provider: service,
        hasKey: existingProviders.has(service),
      }));

      setCredentials(credentialStatus);
    } catch (error) {
      console.error("Error fetching service credentials:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, requiredServices]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Save a new service credential
  const saveCredential = async (provider: string, apiKey: string, n8nCredentialId?: string): Promise<boolean> => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      // Check if credential already exists
      const { data: existing } = await supabase
        .from("user_api_keys")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_api_keys")
          .update({ 
            encrypted_key: apiKey,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("user_api_keys")
          .insert({
            user_id: user.id,
            provider,
            encrypted_key: apiKey,
          });

        if (error) throw error;
      }

      toast({
        title: "Credential saved",
        description: `${N8N_SERVICE_TYPES[provider as N8nServiceType]?.label || provider} credential saved securely`,
      });

      // Refresh credentials list
      await fetchCredentials();
      return true;
    } catch (error) {
      console.error("Error saving credential:", error);
      toast({
        title: "Failed to save credential",
        description: "Please try again",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Get credentials that still need to be configured
  const missingCredentials = credentials.filter(c => !c.hasKey);
  const configuredCredentials = credentials.filter(c => c.hasKey);

  return {
    credentials,
    missingCredentials,
    configuredCredentials,
    loading,
    saving,
    saveCredential,
    refresh: fetchCredentials,
  };
}
