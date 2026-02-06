import { Check, Circle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useManualProgress } from "@/hooks/useManualProgress";
import type { CapabilityArea } from "@/components/UnifiedSetupGuide";

const MILESTONE_KEYS = [
  { key: 'validation', label: 'Validation', keywords: ['validation', 'validate'] },
  { key: 'landing', label: 'Landing Page', keywords: ['landing', 'website'] },
  { key: 'offer', label: 'Offer', keywords: ['offer', 'pricing'] },
  { key: 'outreach', label: 'Outreach', keywords: ['outreach', 'prospect'] },
  { key: 'sale', label: 'First Sale', keywords: ['sale', 'customer'] },
];

interface UnifiedProgressCardProps {
  completedMilestones: string[];
  capabilities: CapabilityArea[];
  onOpenSetupGuide: () => void;
  activeQuestName?: string;
}

export default function UnifiedProgressCard({
  completedMilestones,
  capabilities,
  onOpenSetupGuide,
  activeQuestName,
}: UnifiedProgressCardProps) {
  const { getCompleted, getOverallProgress } = useManualProgress(capabilities);

  const milestonesDone = MILESTONE_KEYS.filter((m) =>
    completedMilestones.some((step) =>
      m.keywords.some((kw) => step.toLowerCase().includes(kw))
    )
  );

  const guideProgress = getOverallProgress();
  const milestoneCount = milestonesDone.length;
  const totalMilestones = MILESTONE_KEYS.length;

  // Weighted: milestones worth 40%, guide worth 60%
  const milestonePercent = (milestoneCount / totalMilestones) * 100;
  const guidePercent = guideProgress.total > 0
    ? (guideProgress.completed / guideProgress.total) * 100
    : 0;
  const combinedPercent = Math.round(milestonePercent * 0.4 + guidePercent * 0.6);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg">Your Progress</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeQuestName ? `Tracking: ${activeQuestName}` : "No active quest"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSetupGuide}>
          <BookOpen className="w-4 h-4 mr-1.5" />
          Open Setup Guide
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={combinedPercent} className="h-2" />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Business Milestones */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Business Milestones
            </h4>
            <ul className="space-y-2">
              {MILESTONE_KEYS.map((m) => {
                const done = milestonesDone.some((d) => d.key === m.key);
                return (
                  <li key={m.key} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>
                      {m.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {milestoneCount} of {totalMilestones} milestones complete
            </p>
          </div>

          {/* Right: Setup Guide */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Setup Guide
            </h4>
            <ul className="space-y-2">
              {capabilities.map((cap) => {
                const total = cap.manual.steps.length;
                const done = getCompleted(cap.id, total);
                const pct = total > 0 ? (done / total) * 100 : 0;
                const Icon = cap.icon;
                return (
                  <li key={cap.id} className="flex items-center gap-2 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{cap.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Progress value={pct} className="h-1.5 w-16" />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {done}/{total}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {guideProgress.completed}/{guideProgress.total} steps overall
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
