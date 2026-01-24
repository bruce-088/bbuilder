import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ACHIEVEMENTS, type Achievement } from "./types";

interface AchievementBadgesProps {
  unlockedAchievements: string[];
  className?: string;
}

export default function AchievementBadges({ unlockedAchievements, className = "" }: AchievementBadgesProps) {
  return (
    <div className={`glass rounded-xl p-4 border border-border/50 ${className}`}>
      <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
        <span className="text-lg">🏅</span>
        Achievements
      </h3>
      
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {ACHIEVEMENTS.map((achievement, index) => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            
            return (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl cursor-pointer transition-all ${
                      isUnlocked
                        ? "bg-gradient-accent shadow-lg glow-accent"
                        : "bg-muted/50 grayscale opacity-50"
                    }`}
                  >
                    {achievement.icon}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-semibold">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  {isUnlocked && (
                    <p className="text-xs text-accent mt-1">✓ Unlocked!</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        {unlockedAchievements.length} of {ACHIEVEMENTS.length} unlocked
      </p>
    </div>
  );
}
