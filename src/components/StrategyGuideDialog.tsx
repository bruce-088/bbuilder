import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Brain, 
  Activity,
  ArrowRight,
  Map
} from "lucide-react";

interface StrategyGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    icon: RefreshCw,
    title: "1. Sync to Nexus & WeatherPost",
    description: "When you click 'Sync' on a business idea card, the sync-to-nexus function fires. It packages your business name, niche, audience, and content pillars into a manifest, saves it locally, then sends parallel POST requests to both NexusAI and NexusVocal using the x-triad-key header for authentication.",
    tips: [
      "Both services must confirm receipt for a successful sync",
      "The manifest is also saved to your Triad Manifests table as a local backup",
      "If one service fails, you'll see exactly which one and why in the toast message",
      "Re-syncing overwrites the previous manifest—your latest strategy always wins"
    ]
  },
  {
    icon: Brain,
    title: "2. Generate Manifests with the Brain",
    description: "Chat with Mya about your skills, interests, and goals. She'll generate tailored business ideas complete with niche, audience, and value proposition. Save the one you love, then hit 'Sync' on the dashboard card to push the manifest across the Triad.",
    tips: [
      "The more detail you share with Mya, the sharper your manifest becomes",
      "Each saved idea automatically builds content pillars and CRM stages",
      "You can sync different ideas to test which strategy resonates best",
      "Star your favorite idea so it's always easy to find and re-sync"
    ]
  },
  {
    icon: Activity,
    title: "3. Read Triad Event Bus Feedback",
    description: "Every sync, deployment, and automation logs an event to the Triad Event Bus. Events like MANIFEST_SYNCED, CONTENT_GENERATED, and LEAD_CAPTURED tell you what's happening across NexusAI and WeatherPost. Use this feedback loop to evolve your strategy.",
    tips: [
      "Check the Activity Feed on your dashboard for recent Triad events",
      "MANIFEST_SYNCED confirms your strategy reached both services",
      "Watch for patterns—if content events spike but leads don't, adjust your audience targeting",
      "The event bus is your real-time pulse on how your business ecosystem is performing"
    ]
  }
];

export default function StrategyGuideDialog({ open, onOpenChange }: StrategyGuideDialogProps) {
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
            <Map className="w-6 h-6 text-primary" />
            Triad Strategy Guide
          </DialogTitle>
          <DialogDescription>
            How your business manifest flows through Nexus, WeatherPost, and back to you.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {sections.map((section, index) => (
              <div 
                key={index}
                className="relative pl-4 border-l-2 border-primary/30 hover:border-primary transition-colors"
              >
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                
                <div className="ml-4">
                  <h3 className="font-semibold text-foreground mb-1">
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {section.description}
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pro Tips
                    </p>
                    {section.tips.map((tip, tipIndex) => (
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
                🔄 The Feedback Loop
              </h4>
              <p className="text-sm text-muted-foreground">
                The Triad isn't a one-way push—it's a living loop. Sync your manifest, let NexusAI generate content 
                and WeatherPost distribute it, then read the events that come back. Each cycle sharpens your strategy, 
                your audience targeting, and your revenue path. Iterate fast, iterate often.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
