import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FixKnowledgeEntry {
  id: string;
  user_id: string;
  node_type: string;
  issue_type: string;
  fix_prompt: string;
  root_cause?: string;
  solution_summary?: string;
  workflow_name?: string;
  success_count: number;
  created_at: string;
  updated_at: string;
}

interface SaveFixParams {
  nodeType: string;
  issueType: string;
  fixPrompt: string;
  rootCause?: string;
  solutionSummary?: string;
  workflowName?: string;
}

export function useFixKnowledgeBase() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveSuccessfulFix = async (params: SaveFixParams): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to save fixes");
      return false;
    }

    setIsSaving(true);

    try {
      // Check if a similar fix already exists
      const { data: existing } = await supabase
        .from("fix_knowledge_base")
        .select("id, success_count")
        .eq("node_type", params.nodeType)
        .eq("issue_type", params.issueType)
        .maybeSingle();

      if (existing) {
        // Increment success count for existing fix
        const { error } = await supabase
          .from("fix_knowledge_base")
          .update({ 
            success_count: existing.success_count + 1,
            fix_prompt: params.fixPrompt, // Update with latest prompt
            root_cause: params.rootCause,
            solution_summary: params.solutionSummary,
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("Fix updated in knowledge base!");
      } else {
        // Insert new fix
        const { error } = await supabase
          .from("fix_knowledge_base")
          .insert({
            user_id: user.id,
            node_type: params.nodeType,
            issue_type: params.issueType,
            fix_prompt: params.fixPrompt,
            root_cause: params.rootCause,
            solution_summary: params.solutionSummary,
            workflow_name: params.workflowName,
          });

        if (error) throw error;
        toast.success("Fix saved to knowledge base!");
      }

      return true;
    } catch (error) {
      console.error("Error saving fix:", error);
      toast.error("Failed to save fix");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const findSimilarFixes = async (nodeType: string): Promise<FixKnowledgeEntry[]> => {
    try {
      const { data, error } = await supabase
        .from("fix_knowledge_base")
        .select("*")
        .eq("node_type", nodeType)
        .order("success_count", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as FixKnowledgeEntry[];
    } catch (error) {
      console.error("Error finding similar fixes:", error);
      return [];
    }
  };

  return {
    saveSuccessfulFix,
    findSimilarFixes,
    isSaving,
  };
}
