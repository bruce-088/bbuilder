import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Target, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PulseMetrics {
  activeNiche: string;
  nexusProgress: number;
  vocalReach: number;
}

export function LivePulseDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PulseMetrics>({
    activeNiche: "Loading...",
    nexusProgress: 0,
    vocalReach: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchMetrics = async () => {
      try {
        // Fetch active business idea for niche
        const { data: businessIdea } = await supabase
          .from("business_ideas")
          .select("niche")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Fetch Nexus Progress (TASK_COMPLETED events)
        const { count: nexusCount } = await supabase
          .from("triad_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("event_type", "TASK_COMPLETED");

        // Fetch Vocal Reach (CONTENT_PUBLISHED events)
        const { count: vocalCount } = await supabase
          .from("triad_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("event_type", "CONTENT_PUBLISHED");

        setMetrics({
          activeNiche: businessIdea?.niche || "No active business",
          nexusProgress: nexusCount || 0,
          vocalReach: vocalCount || 0,
        });
      } catch (error) {
        console.error("Error fetching pulse metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("pulse-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "triad_events",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (isLoading) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-emerald-950 to-emerald-900 border-t border-emerald-800 px-6 py-2 fixed bottom-0 left-0 right-0 z-50 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8 flex-wrap">
          {/* Active Niche — always visible */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 text-emerald-100"
          >
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium">Active Niche:</span>
            <span className="text-sm text-emerald-300 font-semibold">
              {metrics.activeNiche}
            </span>
          </motion.div>

          {/* Nexus Progress — only when > 0 */}
          {metrics.nexusProgress > 0 && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 text-emerald-100"
            >
              <Target className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium">Nexus Progress:</span>
              <span className="text-sm text-amber-300 font-bold">
                {metrics.nexusProgress}
              </span>
            </motion.div>
          )}

          {/* Vocal Reach — only when > 0 */}
          {metrics.vocalReach > 0 && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 text-emerald-100"
            >
              <Radio className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">Vocal Reach:</span>
              <span className="text-sm text-blue-300 font-bold">
                {metrics.vocalReach}
              </span>
            </motion.div>
          )}
        </div>

        {(metrics.nexusProgress > 0 || metrics.vocalReach > 0) && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-xs text-emerald-400 font-medium"
          >
            ● LIVE
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
