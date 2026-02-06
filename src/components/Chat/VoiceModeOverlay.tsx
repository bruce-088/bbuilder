import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import myaAvatar from "@/assets/mya-avatar.png";
import type { VoiceModeState } from "@/hooks/useVoiceMode";

interface VoiceModeOverlayProps {
  state: VoiceModeState;
  liveTranscript: string;
  lastAssistantText: string;
  onStop: () => void;
}

const stateConfig: Record<
  Exclude<VoiceModeState, "idle">,
  { label: string; color: string; ringColor: string }
> = {
  listening: {
    label: "Listening...",
    color: "text-emerald-400",
    ringColor: "ring-emerald-400/60",
  },
  processing: {
    label: "Thinking...",
    color: "text-amber-400",
    ringColor: "ring-amber-400/60",
  },
  speaking: {
    label: "Mya is speaking...",
    color: "text-blue-400",
    ringColor: "ring-blue-400/60",
  },
};

export default function VoiceModeOverlay({
  state,
  liveTranscript,
  lastAssistantText,
  onStop,
}: VoiceModeOverlayProps) {
  if (state === "idle") return null;

  const config = stateConfig[state];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onStop}
          className="absolute top-6 right-6 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Avatar with animated ring */}
        <div className="relative mb-8">
          {/* Pulsing rings */}
          <motion.div
            className={`absolute inset-0 rounded-full ring-4 ${config.ringColor}`}
            animate={{
              scale: state === "listening" ? [1, 1.3, 1] : state === "speaking" ? [1, 1.2, 1] : [1, 1.1, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: state === "listening" ? 1.5 : state === "speaking" ? 1 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ margin: "-8px" }}
          />
          <motion.div
            className={`absolute inset-0 rounded-full ring-2 ${config.ringColor}`}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
            style={{ margin: "-4px" }}
          />

          <img
            src={myaAvatar}
            alt="Mya"
            className="w-24 h-24 rounded-full object-cover relative z-10"
          />

          {/* State icon badge */}
          <motion.div
            className={`absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center ${config.color}`}
            animate={state === "processing" ? { rotate: 360 } : {}}
            transition={state === "processing" ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            {state === "listening" && <Mic className="w-4 h-4" />}
            {state === "processing" && <Loader2 className="w-4 h-4" />}
            {state === "speaking" && <Volume2 className="w-4 h-4" />}
          </motion.div>
        </div>

        {/* Status text */}
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-medium mb-4 ${config.color}`}
        >
          {config.label}
        </motion.p>

        {/* Live transcript */}
        <div className="max-w-lg w-full px-6 text-center min-h-[60px]">
          {state === "listening" && liveTranscript && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-foreground/80 italic"
            >
              "{liveTranscript}"
            </motion.p>
          )}

          {state === "speaking" && lastAssistantText && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-sm text-muted-foreground line-clamp-3"
            >
              {lastAssistantText}
            </motion.p>
          )}

          {state === "processing" && (
            <motion.div
              className="flex items-center justify-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* Hint */}
        <p className="absolute bottom-8 text-xs text-muted-foreground">
          Say "stop" or "goodbye" to exit • Tap ✕ to close
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
