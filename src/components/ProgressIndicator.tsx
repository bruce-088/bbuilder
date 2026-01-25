import { Check, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProgressIndicatorProps {
  completedSteps: string[];
  isActiveQuest?: boolean;
  compact?: boolean;
}

const MILESTONE_KEYS = [
  { key: 'validation', label: 'Validation', keywords: ['validation', 'validate'] },
  { key: 'landing', label: 'Landing Page', keywords: ['landing', 'website'] },
  { key: 'offer', label: 'Offer', keywords: ['offer', 'pricing'] },
  { key: 'outreach', label: 'Outreach', keywords: ['outreach', 'prospect'] },
  { key: 'sale', label: 'First Sale', keywords: ['sale', 'customer'] },
];

export default function ProgressIndicator({ completedSteps, isActiveQuest, compact }: ProgressIndicatorProps) {
  const completedMilestones = MILESTONE_KEYS.filter(milestone =>
    completedSteps.some(step =>
      milestone.keywords.some(keyword => step.toLowerCase().includes(keyword))
    )
  );

  const totalMilestones = MILESTONE_KEYS.length;
  const completed = completedMilestones.length;

  if (completed === 0 && !isActiveQuest) return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {isActiveQuest && (
              <Crown className="w-3 h-3 text-accent fill-accent" />
            )}
            {completed > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="flex -space-x-1">
                  {MILESTONE_KEYS.slice(0, completed).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary ring-1 ring-background"
                    />
                  ))}
                </div>
                <span>{completed}/{totalMilestones}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            {isActiveQuest && <p className="font-semibold text-accent mb-1">Active Quest</p>}
            {completed > 0 ? (
              <p>{completed} of {totalMilestones} milestones complete</p>
            ) : (
              <p>No milestones completed yet</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {isActiveQuest && (
        <Tooltip>
          <TooltipTrigger>
            <Crown className="w-3.5 h-3.5 text-accent fill-accent" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Active Quest</p>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="flex gap-0.5">
        {MILESTONE_KEYS.map((milestone, i) => {
          const isCompleted = completedMilestones.some(m => m.key === milestone.key);
          return (
            <Tooltip key={milestone.key}>
              <TooltipTrigger>
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isCompleted 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="flex items-center gap-1">
                  {isCompleted && <Check className="w-3 h-3 text-primary" />}
                  {milestone.label}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {completed > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          {completed}/{totalMilestones}
        </span>
      )}
    </div>
  );
}
