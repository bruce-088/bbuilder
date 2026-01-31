import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PhaseResult {
  phase: string;
  status: "success" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface AutomationPhase {
  id: string;
  name: string;
  description: string;
}

export interface AutomationRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  currentPhase: string | null;
  phasesCompleted: string[];
  phaseLogs: PhaseResult[];
  errors: Array<{ phase: string; message: string }>;
  aiProvider: string;
  createdAt: string;
  completedAt: string | null;
}

export interface AIFix {
  phase: string;
  rootCause: string;
  solution: string;
  steps: string[];
  prevention: string;
  confidence: "high" | "medium" | "low";
  automatable: boolean;
  automationMethod?: "workflow_json" | "api_call" | "none";
  workflowPatch?: Record<string, unknown>;
  requiredUserAction?: string;
}

export interface ExecuteFixResult {
  success: boolean;
  message: string;
  updatedWorkflowJson?: object;
  importUrl?: string;
}

interface UseAutomationRunReturn {
  run: AutomationRun | null;
  isRunning: boolean;
  currentPhase: string | null;
  phaseResults: PhaseResult[];
  startAutomation: (businessIdeaId: string, aiProvider?: string) => Promise<void>;
  applyAIFixes: (businessIdeaId: string, exceptions: PhaseResult[], aiProvider?: string) => Promise<PhaseResult | null>;
  executeAIFix: (businessIdeaId: string, fix: AIFix, aiProvider?: string) => Promise<ExecuteFixResult>;
  cancelAutomation: () => void;
  phases: AutomationPhase[];
}

const AUTOMATION_PHASES: AutomationPhase[] = [
  { id: "analyze", name: "Analyze", description: "Extract ICP, services, and automation requirements" },
  { id: "generate", name: "Generate", description: "Create n8n workflow JSON for all 6 stages" },
  { id: "deploy", name: "Deploy", description: "Deploy workflows via MCP or prepare download bundle" },
  { id: "verify", name: "Verify", description: "Check each node's configuration" },
  { id: "fix", name: "Fix", description: "AI-powered diagnosis and fixes" },
  { id: "validate", name: "Validate", description: "End-to-end verification" },
];

export function useAutomationRun(): UseAutomationRunReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [run, setRun] = useState<AutomationRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [phaseResults, setPhaseResults] = useState<PhaseResult[]>([]);

  const startAutomation = useCallback(
    async (businessIdeaId: string, aiProvider: string = "lovable") => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to start automation",
          variant: "destructive",
        });
        return;
      }

      setIsRunning(true);
      setPhaseResults([]);
      setCurrentPhase("analyze");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: "full-automation",
              businessIdeaId,
              aiProvider,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();

        setRun({
          id: data.runId,
          status: data.status,
          currentPhase: null,
          phasesCompleted: data.results?.map((r: PhaseResult) => r.phase) || [],
          phaseLogs: data.results || [],
          errors: data.results?.filter((r: PhaseResult) => r.status === "error") || [],
          aiProvider,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });

        setPhaseResults(data.results || []);
        setCurrentPhase(null);

        const hasErrors = data.results?.some((r: PhaseResult) => r.status === "error");
        const hasWarnings = data.results?.some((r: PhaseResult) => r.status === "warning");

        toast({
          title: hasErrors
            ? "Automation completed with errors"
            : hasWarnings
            ? "Automation completed with warnings"
            : "Automation completed!",
          description: hasErrors
            ? "Some phases failed. Please review the results."
            : hasWarnings
            ? "Some phases need attention. Please review the warnings."
            : "All automation phases completed successfully.",
          variant: hasErrors ? "destructive" : "default",
        });
      } catch (error) {
        console.error("Automation error:", error);
        toast({
          title: "Automation failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });

        setPhaseResults((prev) => [
          ...prev,
          {
            phase: currentPhase || "unknown",
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsRunning(false);
        setCurrentPhase(null);
      }
    },
    [user, toast, currentPhase]
  );

  const cancelAutomation = useCallback(() => {
    setIsRunning(false);
    setCurrentPhase(null);
    toast({
      title: "Automation cancelled",
      description: "The automation process was stopped.",
    });
  }, [toast]);

  const applyAIFixes = useCallback(
    async (businessIdeaId: string, exceptions: PhaseResult[], aiProvider: string = "lovable"): Promise<PhaseResult | null> => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to apply AI fixes",
          variant: "destructive",
        });
        return null;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: "apply-fixes",
              businessIdeaId,
              aiProvider,
              exceptions,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const result: PhaseResult = await response.json();

        // Add the fix result to phase results
        setPhaseResults((prev) => [...prev, result]);

        if (result.status === "success") {
          toast({
            title: "AI Fixes Applied",
            description: result.message,
          });
        } else if (result.status === "warning") {
          toast({
            title: "Partial Fixes Applied",
            description: result.message,
          });
        } else {
          toast({
            title: "Fix Failed",
            description: result.message,
            variant: "destructive",
          });
        }

        return result;
      } catch (error) {
        console.error("Apply fixes error:", error);
        toast({
          title: "Fix Failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast]
  );

  const executeAIFix = useCallback(
    async (businessIdeaId: string, fix: AIFix, aiProvider: string = "lovable"): Promise<ExecuteFixResult> => {
      if (!user) {
        return {
          success: false,
          message: "Authentication required. Please sign in to execute fixes.",
        };
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: "execute-fix",
              businessIdeaId,
              aiProvider,
              fix,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const result = await response.json();

        return {
          success: result.status === "success",
          message: result.message,
          updatedWorkflowJson: result.data?.updatedWorkflowJson,
          importUrl: result.data?.importUrl,
        };
      } catch (error) {
        console.error("Execute fix error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
    [user]
  );

  return {
    run,
    isRunning,
    currentPhase,
    phaseResults,
    startAutomation,
    applyAIFixes,
    executeAIFix,
    cancelAutomation,
    phases: AUTOMATION_PHASES,
  };
}
