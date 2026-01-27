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
    title: "1. Chat with Mya (The Fun Part!)",
    description: "Click 'New Chat' and tell Mya about yourself. She'll make the whole process feel like a friendly conversation, not homework.",
    tips: [
      "Just be yourself—there are no wrong answers",
      "The more you share, the better your plans will fit",
      "Ask anything—Mya loves to help!"
    ]
  },
  {
    icon: Lightbulb,
    title: "2. Pick Your Favorite Plan",
    description: "Mya creates tailored business plans just for you. Each one is complete with everything you need—just pick the one that excites you most!",
    tips: [
      "Go with your gut—the right plan will feel right",
      "Not quite perfect? Ask Mya to tweak it",
      "Save the ones you love to your dashboard"
    ]
  },
  {
    icon: Target,
    title: "3. Compare & Choose (Easy!)",
    description: "Can't decide? Compare your saved plans side-by-side. Mya makes it simple to see which opportunity is your best fit.",
    tips: [
      "Star your favorites for quick access",
      "The comparison tool shows you everything at a glance",
      "Trust your instincts—you know what's right for you"
    ]
  },
  {
    icon: Settings,
    title: "4. Unlock Your Superpowers",
    description: "Each plan comes with implementation guides and automation workflows. It's like having a team working for you—on autopilot!",
    tips: [
      "The automation guide walks you through everything",
      "n8n workflows do the heavy lifting for you",
      "Export prompts to use with any AI tool"
    ]
  },
  {
    icon: Rocket,
    title: "5. Watch Your Progress Grow",
    description: "The Quick Start Checklist makes progress visible and fun. Check things off and celebrate each win on your way to your first customer!",
    tips: [
      "Each checkbox is a mini celebration 🎉",
      "Focus on one step at a time—no rush",
      "You're closer than you think!"
    ]
  }
];

export default function HowToUseDialog({ open, onOpenChange, onRestartTour }: HowToUseDialogProps) {
  const handleRestartTour = () => {
    onOpenChange(false);
    onRestartTour?.();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh]"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            Your Path to Success
          </DialogTitle>
          <DialogDescription>
            It's easier than you think—just follow these fun steps!
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
                ✨ The Best Part?
              </h4>
              <p className="text-sm text-muted-foreground">
                There's no wrong way to start! Just have a 10-minute chat with Mya about what excites you. 
                She'll handle the rest. No pressure, no stress—just exploration and fun. 
                Your $10K/month business is already waiting!
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
