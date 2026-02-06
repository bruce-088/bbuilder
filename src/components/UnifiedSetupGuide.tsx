import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { useManualProgress } from "@/hooks/useManualProgress";

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
}

interface CapabilityArea {
  id: string;
  title: string;
  icon: React.ElementType;
  manual: {
    tools: { name: string; url?: string }[];
    steps: string[];
    estimatedTime: string;
  };
  mya: {
    commands: string[];
    tools: string[];
    description: string;
  };
}

const capabilities: CapabilityArea[] = [
  {
    id: "lead-gen",
    title: "Lead Generation",
    icon: Users,
    manual: {
      tools: [
        { name: "Apollo.io", url: "https://apollo.io" },
        { name: "Hunter.io", url: "https://hunter.io" },
        { name: "LinkedIn Sales Navigator" },
        { name: "Google Sheets" },
      ],
      steps: [
        "Sign up for Apollo.io or Hunter.io account",
        "Set up search filters for your target audience",
        "Export leads to a spreadsheet",
        "Clean and deduplicate the data",
        "Import leads into your CRM",
      ],
      estimatedTime: "2-4 hours",
    },
    mya: {
      commands: [
        '"Add a lead named Sarah from Acme Corp"',
        '"Show me all my leads"',
        '"What does my pipeline look like?"',
      ],
      tools: ["add_lead", "list_leads", "get_pipeline_stats"],
      description:
        "Mya adds leads directly to your CRM, tracks them through stages, and gives you instant pipeline analytics.",
    },
  },
  {
    id: "pipeline",
    title: "Pipeline Management",
    icon: Target,
    manual: {
      tools: [
        { name: "HubSpot CRM", url: "https://hubspot.com" },
        { name: "Close CRM", url: "https://close.com" },
        { name: "Notion", url: "https://notion.so" },
        { name: "Spreadsheets" },
      ],
      steps: [
        "Set up a CRM account and configure stages",
        "Create custom fields for your business",
        "Build pipeline views and dashboards",
        "Train yourself on the CRM workflow",
        "Manually move leads between stages",
      ],
      estimatedTime: "3-5 hours",
    },
    mya: {
      commands: [
        '"Move Sarah to qualified"',
        '"Update John\'s email to john@company.com"',
        '"Delete the old test lead"',
      ],
      tools: ["update_lead", "move_lead_stage", "delete_lead"],
      description:
        "Just tell Mya what changed. She moves leads through stages, updates fields, and logs every activity automatically.",
    },
  },
  {
    id: "outreach",
    title: "Outreach & Follow-up",
    icon: Mail,
    manual: {
      tools: [
        { name: "SendGrid", url: "https://sendgrid.com" },
        { name: "Mailchimp", url: "https://mailchimp.com" },
        { name: "Gmail sequences" },
        { name: "Calendly", url: "https://calendly.com" },
      ],
      steps: [
        "Set up email sending tool with domain verification",
        "Write email templates for each sequence step",
        "Configure follow-up timing and triggers",
        "Set up calendar booking link",
        "Connect tools together via Zapier or n8n",
      ],
      estimatedTime: "4-6 hours",
    },
    mya: {
      commands: [
        '"Create a follow-up workflow for cold leads"',
        '"Schedule my outreach to run daily at 9am"',
        '"List my active workflows"',
      ],
      tools: ["create_workflow", "schedule_workflow", "list_workflows"],
      description:
        "Mya creates automated outreach workflows and schedules them—no email tool setup needed.",
    },
  },
  {
    id: "qualification",
    title: "Qualification & Discovery",
    icon: Phone,
    manual: {
      tools: [
        { name: "Typeform", url: "https://typeform.com" },
        { name: "Gong", url: "https://gong.io" },
        { name: "Fireflies.ai", url: "https://fireflies.ai" },
        { name: "Google Docs" },
      ],
      steps: [
        "Create a qualification form or script",
        "Set up call recording tool",
        "Build a scoring rubric",
        "Document each call's notes manually",
        "Update CRM with call outcomes",
      ],
      estimatedTime: "2-3 hours",
    },
    mya: {
      commands: [
        '"Log a call with John about the proposal"',
        '"Add a note: Sarah loves our pricing"',
        '"What activities have happened with this lead?"',
      ],
      tools: ["log_lead_activity"],
      description:
        "Tell Mya about calls, meetings, and notes. She logs everything to the lead's timeline automatically.",
    },
  },
  {
    id: "closing",
    title: "Proposals & Closing",
    icon: DollarSign,
    manual: {
      tools: [
        { name: "PandaDoc", url: "https://pandadoc.com" },
        { name: "Stripe", url: "https://stripe.com" },
        { name: "DocuSign", url: "https://docusign.com" },
        { name: "PayPal" },
      ],
      steps: [
        "Create proposal templates in PandaDoc",
        "Set up Stripe or PayPal payment collection",
        "Configure e-signature workflows",
        "Build invoice templates",
        "Track payments manually in a spreadsheet",
      ],
      estimatedTime: "3-5 hours",
    },
    mya: {
      commands: [
        '"I just closed $2000 from Acme Corp"',
        '"Log revenue of $500 from freelancing"',
        '"How\'s my revenue looking?"',
      ],
      tools: ["log_revenue", "get_revenue_stats"],
      description:
        "Mya tracks every dollar—MRR, monthly totals, goal progress toward $10K/month. Just tell her when you get paid.",
    },
  },
  {
    id: "automation",
    title: "Automation & Workflows",
    icon: Zap,
    manual: {
      tools: [
        { name: "n8n", url: "https://n8n.io" },
        { name: "Zapier", url: "https://zapier.com" },
        { name: "Make.com", url: "https://make.com" },
      ],
      steps: [
        "Install and configure n8n (self-hosted or cloud)",
        "Learn the node-based workflow builder",
        "Set up webhook endpoints",
        "Configure credentials for each service",
        "Build and test each workflow manually",
        "Set up cron schedules for recurring tasks",
      ],
      estimatedTime: "5-10 hours",
    },
    mya: {
      commands: [
        '"Create a webhook automation for new leads"',
        '"Schedule it for every weekday at 9am"',
        '"Trigger my outreach workflow"',
        '"Delete the old test workflow"',
      ],
      tools: [
        "create_workflow",
        "trigger_workflow",
        "schedule_workflow",
        "delete_workflow",
        "list_workflows",
      ],
      description:
        "Mya builds, schedules, triggers, and manages workflows entirely through conversation. No manual config needed.",
    },
  },
  {
    id: "analytics",
    title: "Analytics & Intelligence",
    icon: BarChart3,
    manual: {
      tools: [
        { name: "Google Analytics", url: "https://analytics.google.com" },
        { name: "Spreadsheet dashboards" },
        { name: "Metabase", url: "https://metabase.com" },
      ],
      steps: [
        "Set up analytics tracking on your site",
        "Build spreadsheet formulas for revenue tracking",
        "Create dashboard visualizations",
        "Manually compile reports each week",
        "Cross-reference data from multiple tools",
      ],
      estimatedTime: "3-5 hours",
    },
    mya: {
      commands: [
        '"How\'s my revenue this month?"',
        '"What\'s my conversion rate?"',
        '"Give me a business summary"',
        '"What\'s my pipeline value?"',
      ],
      tools: ["get_revenue_stats", "get_pipeline_stats", "get_business_summary"],
      description:
        "Ask Mya anything about your business performance. She calculates stats in real-time from your actual data.",
    },
  },
];

const QUICK_LAUNCH_PROMPT =
  "Set up my business: add 3 sample leads, create a follow-up workflow, and give me a business summary";

export default function UnifiedSetupGuide({
  trigger,
  businessIdea,
}: UnifiedSetupGuideProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { toggleStep, getCompleted, isStepDone } = useManualProgress(capabilities);

  const handleTryIt = (command: string) => {
    setOpen(false);
    navigate("/chat/new", {
      state: { initialPrompt: command.replace(/"/g, "") },
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
              Full Manual Guide
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 mt-4 -mx-6 px-6 [&>[data-radix-scroll-area-viewport]]:max-h-[55vh]">
            {/* Side by Side */}
            <TabsContent value="side-by-side" className="mt-0">
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
                        {/* Manual Column */}
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
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">
                                Tools needed:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {cap.manual.tools.map((tool) => (
                                  <Badge
                                    key={tool.name}
                                    variant="outline"
                                    className="text-xs cursor-default"
                                  >
                                    {tool.url ? (
                                      <a
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 hover:text-primary"
                                      >
                                        {tool.name}
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    ) : (
                                      tool.name
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">
                                Steps:
                              </p>
                              <ol className="space-y-1.5">
                                {cap.manual.steps.map((step, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-muted-foreground flex items-start gap-2"
                                  >
                                    <Checkbox
                                      checked={isStepDone(cap.id, i)}
                                      onCheckedChange={() => toggleStep(cap.id, i, cap.manual.steps.length)}
                                      className="mt-0.5 h-3.5 w-3.5"
                                    />
                                    <span className={isStepDone(cap.id, i) ? "line-through opacity-50" : ""}>
                                      {step}
                                    </span>
                                  </li>
                                ))}
                              </ol>
                              {/* Bridge CTA */}
                              <button
                                onClick={() => handleTryIt(cap.mya.commands[0])}
                                className="mt-2 w-full text-left text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                              >
                                <Bot className="w-3 h-3" />
                                <span>Or skip the rest — tell Mya: <em className="text-primary">{cap.mya.commands[0]}</em></span>
                              </button>
                            </div>
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

            {/* Manual Only */}
            <TabsContent value="manual" className="mt-0 space-y-3">
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    The manual path requires setting up {totalManualTools}+
                    external tools with an estimated {totalManualHours} hours of
                    configuration. Each section below lists the tools, accounts,
                    and steps needed.
                  </p>
                </CardContent>
              </Card>

              {capabilities.map((cap) => (
                <Card key={cap.id} className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <cap.icon className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{cap.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {cap.manual.estimatedTime}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1.5">
                          Tools needed:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cap.manual.tools.map((tool) => (
                            <Badge
                              key={tool.name}
                              variant="outline"
                              className="text-xs"
                            >
                              {tool.url ? (
                                <a
                                  href={tool.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:text-primary"
                                >
                                  {tool.name}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                tool.name
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-muted-foreground font-medium">
                            Setup steps:
                          </p>
                          {getCompleted(cap.id, cap.manual.steps.length) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {getCompleted(cap.id, cap.manual.steps.length)}/{cap.manual.steps.length}
                            </Badge>
                          )}
                        </div>
                        <ol className="space-y-2">
                          {cap.manual.steps.map((step, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <Checkbox
                                checked={isStepDone(cap.id, i)}
                                onCheckedChange={() => toggleStep(cap.id, i, cap.manual.steps.length)}
                                className="mt-0.5"
                              />
                              <span className={isStepDone(cap.id, i) ? "line-through opacity-50" : ""}>
                                {step}
                              </span>
                            </li>
                          ))}
                        </ol>
                        {/* Bridge CTA */}
                        <button
                          onClick={() => handleTryIt(cap.mya.commands[0])}
                          className="mt-3 w-full text-left text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                        >
                          <Bot className="w-3 h-3" />
                          <span>Or skip the rest — tell Mya: <em className="text-primary">{cap.mya.commands[0]}</em></span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
