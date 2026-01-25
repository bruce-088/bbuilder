import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Lightbulb, Target, Rocket } from "lucide-react";

interface GettingStartedCardProps {
  onGenerateIdea: () => void;
  onStartChat: () => void;
}

export default function GettingStartedCard({ onGenerateIdea, onStartChat }: GettingStartedCardProps) {
  const steps = [
    {
      icon: Sparkles,
      title: "Generate Your First Idea",
      description: "AI creates a complete $10K/month business plan",
      action: onGenerateIdea,
      primary: true,
    },
    {
      icon: Target,
      title: "Ask Mya Anything",
      description: "Get personalized advice and refine ideas",
      action: onStartChat,
      primary: false,
    },
  ];

  return (
    <Card className="glass border-accent/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
            <Rocket className="w-4 h-4 text-accent-foreground" />
          </div>
          Let's Get Started!
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Your first business idea is just one click away
        </p>
      </CardHeader>
      <CardContent className="relative space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <button
              onClick={step.action}
              className={`w-full p-4 rounded-lg text-left transition-all group ${
                step.primary 
                  ? "bg-gradient-accent text-accent-foreground hover:opacity-90 ring-2 ring-accent/20 ring-offset-2 ring-offset-background" 
                  : "bg-muted/50 hover:bg-muted border border-border/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  step.primary 
                    ? "bg-accent-foreground/20" 
                    : "bg-primary/20"
                }`}>
                  <step.icon className={`w-5 h-5 ${
                    step.primary ? "text-accent-foreground" : "text-primary"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className={`text-xs mt-0.5 ${
                    step.primary ? "text-accent-foreground/80" : "text-muted-foreground"
                  }`}>
                    {step.description}
                  </p>
                </div>
                <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1 ${
                  step.primary ? "text-accent-foreground" : "text-muted-foreground"
                }`} />
              </div>
            </button>
          </motion.div>
        ))}
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"
        >
          <Lightbulb className="w-3 h-3" />
          <span>Pro tip: Generate an idea first, then refine it with Mya</span>
        </motion.div>
      </CardContent>
    </Card>
  );
}
