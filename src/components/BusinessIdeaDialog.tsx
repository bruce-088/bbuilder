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
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
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
  Lightbulb,
  ChevronDown,
  ClipboardCheck,
  XCircle,
  RotateCw,
  AlertCircle,
  Wrench,
  FileDown,
  Package,
  LayoutList,
  GitBranchPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateBusinessPlanPDF } from "@/lib/pdfGenerator";
import { generateBusinessPlanBundle } from "@/lib/bundleGenerator";
import FixDiagnosisDialog from "./FixDiagnosisDialog";
import N8nAutomationGuideDialog from "./N8nAutomationGuideDialog";
import BusinessIdeaMasterPromptDialog from "./BusinessIdeaMasterPromptDialog";
import BusinessPlanMindMap from "./BusinessPlanMindMap";
import ExecTranscriptPanel from "./ExecTranscriptPanel";
import UnifiedSetupGuide from "./UnifiedSetupGuide";
import { AutomationEngine } from "./AutomationEngine";
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
  exec_transcript: string | null;
}

interface BusinessIdeaDialogProps {
  ideaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
}

interface VerificationResult {
  status: 'loading' | 'pass' | 'attention' | 'manual';
  summary?: string;
  checklist?: Array<{ item: string; status: string; howToVerify: string }>;
}

interface QuickStartVerification {
  checkDescription: string;
  successIndicators: string[];
  failureIndicators: string[];
  automatedActions: string[];
}

interface QuickStartStep {
  id: string;
  label: string;
  tip: string;
  verification: QuickStartVerification;
}

const detailItems = [
  { id: "niche", label: "Niche", key: "niche" as const, icon: Target },
  { id: "target_audience", label: "Target Audience", key: "target_audience" as const, icon: Users },
  { id: "value_proposition", label: "Value Proposition", key: "value_proposition" as const, icon: Sparkles },
  { id: "service_offering", label: "Service Offering", key: "service_offering" as const, icon: CheckCircle2 },
  { id: "revenue_math", label: "Revenue Math", key: "revenue_math" as const, icon: DollarSign },
  { id: "validation_path", label: "Validation Path", key: "validation_path" as const, icon: Zap },
];

const quickStartSteps: QuickStartStep[] = [
  { 
    id: "validate", 
    label: "Validate your idea with 3 potential customers",
    tip: "Reach out via LinkedIn, email, or communities. Ask: 'Would you pay for this?' and 'What's your biggest pain point?'",
    verification: {
      checkDescription: "Confirm validation conversations have occurred with potential customers",
      successIndicators: [
        "At least 3 prospect conversations documented",
        "Clear pain points identified and noted",
        "Willingness to pay confirmed by prospects",
        "Feedback incorporated into business plan"
      ],
      failureIndicators: [
        "Fewer than 3 conversations completed",
        "No clear pain points identified",
        "Prospects show no interest in paying",
        "No documentation of feedback received"
      ],
      automatedActions: [
        "Review your conversation notes or CRM for documented customer interactions",
        "Compile a list of pain points mentioned across all conversations",
        "Create a summary document with key insights from validation calls",
        "Schedule additional outreach calls if fewer than 3 conversations completed"
      ]
    }
  },
  { 
    id: "landing", 
    label: "Create a simple landing page or social profile",
    tip: "Use Carrd, Notion, or a simple one-page site. Include: headline, benefit, and a way to contact you.",
    verification: {
      checkDescription: "Verify landing page or social profile is live and accessible",
      successIndicators: [
        "Landing page URL is accessible publicly",
        "Clear value proposition headline visible",
        "Contact method or CTA button present",
        "Mobile-responsive design working"
      ],
      failureIndicators: [
        "Page returns 404 or is password-protected",
        "No clear headline or value proposition",
        "No way for visitors to contact you",
        "Page broken on mobile devices"
      ],
      automatedActions: [
        "Test the landing page URL in an incognito browser window",
        "Verify the page loads correctly on mobile devices",
        "Check that all contact forms or buttons are functional",
        "Review headline for clarity and value proposition"
      ]
    }
  },
  { 
    id: "offer", 
    label: "Define your core offer and pricing",
    tip: "Start with one clear package. Price based on value delivered, not time. Consider a 'founding client' discount.",
    verification: {
      checkDescription: "Confirm core offer and pricing structure is defined",
      successIndicators: [
        "Single clear package defined with deliverables",
        "Price point established with rationale",
        "Value-based pricing (not hourly)",
        "Founding client discount considered"
      ],
      failureIndicators: [
        "Multiple confusing packages without focus",
        "No price point established",
        "Hourly rate without value anchoring",
        "No special offer for early customers"
      ],
      automatedActions: [
        "Document your single core offer with clear deliverables",
        "Research competitor pricing for value-based benchmarking",
        "Create a pricing rationale document explaining your value",
        "Draft a founding client discount offer (10-20% off)"
      ]
    }
  },
  { 
    id: "outreach", 
    label: "Reach out to 10 prospects this week",
    tip: "Use personalized messages. Focus on their problem, not your solution. Follow up 2-3 times.",
    verification: {
      checkDescription: "Verify outreach campaign has been executed",
      successIndicators: [
        "10 or more personalized messages sent",
        "Messages focus on prospect's pain points",
        "Follow-up sequence planned or executed",
        "Response tracking in place"
      ],
      failureIndicators: [
        "Fewer than 10 prospects contacted",
        "Generic copy-paste messages used",
        "No follow-up plan established",
        "No tracking of responses"
      ],
      automatedActions: [
        "Create a prospect list with at least 10 qualified leads",
        "Draft personalized outreach templates for each prospect segment",
        "Set up a simple tracking spreadsheet for responses",
        "Schedule follow-up reminders for Day 3 and Day 7"
      ]
    }
  },
  { 
    id: "first_sale", 
    label: "Close your first paying customer",
    tip: "Offer a money-back guarantee to reduce risk. Start small, deliver exceptional results, ask for referrals.",
    verification: {
      checkDescription: "Confirm first paying customer has been acquired",
      successIndicators: [
        "Payment received from first customer",
        "Clear scope of work agreed upon",
        "Onboarding process initiated",
        "Referral ask planned for completion"
      ],
      failureIndicators: [
        "No payment received yet",
        "Only verbal agreement without commitment",
        "Unclear deliverables causing scope creep",
        "No plan for testimonials or referrals"
      ],
      automatedActions: [
        "Follow up with warm leads from outreach campaign",
        "Prepare a simple contract or scope of work document",
        "Set up payment collection via Stripe, PayPal, or invoice",
        "Create an onboarding checklist for your first client"
      ]
    }
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingBundle, setGeneratingBundle] = useState(false);
  const [verificationResults, setVerificationResults] = useState<Map<string, VerificationResult>>(new Map());
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'mindmap'>('details');

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

  const toggleStep = useCallback((stepId: string) => {
    setCompletedSteps(prev => {
      const newCompleted = prev.includes(stepId)
        ? prev.filter((s) => s !== stepId)
        : [...prev, stepId];
      saveQuickStartProgress(newCompleted);
      return newCompleted;
    });
  }, [saveQuickStartProgress]);

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

  // Verification functions
  const handleVerifyStep = async (step: QuickStartStep) => {
    setVerificationResults(prev => new Map(prev).set(step.id, { status: 'loading' }));
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-step', {
        body: {
          stepText: step.label,
          verificationData: step.verification,
          stageTitle: "Quick Start Checklist",
          businessContext: { 
            businessName: idea?.business_name, 
            niche: idea?.niche, 
            targetAudience: idea?.target_audience 
          }
        }
      });
      
      if (error) throw error;
      
      const statusRaw = data.status?.toUpperCase() || 'MANUAL_CHECK_REQUIRED';
      const status: VerificationResult['status'] = 
        statusRaw === 'PASS' ? 'pass' : 
        statusRaw.includes('ATTENTION') ? 'attention' : 'manual';
      
      setVerificationResults(prev => new Map(prev).set(step.id, {
        status,
        summary: data.summary,
        checklist: data.checklist
      }));
      
      // Auto-complete on PASS
      if (statusRaw === 'PASS' && !completedSteps.includes(step.id)) {
        toggleStep(step.id);
        toast.success(`"${step.label.slice(0, 30)}..." verified & auto-completed! ✓`);
      }
      
      return statusRaw;
    } catch (err) {
      console.error("Verification failed:", err);
      toast.error("Verification failed. Please try again.");
      setVerificationResults(prev => {
        const newMap = new Map(prev);
        newMap.delete(step.id);
        return newMap;
      });
      return null;
    }
  };

  const resetVerification = (stepId: string) => {
    setVerificationResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });
    // Uncheck the step when resetting
    if (completedSteps.includes(stepId)) {
      toggleStep(stepId);
    }
    toast.info("Step reset - ready to verify again");
  };

  const handleVerifyAllSteps = async () => {
    setVerifyingAll(true);
    let passedCount = 0;
    
    for (const step of quickStartSteps) {
      const result = await handleVerifyStep(step);
      if (result === 'PASS') passedCount++;
    }
    
    setVerifyingAll(false);
    toast.success(`Verification complete: ${passedCount}/${quickStartSteps.length} passed`);
  };

  const getStatusBadge = (status: VerificationResult['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />PASS</Badge>;
      case 'attention':
        return <Badge className="bg-amber-500 text-white"><AlertCircle className="w-3 h-3 mr-1" />NEEDS ATTENTION</Badge>;
      case 'manual':
        return <Badge variant="secondary"><ClipboardCheck className="w-3 h-3 mr-1" />MANUAL CHECK</Badge>;
      default:
        return null;
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

  const handleDownloadPdf = async () => {
    if (!idea) return;
    
    setGeneratingPdf(true);
    try {
      await generateBusinessPlanPDF(idea, completedSteps);
      toast.success("Business Plan PDF downloaded!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadBundle = async () => {
    if (!idea) return;
    
    setGeneratingBundle(true);
    try {
      await generateBusinessPlanBundle(idea, completedSteps, {
        onProgress: (message) => toast.info(message),
      });
      toast.success("Complete Startup Bundle downloaded!");
    } catch (error) {
      console.error("Error generating bundle:", error);
      toast.error("Failed to generate bundle. Please try again.");
    } finally {
      setGeneratingBundle(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
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
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={generatingPdf || generatingBundle}
                            className="flex-shrink-0"
                          >
                            {generatingPdf || generatingBundle ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Download className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download business plan or automation bundle</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDownloadPdf} disabled={generatingPdf}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Business Plan (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadBundle} disabled={generatingBundle}>
                        <Package className="w-4 h-4 mr-2" />
                        Complete Bundle (PDF + n8n + README)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadMasterWorkflowJson} disabled={generatingMasterJson}>
                        <Bot className="w-4 h-4 mr-2" />
                        n8n Master Workflow (JSON only)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{idea.is_favorite ? "Remove from favorites" : "Add to favorites"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </DialogHeader>

            {/* View Toggle */}
            <div className="flex items-center gap-1 pb-2">
              <Button
                variant={viewMode === 'details' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setViewMode('details')}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Details
              </Button>
              <Button
                variant={viewMode === 'mindmap' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setViewMode('mindmap')}
              >
                <GitBranchPlus className="w-3.5 h-3.5" />
                Mind Map
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6 [&>[data-radix-scroll-area-viewport]]:max-h-[50vh]">
              <div className="space-y-4 pb-4 pr-2">
                {viewMode === 'mindmap' ? (
                  <BusinessPlanMindMap idea={idea} />
                ) : (
                <>
                {/* Run in Exec — promoted to top so it's visible above the fold */}
                <Card className="glass border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-[0_0_24px_-12px_hsl(160_84%_39%/0.45)]">
                  <CardContent className="p-4">
                    <ExecTranscriptPanel
                      ideaId={idea.id}
                      initialTranscript={idea.exec_transcript}
                      onTranscriptUpdate={(t) =>
                        setIdea((prev) =>
                          prev ? { ...prev, exec_transcript: t } : prev,
                        )
                      }
                    />
                  </CardContent>
                </Card>

                {/* Quick Start Checklist with Verification */}
                <Card className="glass border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Rocket className="w-4 h-4" />
                        <span className="font-medium text-sm">Quick Start Checklist</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={handleVerifyAllSteps}
                              disabled={verifyingAll}
                            >
                              {verifyingAll ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <ClipboardCheck className="w-3 h-3" />
                                  Verify All
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Run AI verification on all checklist steps</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground">
                          {completedSteps.length}/{quickStartSteps.length}
                          {savingProgress && " • Saving..."}
                        </span>
                      </div>
                    </div>
                    <Progress value={quickStartProgress} className="h-2 mb-3" />
                    
                    <div className="space-y-3">
                      {quickStartSteps.map((step, index) => {
                        const completed = completedSteps.includes(step.id);
                        const result = verificationResults.get(step.id);
                        
                        return (
                          <div key={step.id} className="space-y-1.5">
                            {/* Step Row */}
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                              <Checkbox
                                id={step.id}
                                checked={completed}
                                onCheckedChange={() => toggleStep(step.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={step.id}
                                  className={`text-sm cursor-pointer block ${
                                    completed ? "line-through text-muted-foreground" : ""
                                  }`}
                                >
                                  <span className="font-medium text-primary mr-2">{index + 1}.</span>
                                  {step.label}
                                </label>
                                
                                {/* Auto-completed indicator */}
                                {completed && result?.status === 'pass' && (
                                  <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Auto-completed on verification
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Collapsible Pro Tip & Verification */}
                            <div className="flex flex-wrap gap-2 ml-7">
                              {/* Pro Tip Collapsible */}
                              <Collapsible className="w-full">
                                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 py-1 px-2 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors group">
                                  <Lightbulb className="w-3 h-3" />
                                  <span>Pro Tip</span>
                                  <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-2.5 mt-1.5">
                                    {step.tip}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                              
                              {/* Verification Collapsible */}
                              <Collapsible className="w-full">
                                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 py-1 px-2 rounded hover:bg-primary/5 transition-colors group">
                                  <ClipboardCheck className="w-3 h-3" />
                                  <span>Verification</span>
                                  {result && result.status !== 'loading' && (
                                    <span className="ml-1">{getStatusBadge(result.status)}</span>
                                  )}
                                  <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180 ml-auto" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="text-xs bg-primary/5 border border-primary/20 rounded-md p-3 mt-1.5 space-y-3">
                                    <p className="font-medium text-foreground">{step.verification.checkDescription}</p>
                                    
                                    {/* Success/Failure Indicators */}
                                    <div className="grid md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground font-medium flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-green-500" /> Success Indicators:
                                        </p>
                                        <ul className="text-muted-foreground space-y-0.5">
                                          {step.verification.successIndicators.map((s, i) => (
                                            <li key={i} className="flex items-start gap-1">
                                              <span className="text-green-500 mt-0.5">•</span>
                                              <span>{s}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground font-medium flex items-center gap-1">
                                          <XCircle className="w-3 h-3 text-destructive" /> Failure Indicators:
                                        </p>
                                        <ul className="text-muted-foreground space-y-0.5">
                                          {step.verification.failureIndicators.map((f, i) => (
                                            <li key={i} className="flex items-start gap-1">
                                              <span className="text-destructive mt-0.5">•</span>
                                              <span>{f}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
                                      {result && result.status !== 'loading' ? (
                                        <>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-xs gap-1"
                                                onClick={() => resetVerification(step.id)}
                                              >
                                                <XCircle className="w-3 h-3" /> Reset
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Clear verification result and uncheck step</p>
                                            </TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-xs gap-1"
                                                onClick={() => handleVerifyStep(step)}
                                              >
                                                <RotateCw className="w-3 h-3" /> Verify Again
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Re-run AI verification for this step</p>
                                            </TooltipContent>
                                          </Tooltip>
                                          {/* Fix button - shown when verification is not pass */}
                                          {result.status !== 'pass' && (
                                            <FixDiagnosisDialog
                                              stepText={step.label}
                                              verificationData={step.verification}
                                              stageTitle="Quick Start Checklist"
                                              businessIdea={idea ? {
                                                businessName: idea.business_name,
                                                niche: idea.niche,
                                                targetAudience: idea.target_audience,
                                                serviceOffering: idea.service_offering
                                              } : undefined}
                                              stepIndex={index}
                                              trigger={
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button 
                                                      variant="outline" 
                                                      size="sm" 
                                                      className="h-7 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    >
                                                      <Wrench className="w-3 h-3" /> Fix
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Get AI-powered guidance to fix this step</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              }
                                            />
                                          )}
                                        </>
                                      ) : (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              className="h-7 text-xs gap-1"
                                              disabled={result?.status === 'loading'}
                                              onClick={() => handleVerifyStep(step)}
                                            >
                                              {result?.status === 'loading' ? (
                                                <>
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                  Verifying...
                                                </>
                                              ) : (
                                                <>
                                                  <ClipboardCheck className="w-3 h-3" />
                                                  Verify
                                                </>
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Run AI verification for this step</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                    
                                    {/* Verification Result Display */}
                                    {result && result.status !== 'loading' && (
                                      <div className="border-t border-primary/10 pt-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                          {getStatusBadge(result.status)}
                                        </div>
                                        {result.summary && (
                                          <p className="text-muted-foreground">{result.summary}</p>
                                        )}
                                        {result.checklist && result.checklist.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">Checklist:</p>
                                            <ul className="space-y-1">
                                              {result.checklist.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                  {item.status === 'check' ? (
                                                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                                  ) : item.status === 'error' ? (
                                                    <XCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" />
                                                  ) : (
                                                    <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                                  )}
                                                  <span className="text-muted-foreground">{item.item}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                </>
                )}

                {/* Run in Exec - browser automation transcript */}
                <Card className="glass border-emerald-500/20">
                  <CardContent className="p-4">
                    <ExecTranscriptPanel
                      ideaId={idea.id}
                      initialTranscript={idea.exec_transcript}
                      onTranscriptUpdate={(t) =>
                        setIdea((prev) =>
                          prev ? { ...prev, exec_transcript: t } : prev,
                        )
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border space-y-2">
              {/* One-Click Automation Engine - Primary CTA */}
              <div className="flex items-center justify-center py-2">
                <AutomationEngine 
                  businessIdeaId={idea.id} 
                  businessName={idea.business_name}
                />
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">or manual setup</span>
                </div>
              </div>

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
              <UnifiedSetupGuide
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
                  <Button variant="outline" className="w-full gap-2">
                    <Zap className="w-4 h-4" />
                    Setup Guide
                  </Button>
                }
              />
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
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
                  <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
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
