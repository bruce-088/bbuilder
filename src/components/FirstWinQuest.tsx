/**
 * FirstWinQuest.tsx — bbuilder Onboarding, Beat 1 + Beat 2
 *
 * T1 of The First Win Quest (approved spec v2.0, 2026-06-13).
 *
 * Covers:
 *   Beat 1 — Mya's opening prompt + user goal capture + goal reframe
 *   Beat 2 — Business-context scoping question
 *
 * Intentionally scoped to T1 only. No AI API calls (static reframe).
 * No add_lead call (T4). No log_revenue seed (T6). No Day 2 scheduler (T7).
 * Those are separate implementation slices.
 *
 * Storage: localStorage only. No Supabase migration required for T1.
 *   key: STORAGE_KEY — marks T1 complete
 *   key: GOAL_KEY    — persists user's stated goal for downstream use
 *   key: MODEL_KEY   — persists business model for downstream use
 *
 * Future: replace static goal-reframe with Mya LLM call via /functions/chat.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import myaAvatar from "@/assets/mya-avatar.png";

// ── Storage keys ──────────────────────────────────────────────────────────────

export const FIRST_WIN_QUEST_T1_KEY  = "bbuilder_first_win_quest_t1_complete";
export const FIRST_WIN_QUEST_GOAL    = "bbuilder_first_win_goal";
export const FIRST_WIN_QUEST_MODEL   = "bbuilder_first_win_business_model";

// ── Business model options ────────────────────────────────────────────────────

const BUSINESS_MODELS = [
  { id: "discovery_calls",  label: "Discovery calls",  emoji: "📞" },
  { id: "proposals",        label: "Proposals",        emoji: "📄" },
  { id: "free_trials",      label: "Free trials",      emoji: "🎁" },
  { id: "referrals",        label: "Referrals",        emoji: "🤝" },
  { id: "content",          label: "Content / inbound",emoji: "✍️" },
  { id: "other",            label: "Something else",   emoji: "💡" },
] as const;

export type BusinessModelId = (typeof BUSINESS_MODELS)[number]["id"];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFirstWinQuest() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(FIRST_WIN_QUEST_T1_KEY);
    if (!done) {
      // Small delay so the app frame renders first
      const t = setTimeout(() => setShow(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  const complete = (goal: string, model: BusinessModelId) => {
    localStorage.setItem(FIRST_WIN_QUEST_T1_KEY, new Date().toISOString());
    localStorage.setItem(FIRST_WIN_QUEST_GOAL,  goal);
    localStorage.setItem(FIRST_WIN_QUEST_MODEL, model);
    setShow(false);
  };

  const reset = () => {
    localStorage.removeItem(FIRST_WIN_QUEST_T1_KEY);
    localStorage.removeItem(FIRST_WIN_QUEST_GOAL);
    localStorage.removeItem(FIRST_WIN_QUEST_MODEL);
    setShow(true);
  };

  return { show, complete, reset };
}

// ── Mya speech bubble ─────────────────────────────────────────────────────────

function MyaBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="flex items-start gap-3"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/30">
        <img src={myaAvatar} alt="Mya" className="w-full h-full object-cover" />
      </div>
      {/* Bubble */}
      <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-tl-none px-4 py-3 max-w-[400px]">
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/30">
        <img src={myaAvatar} alt="Mya" className="w-full h-full object-cover" />
      </div>
      <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-tl-none px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 0.15, 0.3].map((d) => (
            <motion.span
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, delay: d }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FirstWinQuestProps {
  onComplete: (goal: string, model: BusinessModelId) => void;
}

type QuestStep =
  | "mya_opening"          // Beat 1a: greeting shown
  | "user_goal_input"      // Beat 1b: user types goal
  | "mya_reframe_typing"   // Beat 1c: Mya "types" reframe
  | "mya_reframe_shown"    // Beat 1d: reframe visible
  | "mya_context_question" // Beat 2a: scoping question shown
  | "user_model_select"    // Beat 2b: user picks business model
  | "completing";          // Transition out

export default function FirstWinQuest({ onComplete }: FirstWinQuestProps) {
  const [step,  setStep]  = useState<QuestStep>("mya_opening");
  const [goal,  setGoal]  = useState("");
  const [model, setModel] = useState<BusinessModelId | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus goal input when it appears
  useEffect(() => {
    if (step === "user_goal_input") {
      setTimeout(() => textRef.current?.focus(), 200);
    }
  }, [step]);

  // After greeting, reveal the input after a short pause
  useEffect(() => {
    if (step === "mya_opening") {
      const t = setTimeout(() => setStep("user_goal_input"), 1200);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleGoalSubmit = () => {
    if (!goal.trim()) return;
    setStep("mya_reframe_typing");
    // Simulate Mya thinking, then show reframe
    setTimeout(() => setStep("mya_reframe_shown"), 1400);
    // Then show the context question
    setTimeout(() => setStep("mya_context_question"), 2600);
    // Then reveal model selection
    setTimeout(() => setStep("user_model_select"), 3800);
  };

  const handleModelSelect = (id: BusinessModelId) => {
    setModel(id);
    setStep("completing");
    setTimeout(() => onComplete(goal.trim(), id), 600);
  };

  // Build the reframe text from the user's goal (T1.5: replace with Mya LLM)
  const reframeText = goal.trim()
    ? `Got it. "${goal.trim()}" is your #1 move right now. I've got you — let's build around that.`
    : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />

        {/* Quest card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="relative z-10 w-full max-w-lg glass rounded-2xl border border-primary/20 overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border/40">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium tracking-wide uppercase">The First Win Quest</span>
            </div>
          </div>

          {/* Conversation area */}
          <div className="px-6 py-5 space-y-4 min-h-[200px]">

            {/* Beat 1a — Mya opening */}
            <MyaBubble
              text="What is the one goal you want to accomplish right now?"
              delay={0.1}
            />

            {/* Beat 1b — user goal input */}
            <AnimatePresence>
              {(step === "user_goal_input" ||
                step === "mya_reframe_typing" ||
                step === "mya_reframe_shown" ||
                step === "mya_context_question" ||
                step === "user_model_select" ||
                step === "completing") && (
                <motion.div
                  key="goal-input-area"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-end gap-2"
                >
                  {/* Show submitted goal as a user bubble once submitted */}
                  {step !== "user_goal_input" ? (
                    <div className="bg-primary/15 border border-primary/20 rounded-2xl rounded-tr-none px-4 py-3 max-w-[340px] self-end">
                      <p className="text-sm leading-relaxed">{goal}</p>
                    </div>
                  ) : (
                    /* Editable textarea */
                    <div className="w-full space-y-2">
                      <Textarea
                        ref={textRef}
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleGoalSubmit();
                          }
                        }}
                        placeholder="e.g. Close a deal with Acme Corp this week"
                        className="resize-none text-sm rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-muted/30"
                        rows={2}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleGoalSubmit}
                          disabled={!goal.trim()}
                          className="gap-1.5 bg-gradient-primary hover:opacity-90"
                        >
                          Send
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Beat 1c — Mya typing indicator */}
            <AnimatePresence>
              {step === "mya_reframe_typing" && <TypingIndicator />}
            </AnimatePresence>

            {/* Beat 1d — Mya goal reframe */}
            <AnimatePresence>
              {(step === "mya_reframe_shown" ||
                step === "mya_context_question" ||
                step === "user_model_select" ||
                step === "completing") && (
                <MyaBubble text={reframeText} />
              )}
            </AnimatePresence>

            {/* Beat 2a — Business context scoping */}
            <AnimatePresence>
              {(step === "mya_context_question" ||
                step === "user_model_select" ||
                step === "completing") && (
                <MyaBubble
                  text="Understood. And how do you typically win new business?"
                  delay={0.1}
                />
              )}
            </AnimatePresence>

            {/* Beat 2b — Business model selection */}
            <AnimatePresence>
              {(step === "user_model_select" || step === "completing") && (
                <motion.div
                  key="model-select"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {BUSINESS_MODELS.map(({ id, label, emoji }) => (
                    <button
                      key={id}
                      onClick={() => handleModelSelect(id)}
                      disabled={step === "completing"}
                      className={`
                        flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left
                        transition-all duration-150
                        ${model === id
                          ? "bg-primary/20 border-primary/50 text-foreground"
                          : "bg-muted/30 border-border/40 hover:bg-muted/60 hover:border-primary/30 text-foreground/80"
                        }
                      `}
                    >
                      <span className="text-base">{emoji}</span>
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-1">
            <p className="text-xs text-muted-foreground/60 text-center">
              Mya · bbuilder AI
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
