import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Target, Zap } from "lucide-react";
import { useMissionProgress } from "@/hooks/useMissionProgress";
import { useMissionIntelligenceContext } from "@/contexts/MissionIntelligenceContext";
import { calculateLevel, getTotalXP } from "@/components/MissionControl/types";
import { useAuth } from "@/contexts/AuthContext";

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];

export default function StatusPill() {
  const { user } = useAuth();
  const { xpEarned, completedQuests } = useMissionProgress();
  const { totalXP, momentumCount, completedQuests: eventCompleted } = useMissionIntelligenceContext();

  if (!user) return null;

  const xp = Math.max(xpEarned, totalXP);
  const level = calculateLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level] || getTotalXP();
  const levelProgress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  const merged = [...new Set([...(completedQuests || []), ...(eventCompleted || [])])];
  const missionProgress = Math.round((xp / getTotalXP()) * 100);
  const streakDays = momentumCount > 0 ? Math.max(1, Math.floor(momentumCount / 3)) : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-xs font-medium text-emerald-100 transition-colors"
          aria-label="Open status breakdown"
        >
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lv {level}</span>
          <span className="text-emerald-400/60">·</span>
          <span>{xp} XP</span>
          <span className="text-emerald-400/60">·</span>
          <span>{Math.round(levelProgress)}% to Lv {Math.min(level + 1, 5)}</span>
          <span className="text-emerald-400/60">·</span>
          <span>Mission {missionProgress}%</span>
          {streakDays > 0 && (
            <>
              <span className="text-emerald-400/60">·</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" />
                {streakDays}-day
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="w-3.5 h-3.5" /> Level {level} progress
              </span>
              <span className="font-medium">{Math.round(levelProgress)}%</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="w-3.5 h-3.5" /> Mission progress
              </span>
              <span className="font-medium">{missionProgress}%</span>
            </div>
            <Progress value={missionProgress} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" /> Total XP
              </p>
              <p className="text-sm font-bold">{xp}</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" /> Momentum
              </p>
              <p className="text-sm font-bold">{momentumCount} actions / 24h</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {merged.length} quest{merged.length === 1 ? '' : 's'} completed
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
