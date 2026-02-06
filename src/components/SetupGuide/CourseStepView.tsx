import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, HelpCircle, ArrowRight, ExternalLink, PartyPopper, Target, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { celebrateMilestone } from "@/lib/confetti";

const ENCOURAGEMENTS = [
  "Nice. You're ahead of 90% of people who never start.",
  "That's one less thing between you and your first customer.",
  "Momentum is building. Keep going.",
  "Most people quit before this step. Not you.",
  "This is exactly how $10K/month businesses get built.",
  "One step closer. You're doing the work that matters.",
  "Action beats perfection. Every time.",
  "This compounds. Every step makes the next one easier.",
];

export interface CourseStep {
  text: string;
  why: string;
  helpPrompt: string;
  relevantTools?: string[];
  outcome?: string;
  inAppAction?: { label: string; route: string };
}

interface CourseStepViewProps {
  capId: string;
  title: string;
  steps: CourseStep[];
  tools: { name: string; url?: string }[];
  currentStepIndex: number;
  isStepDone: (capId: string, i: number) => boolean;
  onMarkComplete: (capId: string, stepIndex: number, totalSteps: number) => void;
  onAskMya: (prompt: string) => void;
  categoryOutcome?: string;
}

export default function CourseStepView({
  capId,
  title,
  steps,
  tools,
  currentStepIndex,
  isStepDone,
  onMarkComplete,
  onAskMya,
  categoryOutcome,
}: CourseStepViewProps) {
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const completedCount = steps.filter((_, i) => isStepDone(capId, i)).length;
  const allDone = completedCount === steps.length;
  const progressPct = (completedCount / steps.length) * 100;

  const handleComplete = useCallback((stepIndex: number) => {
    // Pick a random encouragement
    const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    setEncouragement(msg);

    onMarkComplete(capId, stepIndex, steps.length);
    if (completedCount + 1 === steps.length) {
      celebrateMilestone();
    }
  }, [capId, completedCount, onMarkComplete, steps.length]);

  // Auto-clear encouragement after 1.8s
  useEffect(() => {
    if (!encouragement) return;
    const timer = setTimeout(() => setEncouragement(null), 1800);
    return () => clearTimeout(timer);
  }, [encouragement]);

  // Get relevant tools for current step
  const currentStep = steps[currentStepIndex];
  const relevantToolObjects = currentStep?.relevantTools
    ? tools.filter(t => currentStep.relevantTools!.includes(t.name))
    : [];

  return (
    <div className="space-y-3">
      {/* Category outcome summary */}
      {categoryOutcome && !allDone && (
        <div className="flex items-start gap-2 rounded-md p-2 bg-primary/5 border border-primary/10">
          <Target className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">You'll have built: </span>
            {categoryOutcome}
          </p>
        </div>
      )}

      {/* Progress header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {allDone ? "Complete!" : `Step ${currentStepIndex + 1} of ${steps.length}`}
          </span>
          <span>{completedCount}/{steps.length} done</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Completed steps toggle */}
      {completedCount > 0 && !allDone && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {completedCount} completed step{completedCount > 1 ? "s" : ""}
        </button>
      )}

      {/* Collapsed completed steps */}
      <AnimatePresence>
        {showCompleted && completedCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 mb-2">
              {steps.map((step, i) =>
                isStepDone(capId, i) ? (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="line-through">{step.text}</span>
                  </div>
                ) : null
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Encouragement micro-message */}
      <AnimatePresence>
        {encouragement && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-primary/10 border border-primary/20 rounded-md p-2.5 text-center"
          >
            <p className="text-xs font-medium text-primary">{encouragement}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All done card */}
      {allDone ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.4 }}
        >
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center space-y-2">
              <PartyPopper className="w-8 h-8 text-primary mx-auto" />
              <p className="font-medium text-sm">
                {title} — Complete!
              </p>
              <p className="text-xs text-muted-foreground">
                Great work. Move on to the next category to keep building.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Current step card */
        <AnimatePresence mode="wait">
          {!encouragement && (
            <motion.div
              key={currentStepIndex}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-primary/20">
                <CardContent className="p-4 space-y-3">
                  {/* Instruction */}
                  <p className="text-sm font-medium">{currentStep.text}</p>

                  {/* Why this matters */}
                  <div className="flex items-start gap-2 bg-accent/10 rounded-md p-2.5">
                    <HelpCircle className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Why this matters: </span>
                      {currentStep.why}
                    </p>
                  </div>

                  {/* Outcome indicator */}
                  {currentStep.outcome && (
                    <div className="flex items-start gap-2 bg-chart-2/10 rounded-md p-2.5 border border-chart-2/15">
                      <Check className="w-3.5 h-3.5 text-chart-2 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">After this step: </span>
                        {currentStep.outcome}
                      </p>
                    </div>
                  )}

                  {/* Relevant tool links */}
                  {relevantToolObjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {relevantToolObjects.map((tool) => (
                        <Badge key={tool.name} variant="outline" className="text-xs">
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
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleComplete(currentStepIndex)}
                      className="gap-1.5 flex-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Complete & Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    {currentStep.inAppAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(currentStep.inAppAction!.route)}
                        className="gap-1.5 text-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {currentStep.inAppAction.label}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAskMya(currentStep.helpPrompt)}
                      className="gap-1.5 text-xs"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Ask Mya
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
