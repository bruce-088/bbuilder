import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Wrench, Target, Users, Presentation, Shield, Handshake, Heart, CheckCircle2, Cloud, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Json } from "@/integrations/supabase/types";

interface BusinessIdeaData {
  id: string;
  businessName: string;
  niche?: string;
  targetAudience?: string;
  valueProposition?: string;
  serviceOffering?: string;
  aiAutomationStrategy?: Json;
}

interface ImplementationGuideDialogProps {
  trigger?: React.ReactNode;
  businessIdea?: BusinessIdeaData;
}

type CompletedSteps = Record<string, Set<string>>;

const getStorageKey = (businessIdeaId?: string) => 
  businessIdeaId 
    ? `implementation-guide-progress-${businessIdeaId}` 
    : "implementation-guide-progress-global";

interface Tool {
  name: string;
  url: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  tools: Tool[];
  setupSteps: string[];
  automationTips: string[];
}

// Function to generate customized sections based on business idea
const generateCustomizedSections = (businessIdea?: BusinessIdeaData): Section[] => {
  const businessName = businessIdea?.businessName || "your business";
  const niche = businessIdea?.niche || "your niche";
  const targetAudience = businessIdea?.targetAudience || "your target audience";
  const serviceOffering = businessIdea?.serviceOffering || "your services";
  const valueProposition = businessIdea?.valueProposition || "your unique value";

  return [
    {
      id: "prospecting",
      title: "Prospecting",
      icon: <Target className="w-5 h-5" />,
      description: businessIdea 
        ? `Automate lead generation to find ${targetAudience} who need ${serviceOffering}.`
        : "Automate lead generation and prospect identification to build a qualified pipeline.",
      tools: [
        { name: "Apollo.io", url: "https://apollo.io", description: "B2B lead database with automated outreach" },
        { name: "LinkedIn Sales Navigator", url: "https://linkedin.com/sales", description: "Advanced LinkedIn prospecting" },
        { name: "Hunter.io", url: "https://hunter.io", description: "Email finder and verification" },
        { name: "Phantombuster", url: "https://phantombuster.com", description: "LinkedIn automation and scraping" },
        { name: "Clay", url: "https://clay.com", description: "Data enrichment and workflow automation" },
      ],
      setupSteps: businessIdea ? [
        `Define your ICP for ${businessName}: ${targetAudience}`,
        `Set up Apollo.io to search for leads in the ${niche} space`,
        `Connect LinkedIn Sales Navigator to find ${targetAudience}`,
        `Use Hunter.io to verify email addresses of ${targetAudience}`,
        `Create n8n workflow to sync ${businessName} leads to your CRM`,
      ] : [
        "Define your Ideal Customer Profile (ICP) with specific criteria",
        "Set up Apollo.io or Clay to search for leads matching your ICP",
        "Connect LinkedIn Sales Navigator for social selling insights",
        "Use Hunter.io to verify email addresses before outreach",
        "Create n8n workflow to sync leads to your CRM automatically",
      ],
      automationTips: businessIdea ? [
        `Schedule daily searches for ${targetAudience} prospects`,
        `Use webhooks to enrich new ${businessName} leads automatically`,
        `Set up alerts when ${targetAudience} show buying signals`,
        `Auto-tag leads based on fit with ${niche} criteria`,
      ] : [
        "Schedule daily lead searches to maintain pipeline flow",
        "Use webhooks to trigger enrichment when new leads are added",
        "Set up alerts for intent signals (job changes, funding rounds)",
        "Auto-tag leads based on company size, industry, and engagement",
      ],
    },
    {
      id: "qualification",
      title: "Qualification & Discovery",
      icon: <Users className="w-5 h-5" />,
      description: businessIdea
        ? `Qualify leads to ensure they're a good fit for ${serviceOffering} and understand their specific needs.`
        : "Qualify leads and conduct discovery to understand their needs and fit.",
      tools: [
        { name: "Calendly", url: "https://calendly.com", description: "Automated meeting scheduling" },
        { name: "Typeform", url: "https://typeform.com", description: "Interactive qualification forms" },
        { name: "Loom", url: "https://loom.com", description: "Async video for discovery questions" },
        { name: "Gong", url: "https://gong.io", description: "Call recording and AI analysis" },
        { name: "Fireflies.ai", url: "https://fireflies.ai", description: "Meeting transcription and insights" },
      ],
      setupSteps: businessIdea ? [
        `Create qualification form asking about ${targetAudience}'s specific challenges`,
        `Set up Calendly for ${businessName} discovery calls`,
        `Record and transcribe calls to understand ${targetAudience} pain points`,
        `Build lead scoring based on fit with ${serviceOffering}`,
        `Auto-route qualified ${niche} leads to your calendar`,
      ] : [
        "Create a qualification form in Typeform with key questions",
        "Set up Calendly with different meeting types for each stage",
        "Connect Fireflies.ai or Gong to record and transcribe calls",
        "Build n8n workflow to score leads based on form responses",
        "Configure auto-routing to appropriate sales reps based on score",
      ],
      automationTips: businessIdea ? [
        `Auto-send ${businessName} calendar link when prospects engage`,
        `Use AI to identify ${targetAudience} buying signals in calls`,
        `Score leads based on alignment with ${valueProposition}`,
        `Auto-follow up if ${targetAudience} don't book within 48 hours`,
      ] : [
        "Auto-send calendar links when prospects respond to outreach",
        "Use AI to analyze call transcripts for buying signals",
        "Create lead scoring rules based on discovery responses",
        "Automate follow-up if prospects don't book within 48 hours",
      ],
    },
    {
      id: "presentation",
      title: "Presentation & Proposal",
      icon: <Presentation className="w-5 h-5" />,
      description: businessIdea
        ? `Create compelling proposals that showcase how ${businessName} delivers ${valueProposition}.`
        : "Create compelling presentations and proposals tailored to each prospect.",
      tools: [
        { name: "PandaDoc", url: "https://pandadoc.com", description: "Proposal and document automation" },
        { name: "Pitch", url: "https://pitch.com", description: "Collaborative presentation software" },
        { name: "Vidyard", url: "https://vidyard.com", description: "Personalized video messages" },
        { name: "Qwilr", url: "https://qwilr.com", description: "Interactive proposals and quotes" },
        { name: "Canva", url: "https://canva.com", description: "Design templates for sales materials" },
      ],
      setupSteps: businessIdea ? [
        `Create ${businessName} proposal template highlighting ${valueProposition}`,
        `Set up interactive proposals for ${serviceOffering}`,
        `Build presentation deck showcasing ${niche} expertise`,
        `Auto-populate proposals with ${targetAudience} data from CRM`,
        `Track when ${targetAudience} view your ${businessName} proposals`,
      ] : [
        "Create proposal templates in PandaDoc with variable fields",
        "Set up Qwilr for interactive, trackable proposals",
        "Build presentation library in Pitch or Canva",
        "Connect CRM data to auto-populate proposal fields via n8n",
        "Set up tracking to know when proposals are viewed",
      ],
      automationTips: businessIdea ? [
        `Auto-generate ${businessName} proposals from discovery notes`,
        `Send personalized videos explaining ${serviceOffering}`,
        `Follow up when ${targetAudience} open your proposals`,
        `Use AI to customize proposals for each ${niche} prospect`,
      ] : [
        "Auto-generate proposals using CRM data and templates",
        "Send personalized Vidyard videos with each proposal",
        "Trigger follow-up sequences when proposals are opened",
        "Use AI to customize proposal content based on discovery notes",
      ],
    },
    {
      id: "objection-handling",
      title: "Objection Handling",
      icon: <Shield className="w-5 h-5" />,
      description: businessIdea
        ? `Prepare responses to common objections from ${targetAudience} about ${serviceOffering}.`
        : "Prepare for and address common objections with automated resources.",
      tools: [
        { name: "Notion", url: "https://notion.so", description: "Knowledge base for objection responses" },
        { name: "Guru", url: "https://getguru.com", description: "Sales enablement knowledge management" },
        { name: "ChatGPT", url: "https://chat.openai.com", description: "AI-powered objection response generation" },
        { name: "Seismic", url: "https://seismic.com", description: "Sales content management" },
        { name: "Highspot", url: "https://highspot.com", description: "Content recommendations for objections" },
      ],
      setupSteps: businessIdea ? [
        `Document ${targetAudience}'s common objections about ${serviceOffering}`,
        `Create quick-access cards for ${businessName} objection responses`,
        `Build AI prompts for handling ${niche}-specific concerns`,
        `Compile case studies showing ${valueProposition} in action`,
        `Track which objections ${targetAudience} raise most often`,
      ] : [
        "Document common objections and proven responses in Notion",
        "Set up Guru cards for quick access during calls",
        "Create AI prompts for generating contextual responses",
        "Build a searchable database of case studies by objection type",
        "Connect to CRM to track which objections appear most often",
      ],
      automationTips: businessIdea ? [
        `Auto-detect when ${targetAudience} raise objections in calls`,
        `Suggest relevant ${businessName} content based on concerns`,
        `Auto-send case studies addressing ${niche} objections`,
        `Build AI assistant for ${serviceOffering} objection responses`,
      ] : [
        "Use Gong/Fireflies to auto-detect objections in calls",
        "Trigger relevant content suggestions based on call analysis",
        "Auto-send case studies that address specific concerns",
        "Build AI chatbot to help reps find objection responses fast",
      ],
    },
    {
      id: "closing",
      title: "Closing",
      icon: <Handshake className="w-5 h-5" />,
      description: businessIdea
        ? `Streamline the closing process for ${businessName} with contracts and payments.`
        : "Streamline the closing process with contract management and e-signatures.",
      tools: [
        { name: "DocuSign", url: "https://docusign.com", description: "Electronic signatures and contracts" },
        { name: "PandaDoc", url: "https://pandadoc.com", description: "Proposals with built-in e-sign" },
        { name: "Stripe", url: "https://stripe.com", description: "Payment processing and invoicing" },
        { name: "HubSpot", url: "https://hubspot.com", description: "Deal pipeline and automation" },
        { name: "Close", url: "https://close.com", description: "CRM with calling and email built-in" },
      ],
      setupSteps: businessIdea ? [
        `Create ${businessName} contract templates for ${serviceOffering}`,
        `Set up Stripe for ${businessName} payment collection`,
        `Build deal stages specific to ${niche} sales cycle`,
        `Auto-trigger ${businessName} onboarding when deals close`,
        `Set up approval workflows for ${serviceOffering} contracts`,
      ] : [
        "Set up DocuSign or PandaDoc for contract signing",
        "Configure Stripe for seamless payment collection",
        "Create deal stage automation in your CRM",
        "Build n8n workflow to trigger onboarding when deal closes",
        "Set up notifications for legal review if needed",
      ],
      automationTips: businessIdea ? [
        `Auto-send ${businessName} contracts at verbal close stage`,
        `Trigger ${serviceOffering} payment link after signing`,
        `Notify team when ${targetAudience} closes as customer`,
        `Auto-schedule ${businessName} onboarding kickoff`,
      ] : [
        "Auto-send contracts when deals reach 'verbal close' stage",
        "Trigger payment links immediately after contract signing",
        "Auto-update CRM and notify team when deals close",
        "Schedule onboarding kickoff call automatically",
      ],
    },
    {
      id: "client-success",
      title: "Client Success & Follow-up",
      icon: <Heart className="w-5 h-5" />,
      description: businessIdea
        ? `Ensure ${businessName} clients achieve success and become advocates for ${serviceOffering}.`
        : "Ensure client success and nurture relationships for renewals and referrals.",
      tools: [
        { name: "Intercom", url: "https://intercom.com", description: "Customer messaging and support" },
        { name: "Zendesk", url: "https://zendesk.com", description: "Help desk and ticketing" },
        { name: "CustomerSuccessBox", url: "https://customersuccessbox.com", description: "CS platform for B2B" },
        { name: "ChurnZero", url: "https://churnzero.com", description: "Customer success and retention" },
        { name: "Mailchimp", url: "https://mailchimp.com", description: "Email marketing and newsletters" },
      ],
      setupSteps: businessIdea ? [
        `Create ${businessName} onboarding sequence for ${targetAudience}`,
        `Set up health scoring for ${serviceOffering} usage`,
        `Build QBR templates showcasing ${valueProposition} results`,
        `Automate referral requests from successful ${businessName} clients`,
        `Set ${serviceOffering} renewal reminders 90/60/30 days out`,
      ] : [
        "Set up onboarding email sequence in Mailchimp or Intercom",
        "Configure health scoring in ChurnZero or CustomerSuccessBox",
        "Create QBR (Quarterly Business Review) templates",
        "Build referral request automation at key milestones",
        "Set up renewal reminders 90/60/30 days before expiration",
      ],
      automationTips: businessIdea ? [
        `Auto-send NPS surveys to ${businessName} clients at milestones`,
        `Alert when ${serviceOffering} usage drops below threshold`,
        `Auto-request reviews when ${targetAudience} hit success metrics`,
        `Schedule renewal conversations based on ${serviceOffering} terms`,
      ] : [
        "Auto-send NPS surveys after key milestones",
        "Trigger check-in calls when usage drops below threshold",
        "Auto-request reviews/referrals at peak satisfaction moments",
        "Schedule renewal discussions based on contract dates",
      ],
    },
  ];
};

// Map section IDs to their header patterns in the AI automation strategy
const sectionHeaderPatterns: Record<string, RegExp> = {
  prospecting: /### Prospecting[\s\S]*?(?=###|$)/i,
  qualification: /### Qualification[\s\S]*?(?=###|$)/i,
  presentation: /### Presentation[\s\S]*?(?=###|$)/i,
  "objection-handling": /### Objection[\s\S]*?(?=###|$)/i,
  closing: /### Closing[\s\S]*?(?=###|$)/i,
  "client-success": /### Client Success[\s\S]*?(?=###|$)/i,
};

// Extract prompt for a specific section from AI automation strategy
const extractSectionPrompt = (strategy: Json, sectionId: string): string | null => {
  if (!strategy) return null;
  if (typeof strategy === "object" && strategy !== null) {
    const obj = strategy as Record<string, unknown>;
    if ("summary" in obj && typeof obj.summary === "string") {
      const summary = obj.summary;
      const pattern = sectionHeaderPatterns[sectionId];
      if (pattern) {
        const match = summary.match(pattern);
        if (match) {
          return match[0].trim();
        }
      }
    }
  }
  return null;
};

// Section-specific labels for the prompt button
const sectionPromptLabels: Record<string, string> = {
  prospecting: "View Your ICP Prompt",
  qualification: "View Your Qualification Prompt",
  presentation: "View Your Presentation Prompt",
  "objection-handling": "View Your Objection Handling Prompt",
  closing: "View Your Closing Prompt",
  "client-success": "View Your Client Success Prompt",
};

export default function ImplementationGuideDialog({ trigger, businessIdea }: ImplementationGuideDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<CompletedSteps>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate customized sections based on business idea
  const implementationSections = useMemo(() => {
    return generateCustomizedSections(businessIdea);
  }, [businessIdea]);

  // Load progress from localStorage as fallback
  const loadLocalProgress = useCallback((): CompletedSteps => {
    try {
      const saved = localStorage.getItem(getStorageKey(businessIdea?.id));
      if (saved) {
        const parsed = JSON.parse(saved);
        const result: CompletedSteps = {};
        for (const [key, value] of Object.entries(parsed)) {
          result[key] = new Set(value as string[]);
        }
        return result;
      }
    } catch (e) {
      console.error("Error loading local progress:", e);
    }
    return {};
  }, [businessIdea?.id]);

  // Save progress to localStorage as fallback
  const saveLocalProgress = useCallback((progress: CompletedSteps) => {
    try {
      const toSave: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(progress)) {
        toSave[key] = Array.from(value);
      }
      localStorage.setItem(getStorageKey(businessIdea?.id), JSON.stringify(toSave));
    } catch (e) {
      console.error("Error saving local progress:", e);
    }
  }, [businessIdea?.id]);

  // Load progress from database
  const loadCloudProgress = useCallback(async (): Promise<CompletedSteps> => {
    if (!user) return {};
    
    try {
      let query = supabase
        .from("implementation_progress")
        .select("section_id, completed_steps")
        .eq("user_id", user.id);

      // Filter by business idea if provided
      if (businessIdea?.id) {
        query = query.eq("business_idea_id", businessIdea.id);
      } else {
        query = query.is("business_idea_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const result: CompletedSteps = {};
      for (const row of data || []) {
        result[row.section_id] = new Set(row.completed_steps || []);
      }
      return result;
    } catch (e) {
      console.error("Error loading cloud progress:", e);
      return {};
    }
  }, [user, businessIdea?.id]);

  // Save progress to database
  const saveCloudProgress = useCallback(async (sectionId: string, steps: Set<string>) => {
    if (!user) return;

    setIsSyncing(true);
    try {
      // First check if record exists
      let query = supabase
        .from("implementation_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("section_id", sectionId);

      if (businessIdea?.id) {
        query = query.eq("business_idea_id", businessIdea.id);
      } else {
        query = query.is("business_idea_id", null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("implementation_progress")
          .update({
            completed_steps: Array.from(steps),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("implementation_progress")
          .insert({
            user_id: user.id,
            section_id: sectionId,
            completed_steps: Array.from(steps),
            business_idea_id: businessIdea?.id || null,
          });

        if (error) throw error;
      }
    } catch (e) {
      console.error("Error saving cloud progress:", e);
      toast.error("Failed to sync progress");
    } finally {
      setIsSyncing(false);
    }
  }, [user, businessIdea?.id]);

  // Load progress on mount and when business idea changes
  useEffect(() => {
    const loadProgress = async () => {
      setIsLoading(true);
      // Reset completed steps when business idea changes
      setCompletedSteps({});
      
      if (user) {
        const cloudProgress = await loadCloudProgress();
        if (Object.keys(cloudProgress).length > 0) {
          setCompletedSteps(cloudProgress);
          saveLocalProgress(cloudProgress);
        } else {
          // Load from local storage
          const localProgress = loadLocalProgress();
          if (Object.keys(localProgress).length > 0) {
            setCompletedSteps(localProgress);
            // Sync local to cloud
            for (const [sectionId, steps] of Object.entries(localProgress)) {
              await saveCloudProgress(sectionId, steps);
            }
          }
        }
      } else {
        setCompletedSteps(loadLocalProgress());
      }
      setIsLoading(false);
    };
    loadProgress();
  }, [user, businessIdea?.id, loadCloudProgress, loadLocalProgress, saveLocalProgress, saveCloudProgress]);

  const toggleStep = (sectionId: string, stepIndex: number) => {
    setCompletedSteps((prev) => {
      const newProgress = { ...prev };
      const stepKey = `step-${stepIndex}`;
      
      if (!newProgress[sectionId]) {
        newProgress[sectionId] = new Set();
      } else {
        newProgress[sectionId] = new Set(prev[sectionId]);
      }

      if (newProgress[sectionId].has(stepKey)) {
        newProgress[sectionId].delete(stepKey);
      } else {
        newProgress[sectionId].add(stepKey);
      }

      // Save to both local and cloud
      saveLocalProgress(newProgress);
      saveCloudProgress(sectionId, newProgress[sectionId]);
      
      return newProgress;
    });
  };

  const getSectionProgress = (sectionId: string, totalSteps: number) => {
    const completed = completedSteps[sectionId]?.size || 0;
    return { completed, total: totalSteps, percentage: totalSteps > 0 ? (completed / totalSteps) * 100 : 0 };
  };

  const getTotalProgress = () => {
    let totalCompleted = 0;
    let totalSteps = 0;
    implementationSections.forEach((section) => {
      totalCompleted += completedSteps[section.id]?.size || 0;
      totalSteps += section.setupSteps.length;
    });
    return { completed: totalCompleted, total: totalSteps, percentage: totalSteps > 0 ? (totalCompleted / totalSteps) * 100 : 0 };
  };

  const isStepCompleted = (sectionId: string, stepIndex: number) => {
    return completedSteps[sectionId]?.has(`step-${stepIndex}`) || false;
  };

  const totalProgress = getTotalProgress();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Wrench className="w-4 h-4" />
            Implementation Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            {businessIdea ? (
              <span>Implementation Guide: {businessIdea.businessName}</span>
            ) : (
              <span>Sales Automation Implementation Guide</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {businessIdea ? (
              <span>Customized tools, setup instructions, and automation tips for <strong>{businessIdea.businessName}</strong>.</span>
            ) : (
              <span>Tools, setup instructions, and automation tips for each stage of your sales process.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Overall Progress */}
        <div className="border border-border/50 rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {businessIdea ? `Progress for ${businessIdea.businessName}` : "Overall Progress"}
              </span>
              {user && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3" />
                      <span>{businessIdea ? "Saved to this idea" : "Synced"}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${totalProgress.completed} / ${totalProgress.total} steps completed`}
            </span>
          </div>
          <Progress value={isLoading ? 0 : totalProgress.percentage} className="h-2" />
          {totalProgress.percentage === 100 && !isLoading && (
            <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'hsl(var(--primary))' }}>
              <CheckCircle2 className="w-4 h-4" />
              <span>All steps completed! 🎉</span>
            </div>
          )}
        </div>

        <ScrollArea className="h-[55vh] pr-4">
          <Accordion type="single" collapsible className="w-full">
            {implementationSections.map((section) => {
              const progress = getSectionProgress(section.id, section.setupSteps.length);
              
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        progress.percentage === 100 
                          ? "bg-green-500/20 text-green-500" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {progress.percentage === 100 ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          section.icon
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">{section.title}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={progress.percentage} className="h-1.5 w-24" />
                          <span className="text-xs text-muted-foreground">
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-11 space-y-6">
                      <p className="text-muted-foreground">{section.description}</p>

                      {/* Tools */}
                      <div>
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-primary">
                          Recommended Tools
                        </h4>
                        <div className="grid gap-2">
                          {section.tools.map((tool) => (
                            <a
                              key={tool.name}
                              href={tool.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-medium">
                                  {tool.name}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {tool.description}
                                </span>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Setup Steps with Checkboxes */}
                      <div>
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-primary">
                          Setup Steps
                        </h4>
                        <ol className="space-y-3">
                          {section.setupSteps.map((step, index) => {
                            const completed = isStepCompleted(section.id, index);
                            const sectionPrompt = index === 0 ? extractSectionPrompt(businessIdea?.aiAutomationStrategy || null, section.id) : null;
                            const promptLabel = sectionPromptLabels[section.id] || "View Your Prompt";
                            return (
                              <li 
                                key={index} 
                                className={`flex gap-3 text-sm p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                                  completed ? "bg-green-500/10" : ""
                                }`}
                                onClick={() => toggleStep(section.id, index)}
                              >
                                <Checkbox
                                  checked={completed}
                                  onCheckedChange={() => toggleStep(section.id, index)}
                                  className="mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 flex flex-col gap-2">
                                  <span className={`${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    <span className="font-medium text-primary mr-2">{index + 1}.</span>
                                    {step}
                                  </span>
                                  {sectionPrompt && (
                                    <Popover>
                                      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-fit gap-2 text-xs"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {promptLabel}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent 
                                        className="w-96 max-h-64 overflow-auto" 
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-sm">{section.title} Strategy</h4>
                                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {sectionPrompt}
                                          </p>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {/* Automation Tips */}
                      <div>
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-primary">
                          Automation Tips
                        </h4>
                        <ul className="space-y-2">
                          {section.automationTips.map((tip, index) => (
                            <li key={index} className="flex gap-3 text-sm">
                              <span className="text-primary">•</span>
                              <span className="text-muted-foreground">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
