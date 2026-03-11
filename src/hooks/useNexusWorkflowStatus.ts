import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NexusStatus = "active" | "idle" | "unknown";

export function useNexusWorkflowStatus(workflowId?: string): NexusStatus {
  const [status, setStatus] = useState<NexusStatus>("unknown");

  useEffect(() => {
    if (!workflowId) return;

    const check = async () => {
      try {
        const { data } = await supabase
          .from("triad_events")
          .select("event_type, created_at")
          .eq("event_type", "TRIGGER_WORKFLOW")
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const lastTriggered = new Date(data[0].created_at!);
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
          setStatus(lastTriggered > fiveMinAgo ? "active" : "idle");
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("unknown");
      }
    };

    check();
    const interval = setInterval(check, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [workflowId]);

  return status;
}
