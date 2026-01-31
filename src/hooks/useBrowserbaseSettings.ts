import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoredContext {
  url: string;
  contextId: string;
}

interface BrowserbaseSettingsState {
  contexts: StoredContext[];
  credentialsConfigured: boolean | null;
  loading: boolean;
  error: string | null;
}

export function useBrowserbaseSettings() {
  const [state, setState] = useState<BrowserbaseSettingsState>({
    contexts: [],
    credentialsConfigured: null,
    loading: true,
    error: null,
  });

  // Get all stored contexts from localStorage
  const getAllStoredContexts = useCallback((): StoredContext[] => {
    const contexts: StoredContext[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("browserbase_context_")) {
          const url = key.replace("browserbase_context_", "");
          const contextId = localStorage.getItem(key);
          if (contextId) {
            contexts.push({ url, contextId });
          }
        }
      }
    } catch (err) {
      console.error("Error reading localStorage:", err);
    }
    return contexts;
  }, []);

  // Check if credentials are configured by calling the edge function
  const checkCredentials = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "browserbase-automation",
        {
          body: { action: "check-credentials" },
        }
      );

      if (error) {
        // If the function returns an error about missing credentials, that's our signal
        if (error.message?.includes("credentials")) {
          return false;
        }
        throw error;
      }

      return data?.credentialsConfigured ?? false;
    } catch (err) {
      console.error("Error checking Browserbase credentials:", err);
      return false;
    }
  }, []);

  // Clear a specific context
  const clearContext = useCallback((url: string) => {
    try {
      localStorage.removeItem(`browserbase_context_${url}`);
      setState((prev) => ({
        ...prev,
        contexts: prev.contexts.filter((c) => c.url !== url),
      }));
      return true;
    } catch (err) {
      console.error("Error clearing context:", err);
      return false;
    }
  }, []);

  // Clear all contexts
  const clearAllContexts = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("browserbase_context_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      setState((prev) => ({
        ...prev,
        contexts: [],
      }));
      return true;
    } catch (err) {
      console.error("Error clearing all contexts:", err);
      return false;
    }
  }, []);

  // Refresh contexts from localStorage
  const refreshContexts = useCallback(() => {
    const contexts = getAllStoredContexts();
    setState((prev) => ({
      ...prev,
      contexts,
    }));
  }, [getAllStoredContexts]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [contexts, credentialsConfigured] = await Promise.all([
          Promise.resolve(getAllStoredContexts()),
          checkCredentials(),
        ]);
        setState({
          contexts,
          credentialsConfigured,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    };
    init();
  }, [getAllStoredContexts, checkCredentials]);

  return {
    ...state,
    clearContext,
    clearAllContexts,
    refreshContexts,
    checkCredentials: async () => {
      const result = await checkCredentials();
      setState((prev) => ({ ...prev, credentialsConfigured: result }));
      return result;
    },
  };
}
