import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CompetitorAnalysis {
  id: string;
  competitor_name: string;
  pricing_info: any;
  features: string[];
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  recent_news: any;
  source_urls: string[];
  analyzed_at: string;
}

interface DifferentiationStrategy {
  id: string;
  strategy_type: string;
  recommendation: string;
  confidence_score: number;
  supporting_data: any;
  created_at: string;
}

interface UseCompetitorAnalysisOptions {
  businessIdeaId?: string;
  autoLoad?: boolean;
}

export function useCompetitorAnalysis(options: UseCompetitorAnalysisOptions = {}) {
  const { businessIdeaId, autoLoad = true } = options;
  const { user } = useAuth();
  
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([]);
  const [strategies, setStrategies] = useState<DifferentiationStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Load existing analyses from database
  const loadAnalyses = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [compResult, stratResult] = await Promise.all([
        supabase
          .from("competitor_analyses")
          .select("*")
          .eq("user_id", user.id)
          .eq(businessIdeaId ? "business_idea_id" : "id", businessIdeaId || "")
          .order("analyzed_at", { ascending: false }),
        supabase
          .from("differentiation_strategies")
          .select("*")
          .eq("user_id", user.id)
          .eq(businessIdeaId ? "business_idea_id" : "id", businessIdeaId || "")
          .order("confidence_score", { ascending: false }),
      ]);

      if (compResult.data) {
        setCompetitors(compResult.data as unknown as CompetitorAnalysis[]);
      }
      if (stratResult.data) {
        setStrategies(stratResult.data as unknown as DifferentiationStrategy[]);
      }
    } catch (error) {
      console.error("Error loading competitor analyses:", error);
    } finally {
      setLoading(false);
    }
  }, [user, businessIdeaId]);

  // Run new analysis
  const runAnalysis = useCallback(async (
    competitorNames: string[], 
    niche?: string
  ) => {
    if (!user) {
      toast.error("Please sign in to run competitor analysis");
      return null;
    }

    if (!competitorNames || competitorNames.length === 0) {
      toast.error("Please provide at least one competitor name");
      return null;
    }

    setAnalyzing(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("competitor-analysis", {
        body: {
          businessIdeaId,
          competitors: competitorNames,
          niche,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Analysis failed");
      }

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      // Reload from database to get properly typed data
      await loadAnalyses();
      
      toast.success(`Analyzed ${result.competitors?.length || 0} competitors`);
      return result;
      
    } catch (error: any) {
      console.error("Error running competitor analysis:", error);
      toast.error(error.message || "Failed to analyze competitors");
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [user, businessIdeaId, loadAnalyses]);

  // Add a single competitor
  const addCompetitor = useCallback(async (name: string, niche?: string) => {
    return runAnalysis([name], niche);
  }, [runAnalysis]);

  // Remove a competitor analysis
  const removeCompetitor = useCallback(async (competitorId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("competitor_analyses")
        .delete()
        .eq("id", competitorId)
        .eq("user_id", user.id);

      if (error) throw error;

      setCompetitors(prev => prev.filter(c => c.id !== competitorId));
      toast.success("Competitor removed");
      return true;
    } catch (error) {
      console.error("Error removing competitor:", error);
      toast.error("Failed to remove competitor");
      return false;
    }
  }, [user]);

  // Clear all analyses
  const clearAllAnalyses = useCallback(async () => {
    if (!user) return false;

    try {
      await Promise.all([
        supabase
          .from("competitor_analyses")
          .delete()
          .eq("user_id", user.id),
        supabase
          .from("differentiation_strategies")
          .delete()
          .eq("user_id", user.id),
      ]);

      setCompetitors([]);
      setStrategies([]);
      toast.success("All analyses cleared");
      return true;
    } catch (error) {
      console.error("Error clearing analyses:", error);
      toast.error("Failed to clear analyses");
      return false;
    }
  }, [user]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadAnalyses();
    }
  }, [autoLoad, user, loadAnalyses]);

  return {
    competitors,
    strategies,
    loading,
    analyzing,
    runAnalysis,
    addCompetitor,
    removeCompetitor,
    clearAllAnalyses,
    refresh: loadAnalyses,
  };
}
