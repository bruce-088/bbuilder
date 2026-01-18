import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Target,
  Users,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Zap,
  Bot,
  Workflow,
  Star,
} from "lucide-react";
import N8nWorkflowDialog from "./N8nWorkflowDialog";
import { Json } from "@/integrations/supabase/types";

interface BusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  target_audience: string;
  value_proposition: string;
  service_offering: string;
  revenue_math: string;
  validation_path: string;
  ai_automation_strategy: Json;
  is_favorite: boolean;
  created_at: string;
}

interface BusinessIdeaDialogProps {
  ideaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
}

const detailItems = [
  { id: "niche", label: "Niche", key: "niche" as const, icon: Target },
  { id: "target_audience", label: "Target Audience", key: "target_audience" as const, icon: Users },
  { id: "value_proposition", label: "Value Proposition", key: "value_proposition" as const, icon: Sparkles },
  { id: "service_offering", label: "Service Offering", key: "service_offering" as const, icon: CheckCircle2 },
  { id: "revenue_math", label: "Revenue Math", key: "revenue_math" as const, icon: DollarSign },
  { id: "validation_path", label: "Validation Path", key: "validation_path" as const, icon: Zap },
];

const formatAutomationStrategy = (strategy: Json): string => {
  if (!strategy) return "Not specified";
  if (typeof strategy === "string") return strategy;
  if (typeof strategy === "object" && strategy !== null) {
    const obj = strategy as Record<string, unknown>;
    if ("summary" in obj && typeof obj.summary === "string") {
      return obj.summary;
    }
    return JSON.stringify(strategy, null, 2);
  }
  return String(strategy);
};

export default function BusinessIdeaDialog({
  ideaId,
  open,
  onOpenChange,
  onFavoriteToggle,
}: BusinessIdeaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState<BusinessIdea | null>(null);

  useEffect(() => {
    if (open && ideaId) {
      fetchIdea(ideaId);
    }
  }, [open, ideaId]);

  const fetchIdea = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_ideas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setIdea(data);
    } catch (error) {
      console.error("Error fetching business idea:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!idea) return;
    
    try {
      const { error } = await supabase
        .from("business_ideas")
        .update({ is_favorite: !idea.is_favorite })
        .eq("id", idea.id);

      if (error) throw error;

      setIdea(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null);
      onFavoriteToggle?.(idea.id, !idea.is_favorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : idea ? (
          <>
            <DialogHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="font-display text-xl md:text-2xl">
                    {idea.business_name}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {new Date(idea.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className="flex-shrink-0"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${
                      idea.is_favorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground hover:text-yellow-400"
                    }`}
                  />
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 pb-4">
                {detailItems.map((item) => {
                  const IconComponent = item.icon;
                  const value = idea[item.key];
                  return (
                    <Card key={item.id} className="glass">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2 text-primary">
                          <IconComponent className="w-4 h-4" />
                          <span className="font-medium text-sm">{item.label}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {value || "Not specified"}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* AI Automation Strategy */}
                <Card className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Bot className="w-4 h-4" />
                      <span className="font-medium text-sm">AI Automation Strategy</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {formatAutomationStrategy(idea.ai_automation_strategy)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            {/* Generate n8n Workflow Button */}
            <div className="pt-4 border-t border-border">
              <N8nWorkflowDialog
                businessIdeaId={idea.id}
                businessName={idea.business_name}
                trigger={
                  <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 btn-glow gap-2">
                    <Workflow className="w-4 h-4" />
                    Generate n8n Workflow
                  </Button>
                }
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">Business idea not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
