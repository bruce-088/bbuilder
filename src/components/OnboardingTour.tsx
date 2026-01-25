import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Rocket, 
  Lightbulb, 
  Bookmark, 
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight: string;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Mission! 🚀",
    description: "You're about to launch a $10K/month business empire. This quick tour will show you exactly how to get there in 14 days or less.",
    icon: <Rocket className="w-8 h-8" />,
    highlight: "mission-control",
    tip: "The countdown starts when you complete your first quest!",
  },
  {
    id: "mission-control",
    title: "Mission Control",
    description: "This is your command center. Track your progress with the countdown timer, XP system, and achievement badges. Complete quests to level up!",
    icon: <Trophy className="w-8 h-8" />,
    highlight: "mission-control",
    tip: "Each quest brings you closer to your first paying customer.",
  },
  {
    id: "generate-idea",
    title: "Generate Business Plans",
    description: "Click 'Generate Business Plan' to let AI create a tailored business concept with revenue math, automation strategies, and a validation path.",
    icon: <Lightbulb className="w-8 h-8" />,
    highlight: "generate-idea",
    tip: "Be specific about your skills and interests for better plans!",
  },
  {
    id: "save-idea",
    title: "Save Your Best Plans",
    description: "When you find a plan you love, save it! This unlocks the Implementation Guide, n8n workflows, and the Quick Start Checklist.",
    icon: <Bookmark className="w-8 h-8" />,
    highlight: "save-idea",
    tip: "Saved plans appear in your Business Plans section for easy access.",
  },
  {
    id: "whats-next",
    title: "Follow What's Next",
    description: "The 'What's Next?' card always shows your next best action. Follow it to stay on track and reach your first customer in 14 days!",
    icon: <Sparkles className="w-8 h-8" />,
    highlight: "whats-next",
    tip: "Complete quests in order for the fastest path to success.",
  },
];

const STORAGE_KEY = "mya_onboarding_complete";

export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (!hasCompleted) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
    setHasChecked(true);
  }, []);

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowTour(false);
    setHasChecked(true);
  };

  const skipTour = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowTour(false);
    setHasChecked(true);
  };

  const resetTour = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowTour(true);
  };

  return { showTour, completeTour, skipTour, resetTour, hasChecked };
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onSkip} />
        
        {/* Tour Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg glass rounded-2xl border border-primary/30 overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-transparent p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground">
                  {step.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Step {currentStep + 1} of {TOUR_STEPS.length}
                  </p>
                  <h2 className="font-display text-xl font-bold">{step.title}</h2>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground -mr-2 -mt-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pt-2">
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {step.description}
            </p>
            
            {/* Tip Box */}
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-6">
              <p className="text-sm">
                <span className="font-semibold text-accent">💡 Pro Tip: </span>
                {step.tip}
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {TOUR_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? "w-6 bg-primary" 
                      : index < currentStep 
                        ? "bg-primary/50" 
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={isFirstStep}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onSkip}
                  className="text-muted-foreground"
                >
                  Skip Tour
                </Button>
                <Button
                  onClick={handleNext}
                  className="gap-2 bg-gradient-primary hover:opacity-90 btn-glow"
                >
                  {isLastStep ? "Let's Go!" : "Next"}
                  {!isLastStep && <ArrowRight className="w-4 h-4" />}
                  {isLastStep && <Rocket className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
