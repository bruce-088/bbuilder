import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPreferences {
  id: string;
  user_id: string;
  n8n_instance_url: string | null;
  n8n_hosting_type: string | null;
  n8n_workflow_path: string | null;
  preferred_fix_method: string;
  auto_expand_details: boolean;
  auto_deploy_workflows: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Partial<UserPreferences> = {
  preferred_fix_method: "mya",
  auto_expand_details: true,
  auto_deploy_workflows: false,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching preferences:", error);
      }

      if (data) {
        setPreferences(data as unknown as UserPreferences);
        // Sync to localStorage for offline access
        syncToLocalStorage(data as unknown as UserPreferences);
      } else {
        // Create default preferences
        const created = await createDefaultPreferences();
        if (created) {
          setPreferences(created);
        }
      }
    } catch (error) {
      console.error("Error in fetchPreferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Sync preferences to localStorage
  const syncToLocalStorage = (prefs: UserPreferences) => {
    if (prefs.n8n_instance_url) {
      localStorage.setItem("n8n_instance_url", prefs.n8n_instance_url);
    }
    if (prefs.n8n_hosting_type) {
      localStorage.setItem("n8n_hosting_type", prefs.n8n_hosting_type);
    }
    if (prefs.n8n_workflow_path) {
      localStorage.setItem("n8n_workflow_path", prefs.n8n_workflow_path);
    }
  };

  // Create default preferences
  const createDefaultPreferences = async (): Promise<UserPreferences | null> => {
    if (!user) return null;

    // Check localStorage for existing values
    const n8nUrl = localStorage.getItem("n8n_instance_url");
    const n8nHostingType = localStorage.getItem("n8n_hosting_type");
    const n8nWorkflowPath = localStorage.getItem("n8n_workflow_path");

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .insert([{
          user_id: user.id,
          n8n_instance_url: n8nUrl,
          n8n_hosting_type: n8nHostingType,
          n8n_workflow_path: n8nWorkflowPath,
          preferred_fix_method: DEFAULT_PREFERENCES.preferred_fix_method,
          auto_expand_details: DEFAULT_PREFERENCES.auto_expand_details,
          auto_deploy_workflows: DEFAULT_PREFERENCES.auto_deploy_workflows,
        }])
        .select()
        .single();
      if (error) {
        console.error("Error creating preferences:", error);
        return null;
      }

      return data as unknown as UserPreferences;
    } catch (error) {
      console.error("Error in createDefaultPreferences:", error);
      return null;
    }
  };

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>): Promise<boolean> => {
      if (!user || !preferences) return false;

      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .update(updates as Record<string, unknown>)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating preferences:", error);
          return false;
        }

        const updatedPrefs = data as unknown as UserPreferences;
        setPreferences(updatedPrefs);
        syncToLocalStorage(updatedPrefs);
        return true;
      } catch (error) {
        console.error("Error in updatePreferences:", error);
        return false;
      }
    },
    [user, preferences]
  );

  // Convenience methods
  const setN8nConfig = useCallback(
    async (instanceUrl: string, hostingType?: string, workflowPath?: string) => {
      // Also update localStorage immediately
      if (instanceUrl) localStorage.setItem("n8n_instance_url", instanceUrl);
      if (hostingType) localStorage.setItem("n8n_hosting_type", hostingType);
      if (workflowPath) localStorage.setItem("n8n_workflow_path", workflowPath);

      return updatePreferences({
        n8n_instance_url: instanceUrl,
        n8n_hosting_type: hostingType || null,
        n8n_workflow_path: workflowPath || null,
      });
    },
    [updatePreferences]
  );

  const setAutoDeployWorkflows = useCallback(
    (enabled: boolean) => updatePreferences({ auto_deploy_workflows: enabled }),
    [updatePreferences]
  );

  const setAutoExpandDetails = useCallback(
    (enabled: boolean) => {
      // Also store in localStorage for components that check before auth
      localStorage.setItem("mya_auto_expand_details", enabled ? "true" : "false");
      return updatePreferences({ auto_expand_details: enabled });
    },
    [updatePreferences]
  );

  const setPreferredFixMethod = useCallback(
    (method: string) => updatePreferences({ preferred_fix_method: method }),
    [updatePreferences]
  );

  const markOnboardingComplete = useCallback(
    () => updatePreferences({ onboarding_completed_at: new Date().toISOString() }),
    [updatePreferences]
  );

  // Initial fetch
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    setN8nConfig,
    setAutoDeployWorkflows,
    setAutoExpandDetails,
    setPreferredFixMethod,
    markOnboardingComplete,
    refetch: fetchPreferences,
  };
}
