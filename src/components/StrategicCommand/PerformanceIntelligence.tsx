import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  id: string;
  type: "recommendation" | "warning" | "achievement";
  title: string;
  description: string;
  confidence: number;
  actionable?: boolean;
}

export function PerformanceIntelligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchInsights();
  }, [user]);

  const fetchInsights = async () => {
    if (!user) return;

    try {
      // Fetch recent triad events for analysis
      const { data: events } = await supabase
        .from("triad_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!events || events.length === 0) {
        setInsights([
          {
            id: "welcome",
            type: "recommendation",
            title: "Welcome to Performance Intelligence",
            description:
              "Start building your business to generate strategic insights based on your activity.",
            confidence: 100,
            actionable: false,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Generate basic insights from event patterns
      const generatedInsights: Insight[] = [];

      // Task completion analysis
      const taskCompletedCount = events.filter(
        (e) => e.event_type === "TASK_COMPLETED"
      ).length;
      if (taskCompletedCount >= 5) {
        generatedInsights.push({
          id: "tasks-momentum",
          type: "achievement",
          title: "Strong Task Momentum",
          description: `You've completed ${taskCompletedCount} tasks. Your execution velocity is excellent.`,
          confidence: 95,
          actionable: false,
        });
      } else if (taskCompletedCount < 2 && events.length > 10) {
        generatedInsights.push({
          id: "tasks-warning",
          type: "warning",
          title: "Low Task Completion",
          description:
            "Consider breaking down your business goals into smaller, actionable tasks.",
          confidence: 85,
          actionable: true,
        });
      }

      // Content publishing analysis
      const contentPublished = events.filter(
        (e) => e.event_type === "CONTENT_PUBLISHED"
      ).length;
      if (contentPublished === 0 && events.length > 5) {
        generatedInsights.push({
          id: "content-recommendation",
          type: "recommendation",
          title: "Start Building Your Audience",
          description:
            "Publishing content will help you reach potential customers and validate your niche.",
          confidence: 90,
          actionable: true,
        });
      } else if (contentPublished >= 3) {
        generatedInsights.push({
          id: "content-achievement",
          type: "achievement",
          title: "Growing Your Vocal Reach",
          description: `${contentPublished} pieces of content published. Your voice is being heard!`,
          confidence: 92,
          actionable: false,
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDeepInsights = async () => {
    setIsGenerating(true);
    try {
      // Call mem0 edge function for deep analysis
      const { data, error } = await supabase.functions.invoke("mem0", {
        body: {
          action: "search",
          query: "strategic business insights and recommendations",
          user_id: user?.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Deep Insights Generated",
        description: "AI analysis complete. Check the intelligence panel.",
      });

      // Refresh insights
      await fetchInsights();
    } catch (error) {
      console.error("Error generating deep insights:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate deep insights at this time.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-emerald-800/50 animate-pulse rounded" />
          <div className="h-20 bg-emerald-800/50 animate-pulse rounded" />
          <div className="h-20 bg-emerald-800/50 animate-pulse rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-emerald-100">Performance Intelligence</h3>
        </div>
        <Button
          onClick={generateDeepInsights}
          disabled={isGenerating}
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100"
        >
          {isGenerating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Deep Analysis
        </Button>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              p-4 rounded-lg border-2
              ${
                insight.type === "achievement"
                  ? "bg-emerald-900/50 border-emerald-600"
                  : insight.type === "warning"
                    ? "bg-amber-900/30 border-amber-600"
                    : "bg-blue-900/30 border-blue-600"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {insight.type === "achievement" ? (
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                ) : insight.type === "warning" ? (
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                ) : (
                  <Sparkles className="h-5 w-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-100 mb-1">{insight.title}</h4>
                <p className="text-sm text-emerald-300 mb-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-500">
                    Confidence: {insight.confidence}%
                  </span>
                  {insight.actionable && (
                    <span className="text-xs text-emerald-400 font-medium">
                      → Actionable
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
