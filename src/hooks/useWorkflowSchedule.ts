import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface WorkflowSchedule {
  id: string;
  workflow_id: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
}

export function useWorkflowSchedule(workflowId?: string) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<WorkflowSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (!workflowId || !user) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("workflow_schedules")
        .select("*")
        .eq("workflow_id", workflowId)
        .maybeSingle();
      setSchedule(data);
    } catch (e) {
      console.error("Load schedule error:", e);
    } finally {
      setLoading(false);
    }
  }, [workflowId, user]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const saveSchedule = useCallback(async (cron: string, enabled: boolean) => {
    if (!workflowId || !user) return;
    setSaving(true);
    try {
      if (schedule) {
        await (supabase as any)
          .from("workflow_schedules")
          .update({ cron_expression: cron, enabled })
          .eq("id", schedule.id);
        setSchedule({ ...schedule, cron_expression: cron, enabled });
      } else {
        const { data } = await (supabase as any)
          .from("workflow_schedules")
          .insert({ workflow_id: workflowId, user_id: user.id, cron_expression: cron, enabled })
          .select()
          .single();
        setSchedule(data);
      }
      toast.success(enabled ? "Schedule enabled" : "Schedule saved");
    } catch (e) {
      console.error("Save schedule error:", e);
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, [workflowId, user, schedule]);

  const toggleEnabled = useCallback(async () => {
    if (!schedule) {
      // Create with default cron
      await saveSchedule("0 9 * * *", true);
      return;
    }
    await saveSchedule(schedule.cron_expression, !schedule.enabled);
  }, [schedule, saveSchedule]);

  return { schedule, loading, saving, saveSchedule, toggleEnabled };
}
