import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Rocket, Target, Zap, Lightbulb, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUEST_STAGES } from "./types";
import { cn } from "@/lib/utils";

interface BusinessIdeaProgress {
  id: string;
  business_name: string;
  niche: string;
  completedSteps: string[];
}

interface CurrentQuestCardProps {
  completedQuests: string[];
  currentStage: number;
  onAction: () => void;
  businessIdeas?: BusinessIdeaProgress[];
  onSelectIdea?: (ideaId: string) => void;
}

const QUICK_START_MILESTONES = [
  { id: 'validation', label: 'Validation', icon: '🔬' },
  { id: 'landing', label: 'Landing Page', icon: '🌐' },
  { id: 'offer', label: 'Offer', icon: '💰' },
  { id: 'outreach', label: 'Outreach', icon: '📧' },
  { id: 'sale', label: 'First Sale', icon: '🏆' },
];

export default function CurrentQuestCard({ 
  completedQuests, 
  currentStage,
  onAction,
  businessIdeas = [],
  onSelectIdea
}: CurrentQuestCardProps) {
  const [activeView, setActiveView] = useState<'quest' | 'ideas'>('quest');
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(0);
  
  // Find the next incomplete quest
  const currentStageData = QUEST_STAGES.find(s => s.stage === currentStage);
  const nextQuest = currentStageData?.quests.find(q => !completedQuests.includes(q.id));
  
  // Calculate stage progress
  const stageQuests = currentStageData?.quests || [];
  const completedInStage = stageQuests.filter(q => completedQuests.includes(q.id)).length;
  const stageProgress = stageQuests.length > 0 ? (completedInStage / stageQuests.length) * 100 : 0;

  const calculateIdeaProgress = (steps: string[]) => {
    if (!steps || steps.length === 0) return 0;
    const matchedMilestones = QUICK_START_MILESTONES.filter(m => 
      steps.some(s => s.toLowerCase().includes(m.id))
    );
    return (matchedMilestones.length / QUICK_START_MILESTONES.length) * 100;
  };

  const selectedIdea = businessIdeas[selectedIdeaIndex];
  
  const navigateIdea = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedIdeaIndex((prev) => (prev > 0 ? prev - 1 : businessIdeas.length - 1));
    } else {
      setSelectedIdeaIndex((prev) => (prev < businessIdeas.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl overflow-hidden border border-primary/30"
    >
      {/* Header with Toggle */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/20 to-transparent border-b border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Rocket className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-display font-semibold flex-shrink-0">Current Quest</span>
            
            {/* Idea Navigator - shows when in Ideas view */}
            {activeView === 'ideas' && businessIdeas.length > 0 && (
              <div className="flex items-center gap-2 ml-2 min-w-0">
                <span className="text-muted-foreground">·</span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-medium text-primary truncate max-w-[180px]">
                    {selectedIdea?.business_name || 'No ideas'}
                  </span>
                  <button
                    onClick={() => navigateIdea('next')}
                    className="p-1 rounded-md hover:bg-muted/30 text-primary transition-colors"
                    title="Next idea"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Toggle Buttons */}
          <div className="flex items-center bg-muted/30 rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => setActiveView('quest')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activeView === 'quest' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Quest
            </button>
            <button
              onClick={() => setActiveView('ideas')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                activeView === 'ideas' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Lightbulb className="w-3 h-3" />
              Ideas
              {businessIdeas.length > 0 && (
                <span className="bg-accent/20 text-accent px-1.5 py-0.5 rounded-full text-[10px]">
                  {businessIdeas.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'quest' ? (
          <motion.div
            key="quest-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {!nextQuest ? (
              // All quests complete!
              <div className="p-6">
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
              </div>
            ) : (
              <>
                {/* Quest Content */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center text-2xl flex-shrink-0">
                      {nextQuest.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-display font-bold text-lg">{nextQuest.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          Stage {currentStage}: {currentStageData?.title}
                        </span>
                      </div>
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
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="ideas-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {businessIdeas.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted/30 flex items-center justify-center mb-3">
                  <Lightbulb className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-3">No business ideas yet</p>
                <Button onClick={onAction} variant="outline" size="sm">
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Your First Idea
                </Button>
              </div>
            ) : selectedIdea ? (
              <div className="space-y-4">
                {/* Selected Idea Details */}
                <motion.div
                  key={selectedIdea.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-border/50 bg-muted/10"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-base truncate">
                        {selectedIdea.business_name}
                      </h5>
                      <p className="text-xs text-muted-foreground truncate">{selectedIdea.niche}</p>
                    </div>
                    
                    {/* Start Quest Button */}
                    <Button
                      onClick={() => onSelectIdea?.(selectedIdea.id)}
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90 btn-glow"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      Start Quest
                    </Button>
                    
                    <div className="flex items-center gap-1 text-sm">
                      <span className={cn(
                        "font-semibold",
                        calculateIdeaProgress(selectedIdea.completedSteps) >= 100 
                          ? "text-success" 
                          : calculateIdeaProgress(selectedIdea.completedSteps) > 0 
                            ? "text-accent" 
                            : "text-muted-foreground"
                      )}>
                        {Math.round(calculateIdeaProgress(selectedIdea.completedSteps))}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${calculateIdeaProgress(selectedIdea.completedSteps)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        calculateIdeaProgress(selectedIdea.completedSteps) >= 100 
                          ? "bg-success" 
                          : "bg-gradient-primary"
                      )}
                    />
                  </div>
                  
                  {/* Milestone Icons */}
                  <div className="flex items-center justify-between gap-2">
                    {QUICK_START_MILESTONES.map((milestone) => {
                      const isCompleted = selectedIdea.completedSteps?.some(s => 
                        s.toLowerCase().includes(milestone.id)
                      );
                      return (
                        <div 
                          key={milestone.id} 
                          className={cn(
                            "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                            isCompleted 
                              ? "bg-success/10 border border-success/20" 
                              : "bg-muted/20 border border-border/30"
                          )}
                          title={`${milestone.label}: ${isCompleted ? 'Complete' : 'Incomplete'}`}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                            isCompleted 
                              ? "bg-success/20" 
                              : "bg-muted/30"
                          )}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <span className="opacity-50">{milestone.icon}</span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] font-medium",
                            isCompleted ? "text-success" : "text-muted-foreground"
                          )}>
                            {milestone.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
                
                {/* View Details Button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {selectedIdeaIndex + 1} of {businessIdeas.length} ideas
                  </span>
                  <Button 
                    onClick={() => onSelectIdea?.(selectedIdea.id)} 
                    variant="outline" 
                    size="sm"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
