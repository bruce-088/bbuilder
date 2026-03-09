import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Phase {
  id: string;
  name: string;
  description: string;
  status: "completed" | "in-progress" | "pending";
  completionPercentage?: number;
}

interface VisualStrategyRoadmapProps {
  businessName: string;
  niche: string;
  phases: Phase[];
  onPhaseClick: (phaseId: string) => void;
  onSyncPhase?: (phaseId: string) => Promise<void>;
  syncingPhaseId?: string | null;
}

export function VisualStrategyRoadmap({
  businessName,
  niche,
  phases,
  onPhaseClick,
  onSyncPhase,
  syncingPhaseId,
}: VisualStrategyRoadmapProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-emerald-100 mb-1">{businessName}</h3>
        <p className="text-sm text-emerald-400">{niche}</p>
      </div>

      <div className="space-y-4">
        {phases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Connector Line */}
            {index < phases.length - 1 && (
              <div className="absolute left-5 top-12 h-8 w-0.5 bg-emerald-700" />
            )}

            <button
              onClick={() => onPhaseClick(phase.id)}
              className="w-full text-left group"
            >
              <div
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${
                    phase.status === "completed"
                      ? "bg-emerald-900/50 border-emerald-600 hover:border-emerald-500"
                      : phase.status === "in-progress"
                        ? "bg-amber-900/30 border-amber-600 hover:border-amber-500"
                        : "bg-emerald-950/50 border-emerald-800 hover:border-emerald-700"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {phase.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : phase.status === "in-progress" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-5 w-5 text-amber-400" />
                      </motion.div>
                    ) : (
                      <Circle className="h-5 w-5 text-emerald-700" />
                    )}
                  </div>

                  {/* Phase Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-emerald-100 group-hover:text-emerald-50">
                        {phase.name}
                      </h4>
                      {phase.status === "in-progress" && phase.completionPercentage !== undefined && (
                        <span className="text-xs font-medium text-amber-400">
                          {phase.completionPercentage}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-emerald-400 mb-2">{phase.description}</p>

                    {/* Progress Bar for In-Progress */}
                    {phase.status === "in-progress" && phase.completionPercentage !== undefined && (
                      <div className="h-1.5 bg-emerald-950 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${phase.completionPercentage}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sync to Nexus Button */}
                  {onSyncPhase && phase.status !== "completed" && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={syncingPhaseId === phase.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSyncPhase(phase.id);
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-1.5"
                    >
                      {syncingPhaseId === phase.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Sync to Nexus
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
