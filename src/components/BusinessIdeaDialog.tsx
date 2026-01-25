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
  Star,
  MessageSquare,
  Wand2,
  Rocket,
  Download,
} from "lucide-react";
import N8nAutomationGuideDialog from "./N8nAutomationGuideDialog";
import BusinessIdeaMasterPromptDialog from "./BusinessIdeaMasterPromptDialog";
import { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

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
  const [generatingMasterJson, setGeneratingMasterJson] = useState(false);

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

  // Generate automation stages for master JSON
  const generateAutomationStages = () => {
    if (!idea) return [];
    return [
      {
        id: "n8n-prospecting",
        title: "Lead Prospecting & Discovery",
        workflowPrompt: `Create an n8n workflow for ${idea.business_name} that:
1. Runs on a daily schedule at 9 AM
2. Calls Apollo.io API to search for ${idea.target_audience} in the ${idea.niche} space
3. Filters leads by company size, industry relevance, and job title
4. Enriches each lead with Hunter.io to verify email addresses
5. Scores leads based on fit with ICP
6. Adds qualified leads to a Google Sheet
7. Sends a Slack notification with daily prospecting summary`
      },
      {
        id: "n8n-outreach",
        title: "Outreach & Follow-up",
        workflowPrompt: `Create an n8n outreach workflow for ${idea.business_name} that:
1. Triggers when a new lead is added
2. Sends personalized cold email introducing ${idea.service_offering}
3. Waits 3 days, then checks for replies
4. Sends follow-up sequence
5. Updates CRM with email status`
      },
      {
        id: "n8n-qualification",
        title: "Qualification & Discovery",
        workflowPrompt: `Create an n8n qualification workflow for ${idea.business_name} that:
1. Triggers when someone books a discovery call
2. Fetches qualification form responses
3. Scores the lead
4. Creates a call prep document
5. Sends personalized confirmation email`
      },
      {
        id: "n8n-proposal",
        title: "Proposal & Presentation",
        workflowPrompt: `Create an n8n proposal workflow for ${idea.business_name} that:
1. Triggers when a call is marked "Qualified"
2. Uses AI to generate a customized proposal
3. Creates the proposal in PandaDoc
4. Sends proposal email with tracking
5. Monitors for proposal views`
      },
      {
        id: "n8n-closing",
        title: "Payment & Invoicing",
        workflowPrompt: `Create an n8n closing workflow for ${idea.business_name} that:
1. Triggers when a proposal is signed
2. Creates a Stripe customer
3. Generates an invoice
4. Sends payment link
5. Updates CRM when paid`
      },
      {
        id: "n8n-client-success",
        title: "Client Success & Retention",
        workflowPrompt: `Create an n8n client success workflow for ${idea.business_name} that:
1. Runs weekly to check on clients
2. Calculates health score
3. Sends proactive check-in emails for at-risk clients
4. Sends NPS surveys at milestones
5. Handles renewal reminders`
      }
    ];
  };

  // JSON extraction helpers
  const VALID_N8N_NODE_PREFIXES = [
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.set',
    'n8n-nodes-base.if',
    'n8n-nodes-base.switch',
    'n8n-nodes-base.code',
    'n8n-nodes-base.wait',
    'n8n-nodes-base.noOp',
    'n8n-nodes-base.merge',
    'n8n-nodes-base.gmail',
    'n8n-nodes-base.slack',
    'n8n-nodes-base.notion',
    'n8n-nodes-base.airtable',
    '@n8n/n8n-nodes-langchain.agent',
  ];

  const isValidNodeType = (type: string): boolean => {
    return VALID_N8N_NODE_PREFIXES.some(prefix => type === prefix || type.startsWith(prefix));
  };

  const extractN8nWorkflowJson = (markdownContent: string, businessName: string): object | null => {
    const jsonBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
    const matches = [...markdownContent.matchAll(jsonBlockRegex)];
    
    let bestWorkflow: Record<string, unknown> | null = null;
    let bestScore = 0;
    
    for (const match of matches) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent) as Record<string, unknown>;
        
        if (!parsed || !Array.isArray(parsed.nodes)) continue;
        
        const nodes = parsed.nodes as Array<{ type?: string; name?: string }>;
        
        let score = nodes.length;
        if (parsed.connections) score += 10;
        if (parsed.settings) score += 5;
        if (parsed.name) score += 5;
        
        const validNodeCount = nodes.filter(n => n.type && isValidNodeType(n.type)).length;
        score += validNodeCount * 2;
        
        if (score > bestScore) {
          bestWorkflow = parsed;
          bestScore = score;
        }
      } catch {
        continue;
      }
    }
    
    if (bestWorkflow) {
      if (!bestWorkflow.connections) bestWorkflow.connections = {};
      if (!bestWorkflow.settings) bestWorkflow.settings = { executionOrder: "v1" };
      if (!bestWorkflow.name) bestWorkflow.name = `${businessName} Automation`;
      if (bestWorkflow.active === undefined) bestWorkflow.active = false;
    }
    
    return bestWorkflow;
  };

  const downloadMasterWorkflowJson = async () => {
    if (!idea) return;
    
    setGeneratingMasterJson(true);
    try {
      toast.info("Generating master workflow... This may take up to 60 seconds.");
      
      const stages = generateAutomationStages();
      
      const stagePromises = stages.map((stage, index) => 
        supabase.functions.invoke("generate-n8n-workflow-from-prompt", {
          body: { 
            workflowPrompt: stage.workflowPrompt,
            stageName: stage.title,
            businessName: idea.business_name
          },
        }).then(({ data, error }) => {
          if (error) throw error;
          const workflow = extractN8nWorkflowJson(data.content, idea.business_name);
          return { stage, index, workflow };
        }).catch(err => {
          console.error(`Error generating workflow for stage ${stage.title}:`, err);
          return { stage, index, workflow: null };
        })
      );

      const results = await Promise.all(stagePromises);
      const successfulWorkflows = results.filter(r => r.workflow !== null);
      
      if (successfulWorkflows.length === 0) {
        toast.error("Failed to generate any workflows. Please try again.");
        return;
      }

      const allNodes: Array<{
        id: string;
        name: string;
        type: string;
        position: [number, number];
        [key: string]: unknown;
      }> = [];
      const allConnections: Record<string, unknown> = {};
      
      successfulWorkflows.forEach(({ index, workflow }) => {
        if (!workflow) return;
        
        const workflowData = workflow as { 
          nodes?: Array<{ id: string; name: string; type: string; position: [number, number]; [key: string]: unknown }>; 
          connections?: Record<string, unknown> 
        };
        const nodes = workflowData.nodes || [];
        const connections = workflowData.connections || {};
        
        const yOffset = index * 400;
        const nodeIdMap: Record<string, string> = {};
        
        nodes.forEach((node) => {
          const newId = `stage${index + 1}_${node.id}`;
          nodeIdMap[node.id] = newId;
          
          allNodes.push({
            ...node,
            id: newId,
            name: `[Stage ${index + 1}] ${node.name}`,
            position: [node.position[0], node.position[1] + yOffset] as [number, number],
          });
        });
        
        Object.entries(connections).forEach(([sourceNode, targets]) => {
          const newSourceNode = nodeIdMap[sourceNode] || sourceNode;
          const updatedTargets: Record<string, Array<Array<{ node: string; type: string; index: number }>>> = {};
          
          Object.entries(targets as Record<string, Array<Array<{ node: string; type: string; index: number }>>>).forEach(([outputType, connectionArray]) => {
            updatedTargets[outputType] = (connectionArray as Array<Array<{ node: string; type: string; index: number }>>).map((connGroup) =>
              connGroup.map((conn) => ({
                ...conn,
                node: nodeIdMap[conn.node] || conn.node,
              }))
            );
          });
          
          allConnections[newSourceNode] = updatedTargets;
        });
      });

      const masterWorkflow = {
        name: `${idea.business_name} - Complete Sales Automation`,
        nodes: allNodes,
        connections: allConnections,
        settings: { executionOrder: "v1" },
        active: false
      };

      const blob = new Blob([JSON.stringify(masterWorkflow, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `n8n-master-workflow-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Master workflow downloaded! Includes ${successfulWorkflows.length}/${stages.length} stages. Import via File → Import from File in n8n.`
      );
    } catch (error) {
      console.error("Error generating master workflow:", error);
      toast.error("Failed to generate master workflow. Please try again.");
    } finally {
      setGeneratingMasterJson(false);
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
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={generatingMasterJson}
                onClick={downloadMasterWorkflowJson}
              >
                {generatingMasterJson ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generatingMasterJson ? "Generating..." : "Download Master JSON"}
              </Button>
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
