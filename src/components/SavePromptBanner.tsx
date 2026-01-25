import { motion } from "framer-motion";
import { Bookmark, ArrowRight, Sparkles } from "lucide-react";

interface SavePromptBannerProps {
  onSave: () => void;
  isSaving?: boolean;
}

export default function SavePromptBanner({ onSave, isSaving }: SavePromptBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 animate-pulse" />
      <button
        onClick={onSave}
        disabled={isSaving}
        className="relative w-full p-3 rounded-lg border border-accent/40 bg-accent/10 backdrop-blur-sm text-left group hover:bg-accent/20 transition-all disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center flex-shrink-0">
            <Bookmark className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-accent" />
              Save this plan to unlock tools
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get Implementation Guide, n8n Automation, and Quick Start Checklist
            </p>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0 text-accent group-hover:translate-x-1 transition-transform" />
        </div>
      </button>
    </motion.div>
  );
}
