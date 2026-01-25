import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Lightbulb, 
  Rocket, 
  Settings, 
  Target,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

interface HowToUseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestartTour?: () => void;
}

const steps = [
  {
    icon: MessageSquare,
    title: "1. Start a Conversation with Mya",
    description: "Click 'New Chat' to begin brainstorming with Mya, your AI business consultant. Share your interests, skills, and goals to get personalized business ideas.",
    tips: [
      "Be specific about your background and expertise",
      "Mention your budget and time constraints",
      "Share industries you're passionate about"
    ]
  },
  {
    icon: Lightbulb,
    title: "2. Explore Generated Business Plans",
    description: "Mya will generate tailored business plans based on your conversation. Each plan includes a niche, target audience, value proposition, and revenue strategy.",
    tips: [
      "Ask follow-up questions to refine plans",
      "Request variations or pivots on concepts you like",
      "Save promising plans to your dashboard"
    ]
  },
  {
    icon: Target,
    title: "3. Review & Compare Plans",
    description: "Access saved plans from your dashboard. Use the compare feature to evaluate multiple plans side-by-side and identify the best opportunity.",
    tips: [
      "Star your favorite plans for quick access",
      "Use the comparison tool for detailed analysis",
      "Review the AI automation strategy for each plan"
    ]
  },
  {
    icon: Settings,
    title: "4. Generate Implementation Resources",
    description: "For each business plan, generate detailed implementation guides, n8n automation workflows, and master prompts to accelerate your launch.",
    tips: [
      "Use the 'Full Automation Setup Guide' for step-by-step setup",
      "Generate n8n workflows for sales automation",
      "Export the Master Prompt for use in other AI tools"
    ]
  },
  {
    icon: Rocket,
    title: "5. Track Your Progress",
    description: "Use the Quick Start Checklist and implementation guides to track your progress. Mark steps as complete to stay organized and motivated.",
    tips: [
      "Complete the 5 validation milestones first",
      "Focus on getting your first paying customer",
      "Iterate based on real customer feedback"
    ]
  }
];

export default function HowToUseDialog({ open, onOpenChange, onRestartTour }: HowToUseDialogProps) {
  const handleRestartTour = () => {
    onOpenChange(false);
    onRestartTour?.();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            How to Get the Most Value
          </DialogTitle>
          <DialogDescription>
            Follow these steps to go from idea to your first paying customer
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative pl-4 border-l-2 border-primary/30 hover:border-primary transition-colors"
              >
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                
                <div className="ml-4">
                  <h3 className="font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pro Tips
                    </p>
                    {step.tips.map((tip, tipIndex) => (
                      <div key={tipIndex} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-foreground mb-2">
                💡 Quick Start Recommendation
              </h4>
              <p className="text-sm text-muted-foreground">
                Start with a 10-minute conversation with Mya about your skills and interests. 
                Don't overthink it – the best insights often come from casual exploration. 
                You can always refine ideas later!
              </p>
            </div>

            {onRestartTour && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={handleRestartTour}
                  className="w-full"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Restart Interactive Tour
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
