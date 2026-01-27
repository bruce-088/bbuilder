import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

interface BusinessIdeaMasterPromptDialogProps {
  businessIdea: {
    id: string;
    businessName: string;
    niche: string;
    targetAudience: string;
    valueProposition: string;
    serviceOffering: string;
    revenueMath?: string;
    validationPath?: string;
    aiAutomationStrategy?: Json;
  };
  trigger?: React.ReactNode;
}

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

const generateMasterPrompt = (businessIdea: BusinessIdeaMasterPromptDialogProps["businessIdea"]): string => {
  const automationStrategy = formatAutomationStrategy(businessIdea.aiAutomationStrategy);
  
  return `# 🚀 MASTER IMPLEMENTATION PROMPT: ${businessIdea.businessName}

You are my expert business implementation consultant. I need you to help me build and launch this business from scratch to getting my first paying customer. Be extremely detailed, actionable, and provide step-by-step guidance.

---

## 📋 BUSINESS OVERVIEW

**Business Name:** ${businessIdea.businessName}

**Niche:** ${businessIdea.niche}

**Target Audience:** ${businessIdea.targetAudience}

**Value Proposition:** ${businessIdea.valueProposition}

**Service/Product Offering:** ${businessIdea.serviceOffering}

${businessIdea.revenueMath ? `**Revenue Model:** ${businessIdea.revenueMath}` : ""}

${businessIdea.validationPath ? `**Validation Strategy:** ${businessIdea.validationPath}` : ""}

${automationStrategy !== "Not specified" ? `**AI Automation Strategy:** ${automationStrategy}` : ""}

---

## 🎯 YOUR MISSION

Help me implement this business completely, from $0 to first paying customer. I need you to:

### PHASE 1: Foundation (Week 1)
1. **Brand Identity Setup**
   - Create a compelling brand name validation (or suggest alternatives if needed)
   - Design a brand positioning statement
   - Define brand voice and messaging guidelines
   - Suggest color palette, typography, and visual identity direction

2. **Online Presence**
   - Recommend the best website builder/platform for this business
   - Outline the exact pages needed and their content structure
   - Write compelling copy for the homepage, about page, and services page
   - SEO strategy for organic discovery

3. **Legal & Admin Basics**
   - Business structure recommendation (LLC, sole prop, etc.)
   - Essential legal documents needed (contracts, terms, privacy policy)
   - Payment processing setup (Stripe, PayPal, etc.)
   - Basic bookkeeping setup

### PHASE 2: Offer Creation (Week 2)
1. **Service/Product Packaging**
   - Define 2-3 service tiers with clear pricing
   - Create irresistible offer positioning
   - Design the client journey from inquiry to delivery
   - Build out the deliverables checklist

2. **Sales Assets**
   - Write a compelling sales page or proposal template
   - Create a case study/portfolio structure (even without clients yet)
   - Develop FAQ document addressing common objections
   - Design a simple pitch deck if needed

3. **Onboarding System**
   - Client intake questionnaire
   - Welcome email sequence
   - Project kickoff process
   - Communication protocols and tools

### PHASE 3: Lead Generation (Week 3)
1. **Outbound Strategy**
   - Identify 100 ideal prospects with specific criteria
   - Write 3 cold email templates that convert
   - LinkedIn outreach strategy and connection messages
   - Follow-up sequence (5-touch campaign)

2. **Inbound Strategy**
   - Content pillars and topic clusters for ${businessIdea.niche}
   - 10 blog post/article ideas that attract ${businessIdea.targetAudience}
   - Social media content calendar (LinkedIn, Twitter, etc.)
   - Lead magnet idea and creation outline

3. **Networking & Partnerships**
   - Communities and groups to join
   - Potential referral partners to approach
   - Collaboration opportunities
   - Speaking/podcast opportunities

### PHASE 4: First Customer Acquisition (Week 4)
1. **Launch Campaign**
   - Pre-launch buzz building strategy
   - Launch announcement templates
   - Special launch offer structure
   - Urgency and scarcity tactics (ethical)

2. **Conversion Optimization**
   - Discovery call script
   - Objection handling guide
   - Proposal/quote template
   - Closing techniques

3. **Delivery Excellence**
   - Step-by-step service delivery process
   - Quality checkpoints
   - Client communication templates
   - Feedback collection system

---

## 📊 SUCCESS METRICS

Help me track:
- Website visitors and conversion rate
- Number of leads generated
- Discovery calls booked
- Proposals sent
- Close rate
- Revenue generated
- Client satisfaction score

---

## 🤖 AUTOMATION PRIORITIES

Help me automate:
1. Lead capture and nurturing
2. Appointment scheduling
3. Email follow-ups
4. Invoice and payment collection
5. Client onboarding
6. Feedback collection

---

## ⚡ START NOW

Please begin by:
1. Validating this business concept - any red flags or improvements?
2. Providing the EXACT first 3 actions I should take TODAY
3. Creating my Week 1 day-by-day action plan
4. Writing the copy for my homepage

I want specific, actionable outputs I can implement immediately. No fluff, just results-focused guidance.

Let's build ${businessIdea.businessName} together! 🚀`;
};

export default function BusinessIdeaMasterPromptDialog({
  businessIdea,
  trigger,
}: BusinessIdeaMasterPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const masterPrompt = generateMasterPrompt(businessIdea);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(masterPrompt);
      setCopied(true);
      toast.success("Master prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Wand2 className="w-4 h-4" />
            Generate Master Prompt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Master Implementation Prompt
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Copy this prompt and paste it into ChatGPT, Claude, Perplexity, Grok, or any AI to get a complete implementation guide.
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Badge variant="outline" className="text-xs">Works with any LLM</Badge>
          <Badge variant="outline" className="text-xs">4-Week Plan</Badge>
          <Badge variant="outline" className="text-xs">Start to First Customer</Badge>
        </div>

        <ScrollArea className="flex-1 border rounded-lg bg-muted/30">
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {masterPrompt}
            </pre>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-3 pt-4 border-t">
          <Button
            onClick={copyToClipboard}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 btn-glow gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Master Prompt
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p className="font-medium">How to use:</p>
            <p>1. Click "Copy Master Prompt" above</p>
            <p>2. Open ChatGPT, Claude, Perplexity, or Grok</p>
            <p>3. Paste the prompt and start your implementation journey!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
