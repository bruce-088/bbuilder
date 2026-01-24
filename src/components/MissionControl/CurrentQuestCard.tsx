import { motion } from "framer-motion";
import { ChevronRight, Rocket, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUEST_STAGES } from "./types";

interface CurrentQuestCardProps {
  completedQuests: string[];
  currentStage: number;
  onAction: () => void;
}

export default function CurrentQuestCard({ 
  completedQuests, 
  currentStage,
  onAction 
}: CurrentQuestCardProps) {
  // Find the next incomplete quest
  const currentStageData = QUEST_STAGES.find(s => s.stage === currentStage);
  const nextQuest = currentStageData?.quests.find(q => !completedQuests.includes(q.id));
  
  // Calculate stage progress
  const stageQuests = currentStageData?.quests || [];
  const completedInStage = stageQuests.filter(q => completedQuests.includes(q.id)).length;
  const stageProgress = stageQuests.length > 0 ? (completedInStage / stageQuests.length) * 100 : 0;

  if (!nextQuest) {
    // All quests complete!
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-xl p-6 border border-success/30 bg-gradient-to-br from-success/10 to-transparent"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="font-display text-xl font-bold text-success mb-2">
            Mission Complete!
          </h3>
          <p className="text-muted-foreground">
            You've completed all quests. Time to build your empire!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl overflow-hidden border border-primary/30"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/20 to-transparent border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <span className="font-display font-semibold">Current Quest</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Stage {currentStage}: {currentStageData?.title}
        </span>
      </div>

      {/* Quest Content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center text-2xl flex-shrink-0">
            {nextQuest.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-display font-bold text-lg mb-1">{nextQuest.title}</h4>
            <p className="text-sm text-muted-foreground mb-3">{nextQuest.description}</p>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={onAction}
                className="bg-gradient-primary hover:opacity-90 btn-glow"
              >
                <Zap className="w-4 h-4 mr-2" />
                Start Quest
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <div className="flex items-center gap-1 text-accent font-bold">
                <Target className="w-4 h-4" />
                +{nextQuest.xp} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Progress */}
      <div className="px-5 py-3 bg-muted/20 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Stage Progress</span>
          <span>{completedInStage} of {stageQuests.length} quests</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stageProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-primary rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
