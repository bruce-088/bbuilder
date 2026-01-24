import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Copy, 
  Check, 
  Target, 
  Users, 
  Presentation, 
  Shield, 
  Handshake, 
  Heart,
  Workflow,
  ExternalLink,
  Zap,
  ArrowRight,
  Cloud,
  Clock,
  Loader2,
  Bot
} from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BusinessIdeaData {
  id: string;
  businessName: string;
  niche?: string;
  targetAudience?: string;
  valueProposition?: string;
  serviceOffering?: string;
  aiAutomationStrategy?: Json;
}

interface N8nAutomationGuideDialogProps {
  trigger?: React.ReactNode;
  businessIdea: BusinessIdeaData;
}

interface SetupStep {
  text: string;
  links?: { label: string; url: string }[];
}

interface AutomationStage {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  estimatedTime: string;
  n8nNodes: string[];
  workflowPrompt: string;
  setupSteps: SetupStep[];
}

type CompletedSteps = Record<string, Set<string>>;

const generateAutomationStages = (businessIdea: BusinessIdeaData): AutomationStage[] => {
  const { businessName, niche, targetAudience, serviceOffering, valueProposition } = businessIdea;

  return [
    {
      id: "n8n-prospecting",
      title: "Lead Prospecting & Discovery",
      icon: <Target className="w-5 h-5" />,
      description: `Automate finding and enriching leads for ${businessName}`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Schedule Trigger (daily/weekly)",
        "HTTP Request → Apollo.io API",
        "HTTP Request → Hunter.io for email verification",
        "Google Sheets / Airtable → Store leads",
        "IF Node → Filter by ICP criteria",
        "Set Node → Format lead data"
      ],
      workflowPrompt: `Create an n8n workflow for ${businessName} that:
1. Runs on a daily schedule at 9 AM
2. Calls Apollo.io API to search for ${targetAudience} in the ${niche} space
3. Filters leads by company size (10-500 employees), industry relevance, and job title
4. Enriches each lead with Hunter.io to verify email addresses
5. Scores leads 1-10 based on fit with ICP: ${targetAudience}
6. Adds qualified leads (score >= 7) to a Google Sheet with columns: Name, Email, Company, Title, Score, LinkedIn URL
7. Sends a Slack notification with daily prospecting summary

Trigger: Schedule Trigger
Key Nodes: HTTP Request, IF, Set, Google Sheets, Slack`,
      setupSteps: [
        { text: "Sign up for Apollo.io and get your API key", links: [{ label: "Apollo.io", url: "https://www.apollo.io" }] },
        { text: "Create a Hunter.io account for email verification", links: [{ label: "Hunter.io", url: "https://hunter.io" }] },
        { text: "Set up a Google Sheet with lead columns", links: [{ label: "Google Sheets", url: "https://sheets.google.com" }] },
        { text: "In n8n, create a new workflow and add Schedule Trigger", links: [{ label: "n8n", url: "https://n8n.io" }] },
        { text: "Add HTTP Request nodes for Apollo.io and Hunter.io", links: [{ label: "Apollo.io", url: "https://www.apollo.io" }, { label: "Hunter.io", url: "https://hunter.io" }] },
        { text: "Use IF nodes to filter by your ICP criteria" },
        { text: "Connect to Google Sheets to store qualified leads", links: [{ label: "Google Sheets", url: "https://sheets.google.com" }] }
      ]
    },
    {
      id: "n8n-outreach",
      title: "Outreach & Follow-up",
      icon: <Users className="w-5 h-5" />,
      description: `Automated email sequences for ${targetAudience}`,
      estimatedTime: "3-4 hours",
      n8nNodes: [
        "Google Sheets Trigger (new row)",
        "Wait Node (delays between emails)",
        "Gmail / SendGrid Node",
        "IF Node → Check for replies",
        "HTTP Request → CRM update",
        "Merge Node → Handle responses"
      ],
      workflowPrompt: `Create an n8n outreach workflow for ${businessName} that:
1. Triggers when a new lead is added to the prospecting sheet
2. Sends personalized cold email #1 introducing ${serviceOffering}
3. Waits 3 days, then checks for replies
4. If no reply: Sends follow-up email #2 with a case study
5. Waits 4 days, then checks again
6. If no reply: Sends final email #3 with a specific offer
7. If reply detected: Moves lead to "Responded" sheet and notifies via Slack
8. Updates CRM with email status after each step

Email personalization should include:
- First name and company name
- Reference to their role as ${targetAudience}
- Value proposition: ${valueProposition}

Trigger: Google Sheets (new row)
Key Nodes: Gmail, Wait, IF, Set, Slack`,
      setupSteps: [
        { text: "Connect your Gmail or SendGrid account to n8n", links: [{ label: "Gmail", url: "https://mail.google.com" }, { label: "SendGrid", url: "https://sendgrid.com" }, { label: "n8n", url: "https://n8n.io" }] },
        { text: "Create email templates with {{firstName}}, {{company}} variables" },
        { text: "Set up a 'Responded' sheet for engaged leads" },
        { text: "Configure Wait nodes with appropriate delays (3-4 days)" },
        { text: "Add IF nodes to check for email replies" },
        { text: "Connect Slack for real-time notifications", links: [{ label: "Slack", url: "https://slack.com" }] }
      ]
    },
    {
      id: "n8n-qualification",
      title: "Qualification & Discovery",
      icon: <Presentation className="w-5 h-5" />,
      description: `Qualify and schedule calls with ${targetAudience}`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Webhook Trigger (Calendly/Typeform)",
        "HTTP Request → Calendly API",
        "Set Node → Score lead",
        "IF Node → Route by score",
        "Notion / Google Docs → Create prep doc",
        "Gmail → Send confirmation"
      ],
      workflowPrompt: `Create an n8n qualification workflow for ${businessName} that:
1. Triggers when someone books a discovery call via Calendly
2. Fetches the qualification form responses from Typeform
3. Scores the lead based on:
   - Company size and fit with ${niche}
   - Budget indicators
   - Timeline urgency
   - Alignment with ${serviceOffering}
4. Creates a call prep document in Notion with:
   - Lead info and company research
   - Qualification score and reasoning
   - Suggested talking points for ${valueProposition}
5. Sends personalized confirmation email with agenda
6. If high score (8+): Alerts sales team via Slack with priority flag
7. Adds meeting to team calendar with prep doc link

Trigger: Webhook (Calendly booking)
Key Nodes: HTTP Request, Set, Notion, Gmail, Slack`,
      setupSteps: [
        { text: "Set up Calendly with embedded Typeform for qualification", links: [{ label: "Calendly", url: "https://calendly.com" }, { label: "Typeform", url: "https://www.typeform.com" }] },
        { text: "Create a Notion database for call prep documents", links: [{ label: "Notion", url: "https://www.notion.so" }] },
        { text: "Define scoring criteria based on your ICP" },
        { text: "Configure webhook in n8n to receive Calendly events", links: [{ label: "n8n", url: "https://n8n.io" }, { label: "Calendly", url: "https://calendly.com" }] },
        { text: "Build the scoring logic with Set and IF nodes" },
        { text: "Connect Gmail for automated confirmations", links: [{ label: "Gmail", url: "https://mail.google.com" }] }
      ]
    },
    {
      id: "n8n-proposal",
      title: "Proposal & Presentation",
      icon: <Shield className="w-5 h-5" />,
      description: `Auto-generate proposals for ${serviceOffering}`,
      estimatedTime: "3-4 hours",
      n8nNodes: [
        "Webhook / Form Trigger",
        "HTTP Request → AI API (proposal generation)",
        "PandaDoc API → Create proposal",
        "Google Drive → Store proposal",
        "Gmail → Send proposal link",
        "Wait + IF → Track opens"
      ],
      workflowPrompt: `Create an n8n proposal automation workflow for ${businessName} that:
1. Triggers when a discovery call is marked "Qualified" in CRM
2. Fetches call notes and lead data from Notion/CRM
3. Uses AI (OpenAI/Claude) to generate a customized proposal including:
   - Executive summary tailored to their ${niche} challenges
   - How ${serviceOffering} solves their specific problems
   - ${valueProposition} with relevant case studies
   - Pricing options and timeline
4. Creates the proposal in PandaDoc with auto-filled fields
5. Stores PDF backup in Google Drive
6. Sends proposal email with tracking link
7. Monitors for proposal views - if opened but not signed after 3 days:
   - Sends follow-up email
   - Alerts sales rep via Slack
8. When signed: Triggers onboarding workflow

Trigger: CRM Webhook (deal stage change)
Key Nodes: HTTP Request, AI, PandaDoc API, Gmail, Wait, IF`,
      setupSteps: [
        { text: "Create a PandaDoc template with variable fields", links: [{ label: "PandaDoc", url: "https://www.pandadoc.com" }] },
        { text: "Set up AI prompt for proposal content generation" },
        { text: "Configure CRM webhook for deal stage changes" },
        { text: "Add tracking to monitor proposal engagement" },
        { text: "Create follow-up email templates" },
        { text: "Link to your onboarding workflow trigger" }
      ]
    },
    {
      id: "n8n-closing",
      title: "Payment & Invoicing",
      icon: <Handshake className="w-5 h-5" />,
      description: `Automate contracts and payments for ${businessName}`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Webhook Trigger (PandaDoc signed)",
        "HTTP Request → Stripe API",
        "DocuSign / PandaDoc → Contract",
        "Airtable → Update deal status",
        "Gmail → Send receipt",
        "Slack → Notify team"
      ],
      workflowPrompt: `Create an n8n closing automation workflow for ${businessName} that:
1. Triggers when a proposal is signed in PandaDoc/DocuSign
2. Creates a Stripe customer with client details
3. Generates an invoice based on proposal pricing for ${serviceOffering}
4. Sends payment link via email
5. Monitors payment status - if not paid within 48 hours:
   - Sends payment reminder
   - Alerts account manager
6. When payment received:
   - Updates CRM deal to "Closed Won"
   - Sends payment receipt and welcome email
   - Creates client folder in Google Drive
   - Adds to client database in Airtable
   - Notifies team via Slack with celebration 🎉
   - Triggers client onboarding workflow
7. Generates monthly revenue report

Trigger: Webhook (document signed)
Key Nodes: Stripe, Gmail, Google Drive, Airtable, Slack`,
      setupSteps: [
        { text: "Connect Stripe account to n8n", links: [{ label: "Stripe", url: "https://stripe.com" }, { label: "n8n", url: "https://n8n.io" }] },
        { text: "Set up PandaDoc/DocuSign webhook for signatures", links: [{ label: "PandaDoc", url: "https://www.pandadoc.com" }, { label: "DocuSign", url: "https://www.docusign.com" }] },
        { text: "Create welcome email template" },
        { text: "Configure client folder structure in Google Drive", links: [{ label: "Google Drive", url: "https://drive.google.com" }] },
        { text: "Set up Airtable base for client management", links: [{ label: "Airtable", url: "https://airtable.com" }] },
        { text: "Create Slack channel for closed deals", links: [{ label: "Slack", url: "https://slack.com" }] }
      ]
    },
    {
      id: "n8n-client-success",
      title: "Client Success & Retention",
      icon: <Heart className="w-5 h-5" />,
      description: `Nurture ${targetAudience} for renewals and referrals`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Schedule Trigger (weekly/monthly)",
        "Airtable → Get active clients",
        "HTTP Request → Usage/health data",
        "IF Node → Churn risk check",
        "Gmail → Check-in emails",
        "Typeform → NPS surveys"
      ],
      workflowPrompt: `Create an n8n client success workflow for ${businessName} that:
1. Runs weekly to check on all active ${serviceOffering} clients
2. Fetches client health metrics:
   - Last login/engagement date
   - Feature usage stats
   - Support ticket history
3. Calculates health score (1-10) based on engagement
4. For at-risk clients (score < 6):
   - Sends proactive check-in email
   - Alerts account manager via Slack
   - Creates task in project management tool
5. At 30/60/90 day milestones:
   - Sends NPS survey via Typeform
   - Requests testimonial if NPS >= 8
   - Asks for referrals if NPS >= 9
6. 60 days before renewal:
   - Sends renewal reminder sequence
   - Schedules QBR call
   - Prepares renewal proposal with usage stats
7. Tracks and reports on:
   - Monthly retention rate
   - NPS trends
   - Referral conversions

Trigger: Schedule Trigger (weekly)
Key Nodes: Airtable, HTTP Request, IF, Gmail, Typeform, Slack`,
      setupSteps: [
        { text: "Set up client tracking in Airtable with health metrics", links: [{ label: "Airtable", url: "https://airtable.com" }] },
        { text: "Create NPS survey in Typeform", links: [{ label: "Typeform", url: "https://www.typeform.com" }] },
        { text: "Define health score calculation logic" },
        { text: "Write check-in email templates for different scenarios" },
        { text: "Configure renewal reminder sequence" },
        { text: "Set up reporting dashboard in Google Sheets", links: [{ label: "Google Sheets", url: "https://sheets.google.com" }] }
      ]
    }
  ];
};

// Helper function to render step text with clickable links
const renderStepWithLinks = (step: SetupStep): React.ReactNode => {
  if (!step.links || step.links.length === 0) {
    return step.text;
  }

  let result: React.ReactNode[] = [];
  let remainingText = step.text;
  let keyIndex = 0;

  step.links.forEach((link) => {
    const index = remainingText.indexOf(link.label);
    if (index !== -1) {
      // Add text before the link
      if (index > 0) {
        result.push(<span key={`text-${keyIndex++}`}>{remainingText.substring(0, index)}</span>);
      }
      // Add the link
      result.push(
        <a
          key={`link-${keyIndex++}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {link.label}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
      // Update remaining text
      remainingText = remainingText.substring(index + link.label.length);
    }
  });

  // Add any remaining text
  if (remainingText) {
    result.push(<span key={`text-${keyIndex++}`}>{remainingText}</span>);
  }

  return result.length > 0 ? result : step.text;
};

export default function N8nAutomationGuideDialog({ trigger, businessIdea }: N8nAutomationGuideDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<CompletedSteps>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const stages = generateAutomationStages(businessIdea);

  const handleExportForAI = () => {
    setOpen(false);
    navigate("/export-computer-use-prompt");
  };

  // Calculate overall progress
  const totalSteps = stages.reduce((acc, stage) => acc + stage.setupSteps.length, 0);
  const completedCount = Object.values(completedSteps).reduce(
    (acc, set) => acc + set.size,
    0
  );
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Load progress from database
  const loadProgress = useCallback(async () => {
    if (!user || !businessIdea.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("implementation_progress")
        .select("section_id, completed_steps")
        .eq("user_id", user.id)
        .eq("business_idea_id", businessIdea.id)
        .like("section_id", "n8n-%");

      if (error) throw error;

      const result: CompletedSteps = {};
      for (const row of data || []) {
        result[row.section_id] = new Set(row.completed_steps || []);
      }
      setCompletedSteps(result);
    } catch (e) {
      console.error("Error loading progress:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, businessIdea.id]);

  // Save progress to database
  const saveProgress = useCallback(async (sectionId: string, steps: Set<string>) => {
    if (!user || !businessIdea.id) return;

    setIsSyncing(true);
    try {
      const { data: existing } = await supabase
        .from("implementation_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("section_id", sectionId)
        .eq("business_idea_id", businessIdea.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("implementation_progress")
          .update({
            completed_steps: Array.from(steps),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("implementation_progress")
          .insert({
            user_id: user.id,
            section_id: sectionId,
            completed_steps: Array.from(steps),
            business_idea_id: businessIdea.id,
          });
      }
    } catch (e) {
      console.error("Error saving progress:", e);
      toast.error("Failed to sync progress");
    } finally {
      setIsSyncing(false);
    }
  }, [user, businessIdea.id]);

  // Load progress when dialog opens
  useEffect(() => {
    if (open && user) {
      loadProgress();
    }
  }, [open, user, loadProgress]);

  const toggleStep = (sectionId: string, stepIndex: number) => {
    const stepKey = `step-${stepIndex}`;
    setCompletedSteps(prev => {
      const sectionSteps = new Set(prev[sectionId] || []);
      if (sectionSteps.has(stepKey)) {
        sectionSteps.delete(stepKey);
        // Also remove stage-complete if unchecking a step
        sectionSteps.delete('stage-complete');
      } else {
        sectionSteps.add(stepKey);
      }
      
      // Save to database
      saveProgress(sectionId, sectionSteps);
      
      return { ...prev, [sectionId]: sectionSteps };
    });
  };

  const isStepCompleted = (sectionId: string, stepIndex: number): boolean => {
    return completedSteps[sectionId]?.has(`step-${stepIndex}`) || false;
  };

  const isStageComplete = (sectionId: string): boolean => {
    return completedSteps[sectionId]?.has('stage-complete') || false;
  };

  const areAllStepsCompleted = (sectionId: string, totalSteps: number): boolean => {
    const sectionSet = completedSteps[sectionId];
    if (!sectionSet) return false;
    for (let i = 0; i < totalSteps; i++) {
      if (!sectionSet.has(`step-${i}`)) return false;
    }
    return true;
  };

  const markStageComplete = (sectionId: string, totalSteps: number) => {
    if (!areAllStepsCompleted(sectionId, totalSteps)) {
      toast.error("Please complete all setup steps before marking this stage as complete");
      return;
    }
    
    setCompletedSteps(prev => {
      const sectionSteps = new Set(prev[sectionId] || []);
      sectionSteps.add('stage-complete');
      
      // Save to database
      saveProgress(sectionId, sectionSteps);
      
      toast.success("Stage marked as complete! 🎉");
      return { ...prev, [sectionId]: sectionSteps };
    });
  };

  const getSectionProgress = (sectionId: string, totalSteps: number): number => {
    const sectionSet = completedSteps[sectionId];
    if (!sectionSet) return 0;
    // Count only step-X entries, not stage-complete
    let completed = 0;
    for (let i = 0; i < totalSteps; i++) {
      if (sectionSet.has(`step-${i}`)) completed++;
    }
    return totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Workflow className="w-4 h-4" />
            Full Automation Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              n8n Full Automation Setup Guide
            </DialogTitle>
            <DialogDescription>
              Step-by-step instructions to automate your entire sales workflow for{" "}
              <span className="font-medium text-foreground">{businessIdea.businessName}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Overall Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3" />
                    Progress saved
                  </>
                )}
              </span>
              <span className="font-medium">
                {completedCount} / {totalSteps} steps ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {/* Quick Start Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Quick Start</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Copy each workflow prompt below and paste it into n8n's AI workflow builder, or use it as a guide to build manually.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open("https://n8n.io", "_blank")}
                      >
                        Open n8n <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2"
                        onClick={handleExportForAI}
                      >
                        <Bot className="w-3 h-3" />
                        Export for AI Agent
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {stages.map((stage, index) => {
                  const sectionProgress = getSectionProgress(stage.id, stage.setupSteps.length);
                  const stageComplete = isStageComplete(stage.id);
                  const allStepsDone = areAllStepsCompleted(stage.id, stage.setupSteps.length);
                  // Count only actual steps for display
                  let stepsCompleted = 0;
                  for (let i = 0; i < stage.setupSteps.length; i++) {
                    if (isStepCompleted(stage.id, i)) stepsCompleted++;
                  }
                  
                  return (
                    <AccordionItem
                      key={stage.id}
                      value={stage.id}
                      className={`border rounded-lg px-4 bg-card ${stageComplete ? 'border-green-500/50 bg-green-500/5' : ''}`}
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left flex-1">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${stageComplete ? 'bg-green-500/20 text-green-500' : 'bg-primary/10 text-primary'}`}>
                            {stageComplete ? <Check className="w-5 h-5" /> : stage.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                Stage {index + 1}
                              </Badge>
                              <span className="font-medium">{stage.title}</span>
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Clock className="w-3 h-3" />
                                {stage.estimatedTime}
                              </Badge>
                              {stageComplete && (
                                <Badge className="bg-green-500 text-white text-xs gap-1">
                                  <Check className="w-3 h-3" />
                                  Validated
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {stage.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={sectionProgress} className={`h-1.5 flex-1 max-w-32 ${stageComplete ? '[&>div]:bg-green-500' : ''}`} />
                              <span className="text-xs text-muted-foreground">
                                {stepsCompleted}/{stage.setupSteps.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        {/* n8n Nodes */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Workflow className="w-4 h-4 text-primary" />
                            Required n8n Nodes
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {stage.n8nNodes.map((node, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {node}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Workflow Prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              Workflow Prompt (Copy & Paste into n8n)
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 h-8"
                              onClick={() => copyToClipboard(stage.workflowPrompt, `prompt-${stage.id}`)}
                            >
                              {copiedId === `prompt-${stage.id}` ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy Prompt
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
                            {stage.workflowPrompt}
                          </div>
                        </div>

                        {/* Setup Steps with Checkboxes */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-primary" />
                            Setup Steps
                          </h4>
                          <ol className="space-y-2">
                            {stage.setupSteps.map((step, i) => {
                              const completed = isStepCompleted(stage.id, i);
                              return (
                                <li 
                                  key={i} 
                                  className="flex items-start gap-3 text-sm group cursor-pointer"
                                  onClick={(e) => {
                                    // Don't toggle if clicking a link
                                    if ((e.target as HTMLElement).tagName === 'A') return;
                                    toggleStep(stage.id, i);
                                  }}
                                >
                                  <Checkbox
                                    checked={completed}
                                    onCheckedChange={() => toggleStep(stage.id, i)}
                                    className="mt-0.5"
                                  />
                                  <span className={`flex-1 ${completed ? "line-through text-muted-foreground" : ""}`}>
                                    {renderStepWithLinks(step)}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>

                        {/* Mark Stage Complete Button */}
                        <div className="pt-4 border-t">
                          {stageComplete ? (
                            <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                              <Check className="w-4 h-4" />
                              Stage validated and complete
                            </div>
                          ) : (
                            <Button
                              onClick={() => markStageComplete(stage.id, stage.setupSteps.length)}
                              disabled={!allStepsDone}
                              className={allStepsDone ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                              variant={allStepsDone ? 'default' : 'outline'}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {allStepsDone ? 'Mark Stage Complete' : `Complete all ${stage.setupSteps.length - stepsCompleted} remaining steps first`}
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}

            {/* Footer Tips */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Start with Stage 1 (Prospecting) and build incrementally</li>
                  <li>• Test each workflow with sample data before going live</li>
                  <li>• Use n8n's built-in error handling for reliable automations</li>
                  <li>• Connect workflows together using webhooks for end-to-end automation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
