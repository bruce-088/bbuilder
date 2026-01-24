import { motion } from "framer-motion";
import { Zap, Trophy, Target, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTotalXP, calculateLevel } from "./types";

interface XPProgressProps {
  currentXP: number;
  className?: string;
}

const LEVEL_NAMES = ['Beginner', 'Explorer', 'Builder', 'Launcher', 'Empire Builder'];
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];

export default function XPProgress({ currentXP, className = "" }: XPProgressProps) {
  const totalXP = getTotalXP();
  const level = calculateLevel(currentXP);
  const levelName = LEVEL_NAMES[level - 1];
  
  // Calculate progress within current level
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level] || totalXP;
  const levelProgress = ((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  
  // Overall progress
  const overallProgress = (currentXP / totalXP) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-4 border border-border/50 ${className}`}
    >
      {/* Level Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Level {level}</p>
            <p className="font-display font-semibold">{levelName}</p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 cursor-help">
              <Zap className="w-4 h-4 text-accent" />
              <span className="font-display font-bold text-accent">{currentXP} XP</span>
              <Info className="w-3 h-3 text-accent/60 ml-1" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium mb-1">How to earn XP:</p>
            <ul className="text-xs space-y-1">
              <li>• Generate an idea: +50 XP</li>
              <li>• Save an idea: +50 XP</li>
              <li>• Complete validation: +150 XP</li>
              <li>• Setup automation: +100 XP</li>
              <li>• Land first customer: +250 XP</li>
            </ul>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Level Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Level Progress</span>
          <span>{Math.round(levelProgress)}%</span>
        </div>
        <Progress value={levelProgress} className="h-2" />
      </div>

      {/* Overall Progress */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Mission Progress</span>
          </div>
          <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-primary rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
