import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Rocket, 
  Lightbulb, 
  Bookmark, 
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Link2,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUserPreferences } from "@/hooks/useUserPreferences";

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
  interactive?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Let's Have Some Fun! 🚀",
    description: "You're about to build your $10K/month empire—and it's going to be easier than you think. This quick tour shows just how simple and enjoyable the journey is.",
    icon: <Rocket className="w-8 h-8" />,
    highlight: "mission-control",
    tip: "Spoiler: You're going to crush this!",
  },
  {
    id: "mission-control",
    title: "Your Adventure Dashboard",
    description: "Think of this as your game board! Track your progress, earn XP, and collect achievements. Each quest is a fun step toward your goal.",
    icon: <Trophy className="w-8 h-8" />,
    highlight: "mission-control",
    tip: "Every quest you complete is a win worth celebrating! 🎉",
  },
  {
    id: "generate-idea",
    title: "The Easy Part: Get Your Plan",
    description: "One click, and Mya creates a complete business plan just for you. Revenue math, automation strategies, everything—done!",
    icon: <Lightbulb className="w-8 h-8" />,
    highlight: "generate-idea",
    tip: "The best business ideas feel like they were made for you—because they are!",
  },
  {
    id: "save-idea",
    title: "Save & Unlock the Magic",
    description: "Love a plan? Save it! This unlocks your Implementation Guide, automated workflows, and a checklist that makes everything feel manageable.",
    icon: <Bookmark className="w-8 h-8" />,
    highlight: "save-idea",
    tip: "Once saved, your plan is always one click away.",
  },
  {
    id: "n8n-setup",
    title: "Connect Your Automation Engine",
    description: "To deploy workflows automatically, we need your n8n instance URL. This enables one-click deployment and smart troubleshooting.",
    icon: <Link2 className="w-8 h-8" />,
    highlight: "n8n-setup",
    tip: "Don't have n8n yet? You can skip this and set it up later in the Automation Guide!",
    interactive: true,
  },
  {
    id: "whats-next",
    title: "Just Follow Along",
    description: "The 'What's Next?' card always shows your one next step. No overwhelm, no confusion—just simple progress toward your first customer!",
    icon: <Sparkles className="w-8 h-8" />,
    highlight: "whats-next",
    tip: "Success is just a series of small, fun steps. You've got this!",
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
  const [n8nUrl, setN8nUrl] = useState("");
  const [urlSaved, setUrlSaved] = useState(false);
  const { preferences, setN8nConfig } = useUserPreferences();
  
  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isN8nStep = step.id === "n8n-setup";

  // Load existing n8n URL from preferences (database) or localStorage
  useEffect(() => {
    // Prefer database preferences over localStorage
    if (preferences?.n8n_instance_url) {
      setN8nUrl(preferences.n8n_instance_url);
      setUrlSaved(true);
    } else {
      const savedUrl = localStorage.getItem("n8n_instance_url");
      if (savedUrl) {
        setN8nUrl(savedUrl);
        setUrlSaved(true);
      }
    }
  }, [preferences]);

  const handleSaveN8nUrl = useCallback(async () => {
    if (!n8nUrl.trim()) {
      toast.error("Please enter your n8n instance URL");
      return;
    }

    // Basic URL validation
    let cleanUrl = n8nUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, "");

    try {
      new URL(cleanUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    const hostingType = cleanUrl.includes("n8n.cloud") ? "cloud" : "self-hosted";

    // Save to localStorage for immediate access
    localStorage.setItem("n8n_instance_url", cleanUrl);
    localStorage.setItem("n8n_hosting_type", hostingType);
    
    // Sync to database for cross-device persistence
    const success = await setN8nConfig(cleanUrl, hostingType);
    
    setN8nUrl(cleanUrl);
    setUrlSaved(true);
    
    if (success) {
      toast.success("n8n instance URL saved and synced!");
    } else {
      // Still saved locally even if DB sync fails
      toast.success("n8n instance URL saved locally!");
    }
  }, [n8nUrl, setN8nConfig]);

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

            {/* n8n URL Input (only on n8n-setup step) */}
            {isN8nStep && (
              <div className="mb-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://your-instance.n8n.cloud"
                    value={n8nUrl}
                    onChange={(e) => {
                      setN8nUrl(e.target.value);
                      setUrlSaved(false);
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveN8nUrl}
                    disabled={urlSaved && n8nUrl.trim() !== ""}
                    className={urlSaved ? "bg-emerald-600 hover:bg-emerald-600" : ""}
                  >
                    {urlSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                
                {/* Examples */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Examples:</p>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    <li>n8n Cloud: <code className="text-primary/80">your-instance.app.n8n.cloud</code></li>
                    <li>Hostinger: <code className="text-primary/80">n8n.srv12345.hstgr.cloud</code></li>
                    <li>Self-hosted: <code className="text-primary/80">n8n.yourdomain.com</code></li>
                  </ul>
                </div>

                {/* Help link */}
                <a
                  href="https://docs.n8n.io/hosting/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  New to n8n? Learn how to set it up
                </a>
              </div>
            )}
            
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
                {isN8nStep && !urlSaved && (
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    className="text-muted-foreground"
                  >
                    Skip for Now
                  </Button>
                )}
                {(!isN8nStep || urlSaved) && (
                  <Button
                    variant="outline"
                    onClick={onSkip}
                    className="text-muted-foreground"
                  >
                    Skip Tour
                  </Button>
                )}
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
