import { useState, useEffect } from "react";
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
import { ExternalLink, Wrench, Target, Users, Presentation, Shield, Handshake, Heart, CheckCircle2 } from "lucide-react";

interface ImplementationGuideDialogProps {
  trigger?: React.ReactNode;
}

type CompletedSteps = Record<string, Set<string>>;

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

const implementationSections: Section[] = [
  {
    id: "prospecting",
    title: "Prospecting",
    icon: <Target className="w-5 h-5" />,
    description: "Automate lead generation and prospect identification to build a qualified pipeline.",
    tools: [
      { name: "Apollo.io", url: "https://apollo.io", description: "B2B lead database with automated outreach" },
      { name: "LinkedIn Sales Navigator", url: "https://linkedin.com/sales", description: "Advanced LinkedIn prospecting" },
      { name: "Hunter.io", url: "https://hunter.io", description: "Email finder and verification" },
      { name: "Phantombuster", url: "https://phantombuster.com", description: "LinkedIn automation and scraping" },
      { name: "Clay", url: "https://clay.com", description: "Data enrichment and workflow automation" },
    ],
    setupSteps: [
      "Define your Ideal Customer Profile (ICP) with specific criteria",
      "Set up Apollo.io or Clay to search for leads matching your ICP",
      "Connect LinkedIn Sales Navigator for social selling insights",
      "Use Hunter.io to verify email addresses before outreach",
      "Create n8n workflow to sync leads to your CRM automatically",
    ],
    automationTips: [
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
    description: "Qualify leads and conduct discovery to understand their needs and fit.",
    tools: [
      { name: "Calendly", url: "https://calendly.com", description: "Automated meeting scheduling" },
      { name: "Typeform", url: "https://typeform.com", description: "Interactive qualification forms" },
      { name: "Loom", url: "https://loom.com", description: "Async video for discovery questions" },
      { name: "Gong", url: "https://gong.io", description: "Call recording and AI analysis" },
      { name: "Fireflies.ai", url: "https://fireflies.ai", description: "Meeting transcription and insights" },
    ],
    setupSteps: [
      "Create a qualification form in Typeform with key questions",
      "Set up Calendly with different meeting types for each stage",
      "Connect Fireflies.ai or Gong to record and transcribe calls",
      "Build n8n workflow to score leads based on form responses",
      "Configure auto-routing to appropriate sales reps based on score",
    ],
    automationTips: [
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
    description: "Create compelling presentations and proposals tailored to each prospect.",
    tools: [
      { name: "PandaDoc", url: "https://pandadoc.com", description: "Proposal and document automation" },
      { name: "Pitch", url: "https://pitch.com", description: "Collaborative presentation software" },
      { name: "Vidyard", url: "https://vidyard.com", description: "Personalized video messages" },
      { name: "Qwilr", url: "https://qwilr.com", description: "Interactive proposals and quotes" },
      { name: "Canva", url: "https://canva.com", description: "Design templates for sales materials" },
    ],
    setupSteps: [
      "Create proposal templates in PandaDoc with variable fields",
      "Set up Qwilr for interactive, trackable proposals",
      "Build presentation library in Pitch or Canva",
      "Connect CRM data to auto-populate proposal fields via n8n",
      "Set up tracking to know when proposals are viewed",
    ],
    automationTips: [
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
    description: "Prepare for and address common objections with automated resources.",
    tools: [
      { name: "Notion", url: "https://notion.so", description: "Knowledge base for objection responses" },
      { name: "Guru", url: "https://getguru.com", description: "Sales enablement knowledge management" },
      { name: "ChatGPT", url: "https://chat.openai.com", description: "AI-powered objection response generation" },
      { name: "Seismic", url: "https://seismic.com", description: "Sales content management" },
      { name: "Highspot", url: "https://highspot.com", description: "Content recommendations for objections" },
    ],
    setupSteps: [
      "Document common objections and proven responses in Notion",
      "Set up Guru cards for quick access during calls",
      "Create AI prompts for generating contextual responses",
      "Build a searchable database of case studies by objection type",
      "Connect to CRM to track which objections appear most often",
    ],
    automationTips: [
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
    description: "Streamline the closing process with contract management and e-signatures.",
    tools: [
      { name: "DocuSign", url: "https://docusign.com", description: "Electronic signatures and contracts" },
      { name: "PandaDoc", url: "https://pandadoc.com", description: "Proposals with built-in e-sign" },
      { name: "Stripe", url: "https://stripe.com", description: "Payment processing and invoicing" },
      { name: "HubSpot", url: "https://hubspot.com", description: "Deal pipeline and automation" },
      { name: "Close", url: "https://close.com", description: "CRM with calling and email built-in" },
    ],
    setupSteps: [
      "Set up DocuSign or PandaDoc for contract signing",
      "Configure Stripe for seamless payment collection",
      "Create deal stage automation in your CRM",
      "Build n8n workflow to trigger onboarding when deal closes",
      "Set up notifications for legal review if needed",
    ],
    automationTips: [
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
    description: "Ensure client success and nurture relationships for renewals and referrals.",
    tools: [
      { name: "Intercom", url: "https://intercom.com", description: "Customer messaging and support" },
      { name: "Zendesk", url: "https://zendesk.com", description: "Help desk and ticketing" },
      { name: "CustomerSuccessBox", url: "https://customersuccessbox.com", description: "CS platform for B2B" },
      { name: "ChurnZero", url: "https://churnzero.com", description: "Customer success and retention" },
      { name: "Mailchimp", url: "https://mailchimp.com", description: "Email marketing and newsletters" },
    ],
    setupSteps: [
      "Set up onboarding email sequence in Mailchimp or Intercom",
      "Configure health scoring in ChurnZero or CustomerSuccessBox",
      "Create QBR (Quarterly Business Review) templates",
      "Build referral request automation at key milestones",
      "Set up renewal reminders 90/60/30 days before expiration",
    ],
    automationTips: [
      "Auto-send NPS surveys after key milestones",
      "Trigger check-in calls when usage drops below threshold",
      "Auto-request reviews/referrals at peak satisfaction moments",
      "Schedule renewal discussions based on contract dates",
    ],
  },
];

const STORAGE_KEY = "implementation-guide-progress";

const loadProgress = (): CompletedSteps => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const result: CompletedSteps = {};
      for (const [key, value] of Object.entries(parsed)) {
        result[key] = new Set(value as string[]);
      }
      return result;
    }
  } catch (e) {
    console.error("Error loading progress:", e);
  }
  return {};
};

const saveProgress = (progress: CompletedSteps) => {
  try {
    const toSave: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(progress)) {
      toSave[key] = Array.from(value);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Error saving progress:", e);
  }
};

export default function ImplementationGuideDialog({ trigger }: ImplementationGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<CompletedSteps>({});

  useEffect(() => {
    setCompletedSteps(loadProgress());
  }, []);

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

      saveProgress(newProgress);
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
            Sales Automation Implementation Guide
          </DialogTitle>
          <DialogDescription>
            Tools, setup instructions, and automation tips for each stage of your sales process.
          </DialogDescription>
        </DialogHeader>

        {/* Overall Progress */}
        <div className="border border-border/50 rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {totalProgress.completed} / {totalProgress.total} steps completed
            </span>
          </div>
          <Progress value={totalProgress.percentage} className="h-2" />
          {totalProgress.percentage === 100 && (
            <div className="flex items-center gap-2 mt-2 text-green-500 text-sm">
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
                                <span className={`flex-1 ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  <span className="font-medium text-primary mr-2">{index + 1}.</span>
                                  {step}
                                </span>
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
