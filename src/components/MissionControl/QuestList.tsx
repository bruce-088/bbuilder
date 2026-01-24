import { motion } from "framer-motion";
import { Check, ChevronRight, Lock, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUEST_STAGES } from "./types";
import QuestPromptDialog from "./QuestPromptDialog";

interface QuestListProps {
  completedQuests: string[];
  currentStage: number;
  onQuestAction?: (questId: string) => void;
  className?: string;
}

export default function QuestList({ 
  completedQuests, 
  currentStage, 
  onQuestAction,
  className = "" 
}: QuestListProps) {
  return (
    <div className={`glass rounded-xl border border-border/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Your Quest Line
        </h3>
        <p className="text-sm text-muted-foreground">Complete quests to level up and reach your first customer</p>
      </div>
      
      <div className="divide-y divide-border/50">
        {QUEST_STAGES.map((stage, stageIndex) => {
          const isCurrentStage = stage.stage === currentStage;
          const isPastStage = stage.stage < currentStage;
          const isFutureStage = stage.stage > currentStage;
          
          return (
            <div key={stage.stage} className={`${isFutureStage ? "opacity-50" : ""}`}>
              {/* Stage Header */}
              <div className={`px-4 py-2 flex items-center gap-2 ${
                isCurrentStage 
                  ? "bg-primary/10" 
                  : isPastStage 
                    ? "bg-success/5" 
                    : "bg-muted/30"
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isPastStage 
                    ? "bg-success text-success-foreground" 
                    : isCurrentStage
                      ? "bg-primary text-primary-foreground animate-pulse"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {isPastStage ? <Check className="w-4 h-4" /> : stage.stage}
                </div>
                <span className={`text-sm font-medium ${
                  isCurrentStage ? "text-primary" : isPastStage ? "text-success" : "text-muted-foreground"
                }`}>
                  Stage {stage.stage}: {stage.title}
                </span>
                {isCurrentStage && (
                  <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
              
              {/* Quests */}
              <div className="px-4 py-2 space-y-2">
                {stage.quests.map((quest, questIndex) => {
                  const isComplete = completedQuests.includes(quest.id);
                  const isLocked = isFutureStage;
                  const isActive = isCurrentStage && !isComplete;
                  
                  return (
                    <motion.div
                      key={quest.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: stageIndex * 0.1 + questIndex * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isComplete 
                          ? "bg-success/10 border border-success/20" 
                          : isActive
                            ? "bg-primary/5 border border-primary/20 hover:bg-primary/10"
                            : "bg-muted/20 border border-transparent"
                      }`}
                    >
                      {/* Quest Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                        isComplete 
                          ? "bg-success/20" 
                          : isActive
                            ? "bg-primary/20"
                            : "bg-muted/50"
                      }`}>
                        {isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : quest.icon}
                      </div>
                      
                      {/* Quest Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          isComplete 
                            ? "text-success line-through" 
                            : isLocked 
                              ? "text-muted-foreground" 
                              : ""
                        }`}>
                          {quest.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {quest.description}
                        </p>
                      </div>
                      
                      {/* XP Badge */}
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                        isComplete 
                          ? "bg-success/20 text-success" 
                          : "bg-accent/20 text-accent"
                      }`}>
                        +{quest.xp} XP
                      </div>
                      
                      {/* Generate Prompt Button */}
                      {!isLocked && (
                        <QuestPromptDialog
                          questId={quest.id}
                          questTitle={quest.title}
                          trigger={
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              title="Generate Mya-style prompt"
                            >
                              <Wand2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                      )}

                      {/* Action Button */}
                      {isActive && onQuestAction && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 px-2"
                          onClick={() => onQuestAction(quest.id)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {isComplete && (
                        <Check className="w-5 h-5 text-success flex-shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
