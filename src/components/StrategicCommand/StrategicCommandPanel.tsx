import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { VisualStrategyRoadmap, PerformanceIntelligence, GlobalPivotControl } from "@/components/StrategicCommand";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

export function StrategicCommandPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBusinessId, setActiveBusinessId] = useState<string | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");

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

  const mockPhases = [
    {
      id: "validation",
      name: "Market Validation",
      description: "Validate your niche and target audience",
      status: "completed" as const,
    },
    {
      id: "landing",
      name: "Landing Page",
      description: "Build your online presence",
      status: "in-progress" as const,
      completionPercentage: 60,
    },
    {
      id: "offer",
      name: "Offer Creation",
      description: "Define your service and pricing",
      status: "pending" as const,
    },
    {
      id: "outreach",
      name: "Lead Outreach",
      description: "Start reaching out to prospects",
      status: "pending" as const,
    },
    {
      id: "sale",
      name: "First Sale",
      description: "Close your first customer",
      status: "pending" as const,
    },
  ];

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
          {activeBusinessId ? (
            <VisualStrategyRoadmap
              businessName={businessName}
              niche={niche}
              phases={mockPhases}
              onPhaseClick={(phaseId) => {
                console.log("Phase clicked:", phaseId);
                // Navigate to relevant action
              }}
              onSyncPhase={(phaseId) => {
                console.log("Sync phase:", phaseId);
                // Trigger phase sync
              }}
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
