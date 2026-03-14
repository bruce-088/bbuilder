import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SystemHealth {
  nexusai: "up" | "down" | "unknown";
  n8n: "up" | "down" | "unknown";
  nexusvocal: "up" | "down" | "unknown";
  recentErrors: Array<{
    id: string;
    event_type: string;
    payload: any;
    created_at: string;
  }>;
  lastChecked: string | null;
}

export function useSystemHealth() {
  const { user } = useAuth();
  const [health, setHealth] = useState<SystemHealth>({
    nexusai: "unknown",
    n8n: "unknown",
    nexusvocal: "unknown",
    recentErrors: [],
    lastChecked: null,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!user || isChecking) return;
    setIsChecking(true);

    try {
      // Use the chat function's check_system_health tool via edge function
      const { data, error } = await supabase.functions.invoke("n8n-webhook-health", {
        body: { urls: [] }, // Just checking reachability
      });

      // Check triad_events for recent errors
      const { data: errorEvents } = await supabase
        .from("triad_events")
        .select("id, event_type, payload, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Filter for events that contain error indicators in payload
      const errors = (errorEvents || []).filter((e) => {
        const p = e.payload as any;
        return (
          p?.status === "error" ||
          p?.error ||
          p?.success === false ||
          e.event_type?.includes("ERROR") ||
          e.event_type?.includes("FAILED")
        );
      });

      // Check each service by looking at recent successful sync events
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: recentEvents } = await supabase
        .from("triad_events")
        .select("event_type, payload, source_app, created_at")
        .eq("user_id", user.id)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      // Determine service status from recent events
      let nexusStatus: "up" | "down" | "unknown" = "unknown";
      let vocalStatus: "up" | "down" | "unknown" = "unknown";
      let n8nStatus: "up" | "down" | "unknown" = "unknown";

      for (const ev of recentEvents || []) {
        const p = ev.payload as any;
        if (p?.targets_reached?.includes("NexusAI") || p?.triad_sync?.targets_reached?.includes("NexusAI")) {
          nexusStatus = "up";
        }
        if (p?.targets_reached?.includes("NexusVocal") || p?.triad_sync?.targets_reached?.includes("NexusVocal")) {
          vocalStatus = "up";
        }
        if (ev.event_type === "WORKFLOW_ACTIVATED" || ev.event_type === "TRIGGER_WORKFLOW") {
          n8nStatus = "up";
        }
      }

      // If we have events but no successful syncs, mark as down
      if (recentEvents && recentEvents.length > 0) {
        if (nexusStatus === "unknown") nexusStatus = "down";
        if (vocalStatus === "unknown") vocalStatus = "down";
      }

      setHealth({
        nexusai: nexusStatus,
        n8n: n8nStatus,
        nexusvocal: vocalStatus,
        recentErrors: errors.slice(0, 5),
        lastChecked: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Health check failed:", err);
    } finally {
      setIsChecking(false);
    }
  }, [user, isChecking]);

  // Auto-check on mount and every 60 seconds
  useEffect(() => {
    if (!user) return;
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Subscribe to new triad_events for proactive error detection
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("system-health-monitor")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "triad_events",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const ev = payload.new as any;
          const p = ev.payload;
          if (
            p?.status === "error" ||
            p?.error ||
            p?.success === false ||
            ev.event_type?.includes("ERROR") ||
            ev.event_type?.includes("FAILED")
          ) {
            setHealth((prev) => ({
              ...prev,
              recentErrors: [ev, ...prev.recentErrors].slice(0, 5),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { health, isChecking, checkHealth };
}
