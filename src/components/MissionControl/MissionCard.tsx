import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, MessageSquare, ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";

export interface MissionStep {
  key: string;
  label: string;
  status: "done" | "current" | "upcoming";
}

interface MissionCardProps {
  title: string;
  subtitle?: string;
  ideaCount: number;
  steps: MissionStep[];
  nextStepLabel?: string;
  onContinue: () => void;
  onChat: () => void;
  onViewDetails: () => void;
}

export default function MissionCard({
  title,
  subtitle,
  ideaCount,
  steps,
  nextStepLabel,
  onContinue,
  onChat,
  onViewDetails,
}: MissionCardProps) {
  return (
    <Card className="glass border-emerald-500/20 shadow-[0_0_24px_-12px_hsl(160_84%_39%/0.35)]">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-bold truncate">{title}</h2>
                {ideaCount > 0 && (
                  <Badge variant="outline" className="border-violet-500/40 text-violet-300 bg-violet-500/10 text-[10px]">
                    Ideas: {ideaCount}
                  </Badge>
                )}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <Button
            onClick={onChat}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            Chat with Mya
          </Button>
        </div>

        {/* Stepper */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-1">
            {steps.map((step, i) => (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: step.status === "current" ? [1, 1.08, 1] : 1,
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: step.status === "current" ? Infinity : 0,
                    }}
                    className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                      step.status === "done"
                        ? "bg-emerald-500 border-emerald-500"
                        : step.status === "current"
                        ? "bg-transparent border-emerald-400 ring-2 ring-emerald-400/30"
                        : "bg-transparent border-muted-foreground/40"
                    }`}
                  />
                  <span
                    className={`text-[10px] uppercase tracking-wide truncate max-w-[70px] ${
                      step.status === "current"
                        ? "text-emerald-300 font-semibold"
                        : step.status === "done"
                        ? "text-emerald-500/80"
                        : "text-muted-foreground/70"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 -mt-4 rounded ${
                      steps[i + 1].status === "done" || step.status === "done"
                        ? "bg-emerald-500/60"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
          <p className="text-sm text-muted-foreground min-w-0 truncate">
            <span className="text-foreground/80 font-medium">Next step:</span>{" "}
            {nextStepLabel || "Keep building"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onViewDetails} className="gap-1">
              <Eye className="w-3.5 h-3.5" />
              View details
            </Button>
            <Button
              size="sm"
              onClick={onContinue}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
            >
              Continue Quest
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
