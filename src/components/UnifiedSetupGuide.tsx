import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Target,
  Mail,
  Phone,
  DollarSign,
  Zap,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Clock,
  ExternalLink,
  Sparkles,
  Bot,
  Mic,
  Rocket,
  RotateCcw,
  Flame,
  Trophy,
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { useManualProgress } from "@/hooks/useManualProgress";
import CourseStepView, { type CourseStep } from "@/components/SetupGuide/CourseStepView";
import { celebrateLevelUp } from "@/lib/confetti";
import { motion, AnimatePresence } from "framer-motion";

interface BusinessIdeaData {
  id: string;
  businessName: string;
  niche?: string;
  targetAudience?: string;
  valueProposition?: string;
  serviceOffering?: string;
  aiAutomationStrategy?: Json;
}

interface UnifiedSetupGuideProps {
  trigger?: React.ReactNode;
  businessIdea?: BusinessIdeaData;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export interface CapabilityArea {
  id: string;
  title: string;
  icon: React.ElementType;
  categoryOutcome: string;
  manual: {
    tools: { name: string; url?: string }[];
    steps: CourseStep[];
    estimatedTime: string;
  };
  mya: {
    commands: string[];
    tools: string[];
    description: string;
  };
}

export const capabilities: CapabilityArea[] = [
  {
    id: "lead-gen",
    title: "Lead Generation",
    icon: Users,
    categoryOutcome: "A pipeline of 50+ qualified prospects ready for outreach",
    manual: {
      tools: [
        { name: "Apollo.io", url: "https://apollo.io" },
        { name: "Hunter.io", url: "https://hunter.io" },
        { name: "LinkedIn Sales Navigator" },
        { name: "Google Sheets" },
      ],
      steps: [
        { text: "Sign up for Apollo.io or Hunter.io account", why: "These tools give you access to millions of verified business contacts so you can find decision-makers fast.", helpPrompt: "Help me choose between Apollo.io and Hunter.io for lead generation", relevantTools: ["Apollo.io", "Hunter.io"], outcome: "Access to millions of verified business contacts" },
        { text: "Set up search filters for your target audience", why: "Precise filters ensure you only prospect people who match your ideal customer profile — saving hours of wasted outreach.", helpPrompt: "Help me define search filters for my target audience", outcome: "A laser-focused filter that surfaces only your ideal buyers" },
        { text: "Export leads to a spreadsheet", why: "A clean export gives you a working list you can sort, enrich, and prioritize before outreach.", helpPrompt: "What fields should I export for my lead spreadsheet?", relevantTools: ["Google Sheets"], outcome: "A working list of 50+ decision-makers with contact info" },
        { text: "Clean and deduplicate the data", why: "Duplicate or malformed data leads to embarrassing double-emails and wasted effort.", helpPrompt: "Help me clean and deduplicate my lead data", outcome: "A clean, verified prospect list with zero duplicates" },
        { text: "Import leads into your CRM", why: "Centralizing leads in one place lets you track every interaction and never lose a prospect.", helpPrompt: "How do I import leads into a CRM?", outcome: "All your prospects in one place, ready for outreach", inAppAction: { label: "Open Lead Tracker", route: "/leads" } },
      ],
      estimatedTime: "2-4 hours",
    },
    mya: {
      commands: ['"Add a lead named Sarah from Acme Corp"', '"Show me all my leads"', '"What does my pipeline look like?"'],
      tools: ["add_lead", "list_leads", "get_pipeline_stats"],
      description: "Mya adds leads directly to your CRM, tracks them through stages, and gives you instant pipeline analytics.",
    },
  },
  {
    id: "pipeline",
    title: "Pipeline Management",
    icon: Target,
    categoryOutcome: "A fully configured CRM with stages that track every deal from lead to close",
    manual: {
      tools: [
        { name: "HubSpot CRM", url: "https://hubspot.com" },
        { name: "Close CRM", url: "https://close.com" },
        { name: "Notion", url: "https://notion.so" },
        { name: "Spreadsheets" },
      ],
      steps: [
        { text: "Set up a CRM account and configure stages", why: "Defined stages (Lead → Qualified → Proposal → Closed) give you a clear view of where every deal stands.", helpPrompt: "Help me set up CRM stages for my business", relevantTools: ["HubSpot CRM", "Close CRM"], outcome: "A CRM with defined deal stages ready to use", inAppAction: { label: "Open Lead Tracker", route: "/leads" } },
        { text: "Create custom fields for your business", why: "Custom fields let you capture the specific data points that matter for your niche.", helpPrompt: "What custom fields should I create in my CRM?", outcome: "Custom fields tailored to your exact business needs" },
        { text: "Build pipeline views and dashboards", why: "Visual dashboards show bottlenecks at a glance so you know where deals are stalling.", helpPrompt: "Help me design a pipeline dashboard", outcome: "A visual dashboard showing your deal flow at a glance" },
        { text: "Train yourself on the CRM workflow", why: "Knowing your CRM inside out means you'll actually use it consistently instead of abandoning it.", helpPrompt: "Give me a quick CRM training plan", outcome: "Confidence to manage your CRM without guessing" },
        { text: "Manually move leads between stages", why: "Practicing the full flow ensures your process works before you start automating it.", helpPrompt: "How should I decide when to move a lead to the next stage?", outcome: "A tested, working sales process you can rely on", inAppAction: { label: "Open Lead Tracker", route: "/leads" } },
      ],
      estimatedTime: "3-5 hours",
    },
    mya: {
      commands: ['"Move Sarah to qualified"', '"Update John\'s email to john@company.com"', '"Delete the old test lead"'],
      tools: ["update_lead", "move_lead_stage", "delete_lead"],
      description: "Just tell Mya what changed. She moves leads through stages, updates fields, and logs every activity automatically.",
    },
  },
  {
    id: "outreach",
    title: "Outreach & Follow-up",
    icon: Mail,
    categoryOutcome: "An automated email sequence that runs while you sleep",
    manual: {
      tools: [
        { name: "SendGrid", url: "https://sendgrid.com" },
        { name: "Mailchimp", url: "https://mailchimp.com" },
        { name: "Gmail sequences" },
        { name: "Calendly", url: "https://calendly.com" },
      ],
      steps: [
        { text: "Set up email sending tool with domain verification", why: "Domain verification prevents your emails from landing in spam and builds sender reputation.", helpPrompt: "Help me set up email domain verification", relevantTools: ["SendGrid", "Mailchimp"], outcome: "A verified sending domain that lands in inboxes, not spam" },
        { text: "Write email templates for each sequence step", why: "Pre-written templates ensure consistent messaging and save time on every send.", helpPrompt: "Help me write cold outreach email templates", outcome: "A library of proven email templates ready to send" },
        { text: "Configure follow-up timing and triggers", why: "Automated timing ensures no lead goes cold because you forgot to follow up.", helpPrompt: "What's the best follow-up timing for cold outreach?", outcome: "Automated follow-ups that never let a lead go cold" },
        { text: "Set up calendar booking link", why: "A frictionless booking link converts interested prospects into actual meetings.", helpPrompt: "Help me set up a Calendly booking page", relevantTools: ["Calendly"], outcome: "A booking page that converts interest into meetings" },
        { text: "Connect tools together via Zapier or n8n", why: "Integration eliminates manual data entry between your email tool, CRM, and calendar.", helpPrompt: "How do I connect my outreach tools together?", outcome: "A fully connected outreach system with zero manual data entry" },
      ],
      estimatedTime: "4-6 hours",
    },
    mya: {
      commands: ['"Create a follow-up workflow for cold leads"', '"Schedule my outreach to run daily at 9am"', '"List my active workflows"'],
      tools: ["create_workflow", "schedule_workflow", "list_workflows"],
      description: "Mya creates automated outreach workflows and schedules them—no email tool setup needed.",
    },
  },
  {
    id: "qualification",
    title: "Qualification & Discovery",
    icon: Phone,
    categoryOutcome: "A repeatable qualification process that filters out tire-kickers fast",
    manual: {
      tools: [
        { name: "Typeform", url: "https://typeform.com" },
        { name: "Gong", url: "https://gong.io" },
        { name: "Fireflies.ai", url: "https://fireflies.ai" },
        { name: "Google Docs" },
      ],
      steps: [
        { text: "Create a qualification form or script", why: "A structured script ensures you ask the right questions and don't waste time on unqualified prospects.", helpPrompt: "Help me create a lead qualification script", relevantTools: ["Typeform"], outcome: "A qualification script that separates buyers from browsers" },
        { text: "Set up call recording tool", why: "Recordings let you review conversations for missed details and improve your pitch over time.", helpPrompt: "What call recording tool should I use?", relevantTools: ["Gong", "Fireflies.ai"], outcome: "Every call recorded and reviewable for coaching" },
        { text: "Build a scoring rubric", why: "Objective scoring removes gut-feel decisions and helps you prioritize the highest-value opportunities.", helpPrompt: "Help me build a lead scoring rubric", outcome: "An objective scoring system to rank your hottest leads" },
        { text: "Document each call's notes manually", why: "Written notes ensure key details are captured before memory fades.", helpPrompt: "What should I include in my call notes?", outcome: "Structured call notes that capture every important detail" },
        { text: "Update CRM with call outcomes", why: "Keeping CRM data current means your pipeline view is always accurate.", helpPrompt: "How should I log call outcomes in my CRM?", outcome: "An always-accurate pipeline reflecting real conversations" },
      ],
      estimatedTime: "2-3 hours",
    },
    mya: {
      commands: ['"Log a call with John about the proposal"', '"Add a note: Sarah loves our pricing"', '"What activities have happened with this lead?"'],
      tools: ["log_lead_activity"],
      description: "Tell Mya about calls, meetings, and notes. She logs everything to the lead's timeline automatically.",
    },
  },
  {
    id: "closing",
    title: "Proposals & Closing",
    icon: DollarSign,
    categoryOutcome: "A payment system that gets you paid the same day you close",
    manual: {
      tools: [
        { name: "PandaDoc", url: "https://pandadoc.com" },
        { name: "Stripe", url: "https://stripe.com" },
        { name: "DocuSign", url: "https://docusign.com" },
        { name: "PayPal" },
      ],
      steps: [
        { text: "Create proposal templates in PandaDoc", why: "Polished proposals increase close rates and save you from building documents from scratch each time.", helpPrompt: "Help me create a service proposal template", relevantTools: ["PandaDoc"], outcome: "Professional proposals you can send in under 5 minutes" },
        { text: "Set up Stripe or PayPal payment collection", why: "Easy payment collection reduces friction and gets you paid faster.", helpPrompt: "How do I set up Stripe for service payments?", relevantTools: ["Stripe"], outcome: "A payment link that gets you paid instantly" },
        { text: "Configure e-signature workflows", why: "Digital signatures eliminate printing/scanning delays and make closing instant.", helpPrompt: "Help me set up e-signatures for contracts", relevantTools: ["DocuSign"], outcome: "One-click contract signing for your clients" },
        { text: "Build invoice templates", why: "Professional invoices build trust and ensure you get paid on time.", helpPrompt: "What should I include in my invoice template?", outcome: "Branded invoices that look professional and get paid on time" },
        { text: "Track payments manually in a spreadsheet", why: "Revenue tracking shows your real progress toward $10K/month.", helpPrompt: "Help me set up a payment tracking spreadsheet", outcome: "Real-time visibility into your revenue growth" },
      ],
      estimatedTime: "3-5 hours",
    },
    mya: {
      commands: ['"I just closed $2000 from Acme Corp"', '"Log revenue of $500 from freelancing"', '"How\'s my revenue looking?"'],
      tools: ["log_revenue", "get_revenue_stats"],
      description: "Mya tracks every dollar—MRR, monthly totals, goal progress toward $10K/month. Just tell her when you get paid.",
    },
  },
  {
    id: "automation",
    title: "Automation & Workflows",
    icon: Zap,
    categoryOutcome: "Automated workflows that run your business while you sleep",
    manual: {
      tools: [
        { name: "n8n", url: "https://n8n.io" },
        { name: "Zapier", url: "https://zapier.com" },
        { name: "Make.com", url: "https://make.com" },
      ],
      steps: [
        { text: "Install and configure n8n (self-hosted or cloud)", why: "n8n is the backbone of your automation — everything else plugs into it.", helpPrompt: "Help me choose between self-hosted and cloud n8n", relevantTools: ["n8n"], outcome: "A running automation platform ready to build on" },
        { text: "Learn the node-based workflow builder", why: "Understanding nodes and connections lets you build any automation you can imagine.", helpPrompt: "Give me a quick tutorial on n8n's workflow builder", outcome: "The skills to build any workflow you can imagine", inAppAction: { label: "Open Workflow Builder", route: "/workflows" } },
        { text: "Set up webhook endpoints", why: "Webhooks let external tools trigger your workflows automatically in real-time.", helpPrompt: "How do I set up webhook endpoints in n8n?", outcome: "Live webhook endpoints that trigger workflows instantly" },
        { text: "Configure credentials for each service", why: "Proper credential setup ensures your workflows can securely access all your tools.", helpPrompt: "Help me configure n8n credentials", outcome: "Secure connections to all your business tools" },
        { text: "Build and test each workflow manually", why: "Testing each workflow before going live prevents embarrassing errors with real data.", helpPrompt: "How do I test my n8n workflows?", outcome: "Battle-tested workflows you can trust with real data", inAppAction: { label: "Open Workflow Builder", route: "/workflows" } },
        { text: "Set up cron schedules for recurring tasks", why: "Scheduled workflows run without you — true automation that works while you sleep.", helpPrompt: "Help me set up cron schedules in n8n", outcome: "Recurring automations that run on autopilot" },
      ],
      estimatedTime: "5-10 hours",
    },
    mya: {
      commands: ['"Create a webhook automation for new leads"', '"Schedule it for every weekday at 9am"', '"Trigger my outreach workflow"', '"Delete the old test workflow"'],
      tools: ["create_workflow", "trigger_workflow", "schedule_workflow", "delete_workflow", "list_workflows"],
      description: "Mya builds, schedules, triggers, and manages workflows entirely through conversation. No manual config needed.",
    },
  },
  {
    id: "analytics",
    title: "Analytics & Intelligence",
    icon: BarChart3,
    categoryOutcome: "A real-time dashboard showing exactly how your business is performing",
    manual: {
      tools: [
        { name: "Google Analytics", url: "https://analytics.google.com" },
        { name: "Spreadsheet dashboards" },
        { name: "Metabase", url: "https://metabase.com" },
      ],
      steps: [
        { text: "Set up analytics tracking on your site", why: "Tracking tells you where your visitors come from and what they do — the foundation of data-driven decisions.", helpPrompt: "Help me set up Google Analytics on my site", relevantTools: ["Google Analytics"], outcome: "Visitor tracking that shows you where your traffic comes from" },
        { text: "Build spreadsheet formulas for revenue tracking", why: "Revenue formulas give you instant visibility into MRR, growth rate, and trends.", helpPrompt: "Help me build revenue tracking formulas", outcome: "Instant MRR and growth rate calculations" },
        { text: "Create dashboard visualizations", why: "Visual dashboards surface patterns that raw numbers hide.", helpPrompt: "What metrics should I put on my dashboard?", relevantTools: ["Metabase"], outcome: "Visual dashboards that reveal trends at a glance" },
        { text: "Manually compile reports each week", why: "Regular reporting creates accountability and highlights what's working (and what isn't).", helpPrompt: "Help me create a weekly business report template", outcome: "A weekly reporting habit that keeps you accountable" },
        { text: "Cross-reference data from multiple tools", why: "Connecting data from CRM, email, and analytics reveals your true conversion funnel.", helpPrompt: "How do I cross-reference data across my tools?", outcome: "A complete picture of your conversion funnel" },
      ],
      estimatedTime: "3-5 hours",
    },
    mya: {
      commands: ['"How\'s my revenue this month?"', '"What\'s my conversion rate?"', '"Give me a business summary"', '"What\'s my pipeline value?"'],
      tools: ["get_revenue_stats", "get_pipeline_stats", "get_business_summary"],
      description: "Ask Mya anything about your business performance. She calculates stats in real-time from your actual data.",
    },
  },
];

const QUICK_LAUNCH_PROMPT =
  "Set up my business: add 3 sample leads, create a follow-up workflow, and give me a business summary";

export default function UnifiedSetupGuide({
  trigger,
  businessIdea,
  externalOpen,
  onExternalOpenChange,
}: UnifiedSetupGuideProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) {
      onExternalOpenChange?.(v);
    } else {
      setInternalOpen(v);
    }
  };
  const { toggleStep, markStepDone, getCompleted, isStepDone, getCurrentStep, getOverallProgress, resetProgress, hasAnyProgress } = useManualProgress(capabilities);

  const handleTryIt = (command: string) => {
    setOpen(false);
    navigate("/chat/new", {
      state: { initialPrompt: command.replace(/"/g, "") },
    });
  };

  const handleAskMya = (prompt: string) => {
    setOpen(false);
    navigate("/chat/new", {
      state: { initialPrompt: prompt },
    });
  };

  const handleQuickLaunch = () => {
    setOpen(false);
    navigate("/chat/new", {
      state: { initialPrompt: QUICK_LAUNCH_PROMPT },
    });
  };

  const totalManualHours = "23-41";
  const totalManualTools = 20;
  const overall = getOverallProgress();
  const allComplete = overall.completed === overall.total && overall.total > 0;
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    if (allComplete && !celebrated) {
      celebrateLevelUp();
      setCelebrated(true);
    }
  }, [allComplete, celebrated]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Setup Guide
          </DialogTitle>
          <DialogDescription>
            Two paths to your $10K/month business. Do it manually with{" "}
            {totalManualTools}+ tools and {totalManualHours} hours of setup — or
            just chat with Mya.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="side-by-side" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="side-by-side" className="flex-1">
              Side-by-Side
            </TabsTrigger>
            <TabsTrigger value="mya" className="flex-1">
              Quick Start with Mya
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Interactive Course
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 mt-4 -mx-6 px-6 [&>[data-radix-scroll-area-viewport]]:max-h-[55vh]">
            {/* Side by Side */}
            <TabsContent value="side-by-side" className="mt-0">
              {hasAnyProgress && (
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetProgress}
                    className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Progress
                  </Button>
                </div>
              )}
              <Accordion type="multiple" defaultValue={["lead-gen"]} className="space-y-2">
                {capabilities.map((cap) => (
                  <AccordionItem
                    key={cap.id}
                    value={cap.id}
                    className="border border-border/50 rounded-lg px-3 data-[state=open]:bg-card/50"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <cap.icon className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{cap.title}</span>
                        {getCompleted(cap.id, cap.manual.steps.length) > 0 && (
                          <Badge variant="secondary" className="text-xs ml-auto mr-2">
                            {getCompleted(cap.id, cap.manual.steps.length)}/{cap.manual.steps.length}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                        {/* Manual Column — Course View */}
                        <Card className="bg-secondary/30 border-border/30">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Manual Path
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {cap.manual.estimatedTime}
                              </Badge>
                            </div>
                            <CourseStepView
                              capId={cap.id}
                              title={cap.title}
                              steps={cap.manual.steps}
                              tools={cap.manual.tools}
                              currentStepIndex={getCurrentStep(cap.id, cap.manual.steps.length)}
                              isStepDone={isStepDone}
                              onMarkComplete={markStepDone}
                              onAskMya={handleAskMya}
                              categoryOutcome={cap.categoryOutcome}
                            />
                            {/* Bridge CTA */}
                            <button
                              onClick={() => handleTryIt(cap.mya.commands[0])}
                              className="mt-2 w-full text-left text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                            >
                              <Bot className="w-3 h-3" />
                              <span>Or skip the rest — tell Mya: <em className="text-primary">{cap.mya.commands[0]}</em></span>
                            </button>
                          </CardContent>
                        </Card>

                        {/* Mya Column */}
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                                Mya Path
                              </span>
                              <Badge className="text-xs bg-primary/20 text-primary border-0">
                                <Bot className="w-3 h-3 mr-1" />
                                Just chat
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cap.mya.description}
                            </p>
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">
                                Example commands:
                              </p>
                              {cap.mya.commands.map((cmd, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleTryIt(cmd)}
                                  className="w-full text-left text-xs bg-background/50 hover:bg-background border border-border/30 hover:border-primary/30 rounded-md p-2 flex items-center gap-2 transition-colors group"
                                >
                                  <MessageSquare className="w-3 h-3 text-primary flex-shrink-0" />
                                  <span className="text-foreground italic">
                                    {cmd}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {cap.mya.tools.map((tool) => (
                                <Badge
                                  key={tool}
                                  variant="secondary"
                                  className="text-xs font-mono"
                                >
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            {/* Mya Only */}
            <TabsContent value="mya" className="mt-0 space-y-3">
              {/* Quick Launch Hero */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Do It All For Me</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    One tap to get started — Mya will add sample leads, create a workflow, and summarize your business.
                  </p>
                  <Button onClick={handleQuickLaunch} className="w-full gap-2">
                    <Sparkles className="w-4 h-4" />
                    Quick Launch
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Voice Mode Hint */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/10 border border-accent/20 text-xs text-muted-foreground">
                <Mic className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span>You can also <strong className="text-foreground">long-press the mic button</strong> to talk to Mya hands-free</span>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <span className="font-medium">
                      Skip the setup. Just start talking.
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mya has 13 built-in tools covering lead management, revenue
                    tracking, workflow automation, and business intelligence. No
                    external accounts needed.
                  </p>
                </CardContent>
              </Card>

              {capabilities.map((cap) => (
                <Card key={cap.id} className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <cap.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{cap.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {cap.mya.description}
                    </p>
                    <div className="space-y-1.5">
                      {cap.mya.commands.map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => handleTryIt(cmd)}
                          className="w-full text-left text-sm bg-card hover:bg-accent/10 border border-border/30 hover:border-primary/30 rounded-md px-3 py-2 flex items-center gap-2 transition-colors group"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="italic">{cmd}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Interactive Course */}
            <TabsContent value="manual" className="mt-0 space-y-3">
              {/* Overall progress header */}
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Your Progress
                    </p>
                    <div className="flex items-center gap-2">
                      {hasAnyProgress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetProgress}
                          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset
                        </Button>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {overall.completed} of {overall.total} steps
                      </Badge>
                    </div>
                  </div>
                  <Progress value={overall.total > 0 ? (overall.completed / overall.total) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Complete each step to build your business infrastructure. Take it one step at a time.
                  </p>

                  {/* Milestone encouragement cards */}
                  <AnimatePresence>
                    {overall.total > 0 && (() => {
                      const pct = (overall.completed / overall.total) * 100;
                      const milestones = [
                        { threshold: 25, icon: Flame, message: "You've built your foundation. Most solopreneurs never get this far." },
                        { threshold: 50, icon: Target, message: "Halfway there. Your business infrastructure is taking shape." },
                        { threshold: 75, icon: Trophy, message: "Almost done. You're in the top 5% of action-takers." },
                      ];
                      // Show the highest reached milestone
                      const reached = milestones.filter(m => pct >= m.threshold).pop();
                      if (!reached || pct >= 100) return null;
                      return (
                        <motion.div
                          key={reached.threshold}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          transition={{ type: "spring", duration: 0.4 }}
                          className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-md p-2.5"
                        >
                          <reached.icon className="w-4 h-4 text-primary flex-shrink-0" />
                          <p className="text-xs font-medium text-foreground">{reached.message}</p>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* All-complete celebration */}
              {allComplete && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  <Card className="border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg">
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="text-4xl">🏆</div>
                      <h3 className="text-lg font-bold">Course Complete!</h3>
                      <p className="text-sm text-muted-foreground">
                        You've completed all {overall.total} steps across every category. Your business infrastructure is fully set up.
                      </p>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="bg-background/60 rounded-lg p-2">
                          <p className="text-xl font-bold text-primary">{capabilities.length}</p>
                          <p className="text-[10px] text-muted-foreground">Categories</p>
                        </div>
                        <div className="bg-background/60 rounded-lg p-2">
                          <p className="text-xl font-bold text-primary">{overall.total}</p>
                          <p className="text-[10px] text-muted-foreground">Steps Done</p>
                        </div>
                        <div className="bg-background/60 rounded-lg p-2">
                          <p className="text-xl font-bold text-primary">100%</p>
                          <p className="text-[10px] text-muted-foreground">Complete</p>
                        </div>
                      </div>
                      <div className="pt-2 space-y-2">
                        <p className="text-xs font-medium text-foreground">What's Next?</p>
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" onClick={handleQuickLaunch} className="gap-1.5">
                            <Rocket className="w-3.5 h-3.5" />
                            Launch with Mya
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate("/dashboard"); }}>
                            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                            Dashboard
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {capabilities.map((cap) => {
                const capCompleted = getCompleted(cap.id, cap.manual.steps.length);
                const capTotal = cap.manual.steps.length;
                const capDone = capCompleted === capTotal;

                return (
                  <Card key={cap.id} className={capDone ? "border-primary/30 bg-primary/5" : "glass"}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <cap.icon className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{cap.title}</span>
                          {capDone && (
                            <Badge className="text-xs bg-primary/20 text-primary border-0">Complete</Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {cap.manual.estimatedTime}
                        </Badge>
                      </div>
                      <CourseStepView
                        capId={cap.id}
                        title={cap.title}
                        steps={cap.manual.steps}
                        tools={cap.manual.tools}
                        currentStepIndex={getCurrentStep(cap.id, cap.manual.steps.length)}
                        isStepDone={isStepDone}
                        onMarkComplete={markStepDone}
                        onAskMya={handleAskMya}
                        categoryOutcome={cap.categoryOutcome}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
