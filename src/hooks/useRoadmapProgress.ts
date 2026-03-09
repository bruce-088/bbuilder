import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Map strategic roadmap phases to setup guide capability IDs
const PHASE_CAPABILITY_MAP: Record<string, string[]> = {
  validation: ["qualification"],
  landing: ["pipeline"],
  offer: ["closing"],
  outreach: ["lead-gen", "outreach"],
  sale: ["closing", "analytics"],
};

// Step counts per capability (from UnifiedSetupGuide)
const CAPABILITY_STEP_COUNTS: Record<string, number> = {
  "lead-gen": 5,
  pipeline: 5,
  outreach: 5,
  qualification: 5,
  closing: 5,
  automation: 6,
  analytics: 5,
};

interface Phase {
  id: string;
  name: string;
  description: string;
  status: "completed" | "in-progress" | "pending";
  completionPercentage?: number;
}

type ProgressState = Record<string, boolean[]>;

export function useRoadmapProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressState>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from("setup_guide_progress")
          .select("progress")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to load roadmap progress:", error.message);
        } else if (data?.progress) {
          setProgress(data.progress as ProgressState);
        }
      } catch (e) {
        console.warn("Roadmap progress load error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  const phases = useMemo<Phase[]>(() => {
    const phaseDefinitions = [
      {
        id: "validation",
        name: "Market Validation",
        description: "Validate your niche and target audience",
      },
      {
        id: "landing",
        name: "Landing Page",
        description: "Build your online presence",
      },
      {
        id: "offer",
        name: "Offer Creation",
        description: "Define your service and pricing",
      },
      {
        id: "outreach",
        name: "Lead Outreach",
        description: "Start reaching out to prospects",
      },
      {
        id: "sale",
        name: "First Sale",
        description: "Close your first customer",
      },
    ];

    return phaseDefinitions.map((phaseDef) => {
      const mappedCaps = PHASE_CAPABILITY_MAP[phaseDef.id] || [];
      
      // Calculate total steps for this phase
      const totalSteps = mappedCaps.reduce(
        (sum, capId) => sum + (CAPABILITY_STEP_COUNTS[capId] ?? 0),
        0
      );
      
      // Calculate completed steps for this phase
      const completedSteps = mappedCaps.reduce((sum, capId) => {
        const capProgress = progress[capId];
        if (!capProgress) return sum;
        return sum + capProgress.filter(Boolean).length;
      }, 0);

      // Calculate percentage
      const percentage = totalSteps > 0 
        ? Math.round((completedSteps / totalSteps) * 100) 
        : 0;

      // Determine status
      let status: "completed" | "in-progress" | "pending";
      if (percentage === 100) {
        status = "completed";
      } else if (percentage > 0) {
        status = "in-progress";
      } else {
        status = "pending";
      }

      return {
        ...phaseDef,
        status,
        completionPercentage: status === "in-progress" ? percentage : undefined,
      };
    });
  }, [progress]);

  return { phases, isLoading };
}
