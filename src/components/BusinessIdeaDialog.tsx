import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  MessageSquare,
  Wand2,
  Rocket,
} from "lucide-react";
import N8nWorkflowDialog from "./N8nWorkflowDialog";
import N8nAutomationGuideDialog from "./N8nAutomationGuideDialog";
import BusinessIdeaMasterPromptDialog from "./BusinessIdeaMasterPromptDialog";
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
  conversation_id: string | null;
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

const quickStartSteps = [
  { 
    id: "validate", 
    label: "Validate your idea with 3 potential customers",
    tip: "Reach out via LinkedIn, email, or communities. Ask: 'Would you pay for this?' and 'What's your biggest pain point?'"
  },
  { 
    id: "landing", 
    label: "Create a simple landing page or social profile",
    tip: "Use Carrd, Notion, or a simple one-page site. Include: headline, benefit, and a way to contact you."
  },
  { 
    id: "offer", 
    label: "Define your core offer and pricing",
    tip: "Start with one clear package. Price based on value delivered, not time. Consider a 'founding client' discount."
  },
  { 
    id: "outreach", 
    label: "Reach out to 10 prospects this week",
    tip: "Use personalized messages. Focus on their problem, not your solution. Follow up 2-3 times."
  },
  { 
    id: "first_sale", 
    label: "Close your first paying customer",
    tip: "Offer a money-back guarantee to reduce risk. Start small, deliver exceptional results, ask for referrals."
  },
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState<BusinessIdea | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    if (open && ideaId) {
      fetchIdea(ideaId);
      loadQuickStartProgress(ideaId);
    }
  }, [open, ideaId]);

  const loadQuickStartProgress = useCallback(async (businessIdeaId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("implementation_progress")
        .select("completed_steps")
        .eq("user_id", user.id)
        .eq("business_idea_id", businessIdeaId)
        .eq("section_id", "quick-start")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCompletedSteps(data.completed_steps || []);
      } else {
        setCompletedSteps([]);
      }
    } catch (error) {
      console.error("Error loading quick start progress:", error);
    }
  }, [user]);

  const saveQuickStartProgress = useCallback(async (newCompletedSteps: string[]) => {
    if (!user || !idea) return;
    
    setSavingProgress(true);
    try {
      const { data: existing } = await supabase
        .from("implementation_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_idea_id", idea.id)
        .eq("section_id", "quick-start")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("implementation_progress")
          .update({ completed_steps: newCompletedSteps, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("implementation_progress")
          .insert({
            user_id: user.id,
            business_idea_id: idea.id,
            section_id: "quick-start",
            completed_steps: newCompletedSteps,
          });
      }
    } catch (error) {
      console.error("Error saving quick start progress:", error);
    } finally {
      setSavingProgress(false);
    }
  }, [user, idea]);

  const toggleStep = (stepId: string) => {
    const newCompleted = completedSteps.includes(stepId)
      ? completedSteps.filter((s) => s !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    saveQuickStartProgress(newCompleted);
  };

  const quickStartProgress = (completedSteps.length / quickStartSteps.length) * 100;

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

            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6 [&>[data-radix-scroll-area-viewport]]:max-h-[50vh]">
              <div className="space-y-4 pb-4 pr-2">
                {/* Quick Start Checklist */}
                <Card className="glass border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Rocket className="w-4 h-4" />
                        <span className="font-medium text-sm">Quick Start Checklist</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {completedSteps.length}/{quickStartSteps.length} complete
                        {savingProgress && " • Saving..."}
                      </span>
                    </div>
                    <Progress value={quickStartProgress} className="h-2 mb-3" />
                    <TooltipProvider>
                      <div className="space-y-2">
                        {quickStartSteps.map((step, index) => (
                          <Tooltip key={step.id}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                                <Checkbox
                                  id={step.id}
                                  checked={completedSteps.includes(step.id)}
                                  onCheckedChange={() => toggleStep(step.id)}
                                />
                                <label
                                  htmlFor={step.id}
                                  className={`text-sm cursor-pointer flex-1 ${
                                    completedSteps.includes(step.id)
                                      ? "line-through text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  <span className="font-medium text-primary mr-2">{index + 1}.</span>
                                  {step.label}
                                </label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              align="center"
                              sideOffset={16}
                              collisionPadding={16}
                              className="max-w-xs z-[100]"
                            >
                              <p className="text-sm">{step.tip}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  </CardContent>
                </Card>

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

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border space-y-2">
              {idea.conversation_id && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/chat/${idea.conversation_id}`);
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                  View Original Conversation
                </Button>
              )}
              <N8nAutomationGuideDialog
                businessIdea={{
                  id: idea.id,
                  businessName: idea.business_name,
                  niche: idea.niche,
                  targetAudience: idea.target_audience,
                  valueProposition: idea.value_proposition,
                  serviceOffering: idea.service_offering,
                  aiAutomationStrategy: idea.ai_automation_strategy,
                }}
                trigger={
                  <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 btn-glow gap-2">
                    <Zap className="w-4 h-4" />
                    Full Automation Setup Guide
                  </Button>
                }
              />
              <N8nWorkflowDialog
                businessIdeaId={idea.id}
                businessName={idea.business_name}
                trigger={
                  <Button variant="outline" className="w-full gap-2">
                    <Workflow className="w-4 h-4" />
                    Generate n8n Workflow
                  </Button>
                }
              />
              <BusinessIdeaMasterPromptDialog
                businessIdea={{
                  id: idea.id,
                  businessName: idea.business_name,
                  niche: idea.niche,
                  targetAudience: idea.target_audience,
                  valueProposition: idea.value_proposition,
                  serviceOffering: idea.service_offering,
                  revenueMath: idea.revenue_math,
                  validationPath: idea.validation_path,
                  aiAutomationStrategy: idea.ai_automation_strategy,
                }}
                trigger={
                  <Button variant="outline" className="w-full gap-2">
                    <Wand2 className="w-4 h-4" />
                    Generate LLM Master Prompt
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
