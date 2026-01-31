import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VerificationData } from "@/lib/verificationPromptGenerator";

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

// Phase to node type mapping for knowledge base lookups
const PHASE_NODE_MAPPINGS: Record<string, string[]> = {
  "lead prospecting": ["n8n-nodes-base.httpRequest", "n8n-nodes-base.googleSheets", "n8n-nodes-base.spreadsheet"],
  "prospecting": ["n8n-nodes-base.httpRequest", "n8n-nodes-base.googleSheets"],
  "outreach": ["n8n-nodes-base.gmail", "n8n-nodes-base.emailSend", "@n8n/n8n-nodes-langchain.openAi"],
  "email": ["n8n-nodes-base.gmail", "n8n-nodes-base.emailSend"],
  "qualification": ["n8n-nodes-base.webhook", "@n8n/n8n-nodes-langchain.openAi", "n8n-nodes-base.if"],
  "proposal": ["n8n-nodes-base.googleDocs", "n8n-nodes-base.pdf", "n8n-nodes-base.gmail"],
  "closing": ["n8n-nodes-base.stripe", "n8n-nodes-base.httpRequest", "n8n-nodes-base.googleDocs"],
  "deal": ["n8n-nodes-base.stripe", "n8n-nodes-base.httpRequest"],
  "setup": ["n8n-nodes-base.manualTrigger", "n8n-nodes-base.scheduleTrigger"],
  "deploy": ["n8n-nodes-base.webhook", "n8n-nodes-base.scheduleTrigger"],
};

// Generate enhanced verification data from knowledge base entries
export function generateVerificationDataFromKnowledgeBase(
  entries: FixKnowledgeEntry[],
  phase: string,
  fallbackDescription: string
): VerificationData {
  const phaseLower = phase.toLowerCase();
  
  // Extract unique actions and indicators from successful fixes
  const automatedActions: string[] = [];
  const successIndicators: string[] = [
    "Workflow executes without errors",
    "Expected output data appears",
    `${phase} phase shows as complete`
  ];
  const failureIndicators: string[] = [
    "Error indicators on nodes",
    "Workflow fails to execute"
  ];

  // Learn from past successful fixes
  entries.forEach((entry) => {
    if (entry.solution_summary && !automatedActions.includes(entry.solution_summary)) {
      automatedActions.push(entry.solution_summary);
    }
    
    // Extract specific indicators based on node type
    if (entry.node_type.includes("httpRequest")) {
      if (!failureIndicators.includes("401 Unauthorized or 403 Forbidden response")) {
        failureIndicators.push("401 Unauthorized or 403 Forbidden response");
      }
      if (!successIndicators.includes("API returns 200 OK with expected data")) {
        successIndicators.push("API returns 200 OK with expected data");
      }
    }
    
    if (entry.node_type.includes("gmail") || entry.node_type.includes("email")) {
      if (!failureIndicators.includes("OAuth token expired or revoked")) {
        failureIndicators.push("OAuth token expired or revoked");
      }
      if (!successIndicators.includes("Email sends successfully (check sent folder)")) {
        successIndicators.push("Email sends successfully (check sent folder)");
      }
    }
    
    if (entry.node_type.includes("googleSheets")) {
      if (!failureIndicators.includes("Sheet not found or permission denied")) {
        failureIndicators.push("Sheet not found or permission denied");
      }
      if (!successIndicators.includes("Data appears in correct spreadsheet columns")) {
        successIndicators.push("Data appears in correct spreadsheet columns");
      }
    }
    
    if (entry.node_type.includes("openAi") || entry.node_type.includes("langchain")) {
      if (!failureIndicators.includes("OpenAI API key invalid or quota exceeded")) {
        failureIndicators.push("OpenAI API key invalid or quota exceeded");
      }
      if (!successIndicators.includes("AI generates expected response format")) {
        successIndicators.push("AI generates expected response format");
      }
    }
    
    if (entry.node_type.includes("webhook")) {
      if (!failureIndicators.includes("Webhook URL not accessible externally")) {
        failureIndicators.push("Webhook URL not accessible externally");
      }
      if (!successIndicators.includes("Webhook receives and processes test payload")) {
        successIndicators.push("Webhook receives and processes test payload");
      }
    }
  });

  // Add phase-specific indicators
  if (phaseLower.includes("prospect") || phaseLower.includes("lead")) {
    if (!successIndicators.includes("Lead data appears in tracking sheet")) {
      successIndicators.push("Lead data appears in tracking sheet");
    }
    if (!failureIndicators.includes("Apollo.io/Hunter.io API credentials missing")) {
      failureIndicators.push("Apollo.io/Hunter.io API credentials missing");
    }
  }
  
  if (phaseLower.includes("outreach")) {
    if (!successIndicators.includes("Personalized email content generated")) {
      successIndicators.push("Personalized email content generated");
    }
  }
  
  if (phaseLower.includes("qualif")) {
    if (!successIndicators.includes("Lead score calculated correctly")) {
      successIndicators.push("Lead score calculated correctly");
    }
  }

  // Build check description from knowledge base or fallback
  const topFix = entries.find(e => e.success_count >= 2);
  const checkDescription = topFix?.root_cause 
    ? `Verify fix for: ${topFix.root_cause}`
    : fallbackDescription;

  return {
    checkDescription,
    automatedActions: automatedActions.length > 0 ? automatedActions : [fallbackDescription],
    successIndicators,
    failureIndicators
  };
}

export function useFixKnowledgeBase() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Find fixes by phase name (maps to related node types)
  const findFixesByPhase = useCallback(async (phase: string): Promise<FixKnowledgeEntry[]> => {
    setIsLoading(true);
    try {
      const phaseLower = phase.toLowerCase();
      
      // Find matching node types for this phase
      let nodeTypes: string[] = [];
      for (const [key, types] of Object.entries(PHASE_NODE_MAPPINGS)) {
        if (phaseLower.includes(key)) {
          nodeTypes = [...nodeTypes, ...types];
        }
      }
      
      // Remove duplicates
      nodeTypes = [...new Set(nodeTypes)];
      
      if (nodeTypes.length === 0) {
        // Fallback: search by issue_type containing phase name
        const { data, error } = await supabase
          .from("fix_knowledge_base")
          .select("*")
          .ilike("issue_type", `%${phaseLower}%`)
          .order("success_count", { ascending: false })
          .limit(10);
        
        if (error) throw error;
        return (data || []) as FixKnowledgeEntry[];
      }
      
      // Query for all matching node types
      const { data, error } = await supabase
        .from("fix_knowledge_base")
        .select("*")
        .in("node_type", nodeTypes)
        .order("success_count", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []) as FixKnowledgeEntry[];
    } catch (error) {
      console.error("Error finding fixes by phase:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get verification data enhanced with knowledge base entries
  const getEnhancedVerificationData = useCallback(async (
    phase: string,
    fallbackDescription: string
  ): Promise<VerificationData> => {
    const entries = await findFixesByPhase(phase);
    return generateVerificationDataFromKnowledgeBase(entries, phase, fallbackDescription);
  }, [findFixesByPhase]);

  return {
    saveSuccessfulFix,
    findSimilarFixes,
    findFixesByPhase,
    getEnhancedVerificationData,
    generateVerificationDataFromKnowledgeBase,
    isSaving,
    isLoading,
  };
}
