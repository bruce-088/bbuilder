import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { VisualStrategyRoadmap, PerformanceIntelligence, GlobalPivotControl } from "@/components/StrategicCommand";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useRoadmapProgress } from "@/hooks/useRoadmapProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export function StrategicCommandPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBusinessId, setActiveBusinessId] = useState<string | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");
  const [syncingPhaseId, setSyncingPhaseId] = useState<string | null>(null);
  const [syncSecretMissing, setSyncSecretMissing] = useState(false);
  const [syncError, setSyncError] = useState<{ source: string; message: string } | null>(null);
  const { phases, isLoading: phasesLoading } = useRoadmapProgress();

  useEffect(() => {
    if (!user) return;

    const fetchActiveIdea = async () => {
      const { data } = await supabase
        .from("business_ideas")
        .select("id, business_name, niche")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveBusinessId(data.id);
        setBusinessName(data.business_name);
        setNiche(data.niche);
      }
    };

    fetchActiveIdea();
  }, [user]);

  const handlePhaseClick = (phaseId: string) => {
    const routeMap: Record<string, string> = {
      validation: "/leads",
      landing: "/leads",
      offer: "/leads",
      outreach: "/workflows",
      sale: "/leads",
    };
    navigate(routeMap[phaseId] || "/dashboard");
  };

  const handleSyncPhase = async (phaseId: string) => {
    if (!activeBusinessId) {
      toast({
        title: "Sync Failed",
        description: "No active business idea found.",
        variant: "destructive",
      });
      return;
    }

    setSyncingPhaseId(phaseId);
    setSyncError(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-to-nexus", {
        body: { business_idea_id: activeBusinessId, phase_id: phaseId },
      });

      if (error) throw new Error(error.message);

      if (data?.error === "SYNC_SECRET_MISSING") {
        setSyncSecretMissing(true);
        throw new Error(data.message);
      }

      if (data?.error === "NO_SYNC_TARGETS" || data?.error === "INVALID_NEXUS_URL") {
        throw new Error(data.message);
      }

      // Check per-target results
      const results = data?.results as { label: string; success: boolean; status_code: number; response_text: string; error?: string }[] | undefined;

      if (results) {
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          const errorDetail = results.map(r => `${r.label}: ${r.success ? "✅ OK" : `❌ ${r.error || r.response_text}`}`).join("\n\n");
          setSyncError({ source: "Sync Results", message: errorDetail });
          if (!data?.success) {
            throw new Error(`${failures.length} target(s) failed`);
          }
        }
      }

      if (!data?.success) {
        const errorMsg = data?.message || data?.error || "Unknown sync error";
        setSyncError({ source: "Sync", message: errorMsg });
        throw new Error(errorMsg);
      }

      const successDetail = results?.map(r => `${r.label}: ✅`).join(", ") || "OK";
      toast({
        title: "Phase Synced Successfully!",
        description: `${phases.find((p) => p.id === phaseId)?.name || "Phase"} synced (${data.tasks_sent} tasks) → ${successDetail}`,
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({
        title: "Sync Failed",
        description: err?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSyncingPhaseId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-emerald-100">Strategic Command Center</h2>
        <GlobalPivotControl
          currentBusinessId={activeBusinessId}
          onPivotComplete={() => {
            window.location.reload();
          }}
        />
      </div>

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-emerald-900/50 border border-emerald-800">
          <TabsTrigger
            value="roadmap"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-emerald-100"
          >
            Strategy Roadmap
          </TabsTrigger>
          <TabsTrigger
            value="intelligence"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-emerald-100"
          >
            Performance Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="mt-4">
          {syncSecretMissing && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive text-destructive flex items-center gap-2 text-sm font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Sync Disabled: Missing Secret — TRIAD_SYNC_SECRET is not configured.
            </div>
          )}
          {syncError && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/20 border-2 border-destructive text-destructive">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-bold">{syncError.source} Error</h4>
                <button onClick={() => setSyncError(null)} className="text-destructive/70 hover:text-destructive text-sm">Dismiss</button>
              </div>
              <pre className="whitespace-pre-wrap break-all text-sm font-mono bg-destructive/10 p-3 rounded max-h-60 overflow-auto">{syncError.message}</pre>
            </div>
          )}
          {phasesLoading ? (
            <Card className="p-6 bg-emerald-950/50 border-emerald-800">
              <Skeleton className="h-6 w-48 mb-4 bg-emerald-800/50" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-emerald-800/50" />
                ))}
              </div>
            </Card>
          ) : activeBusinessId ? (
            <VisualStrategyRoadmap
              businessName={businessName}
              niche={niche}
              phases={phases}
              onPhaseClick={handlePhaseClick}
              onSyncPhase={handleSyncPhase}
              syncingPhaseId={syncingPhaseId}
            />
          ) : (
            <Card className="p-6 bg-emerald-950/50 border-emerald-800 text-center">
              <p className="text-emerald-400">
                No active business idea. Create one to see your strategic roadmap.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="intelligence" className="mt-4">
          <PerformanceIntelligence />
        </TabsContent>
      </Tabs>
    </div>
  );
}
