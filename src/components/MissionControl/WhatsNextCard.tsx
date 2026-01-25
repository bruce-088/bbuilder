import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Lightbulb, 
  Bookmark, 
  CheckSquare, 
  Globe, 
  DollarSign, 
  Bot, 
  Mail, 
  Trophy,
  Sparkles,
  FolderOpen,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QUEST_STAGES } from "./types";

interface BusinessIdeaOption {
  id: string;
  business_name: string;
  niche: string;
  completedSteps?: string[];
}

interface WhatsNextCardProps {
  completedQuests: string[];
  currentStage: number;
  hasBusinessIdeas: boolean;
  businessIdeas?: BusinessIdeaOption[];
  activeQuestId?: string | null;
  onGenerateIdea: () => void;
  onViewIdea: () => void;
  onStartChat: () => void;
  onSelectIdea?: (ideaId: string) => void;
}

interface NextAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  actionLabel: string;
  gradient: string;
  questName?: string;
}

// Milestones for active quest progress
const QUEST_MILESTONES = [
  { id: 'validation', label: 'Validation', questId: 'complete_validation' },
  { id: 'landing_page', label: 'Landing Page', questId: 'create_landing' },
  { id: 'offer_pricing', label: 'Offer & Pricing', questId: 'define_offer' },
  { id: 'outreach', label: 'Outreach', questId: 'start_outreach' },
  { id: 'first_sale', label: 'First Sale', questId: 'first_sale' },
];

export default function WhatsNextCard({
  completedQuests,
  currentStage,
  hasBusinessIdeas,
  businessIdeas = [],
  activeQuestId,
  onGenerateIdea,
  onViewIdea,
  onStartChat,
  onSelectIdea,
}: WhatsNextCardProps) {
  const [showVentureDialog, setShowVentureDialog] = useState(false);
  
  // Get the active quest business idea
  const activeQuestIdea = activeQuestId 
    ? businessIdeas.find(idea => idea.id === activeQuestId) 
    : null;
  // Determine the next best action based on progress
  const getNextAction = (): NextAction => {
    // If there's an active quest, show progress for that specific idea
    if (activeQuestIdea) {
      const completedSteps = activeQuestIdea.completedSteps || [];
      
      // Check each milestone in order for the active quest
      if (!completedSteps.includes('validation')) {
        return {
          id: 'complete_validation',
          title: "Validate Your Business Idea",
          description: "Complete market research and confirm there's real demand",
          icon: <Sparkles className="w-5 h-5" />,
          action: onViewIdea,
          actionLabel: "Continue Validation",
          gradient: "from-purple-500/20 to-pink-500/20",
          questName: activeQuestIdea.business_name,
        };
      }

      if (!completedSteps.includes('landing_page')) {
        return {
          id: 'create_landing',
          title: "Create Your Landing Page",
          description: "Set up a simple offer page to start capturing leads",
          icon: <Globe className="w-5 h-5" />,
          action: onViewIdea,
          actionLabel: "Build Landing Page",
          gradient: "from-indigo-500/20 to-blue-500/20",
          questName: activeQuestIdea.business_name,
        };
      }

      if (!completedSteps.includes('offer_pricing')) {
        return {
          id: 'define_offer',
          title: "Define Your Offer & Pricing",
          description: "Finalize your service packages and pricing strategy",
          icon: <DollarSign className="w-5 h-5" />,
          action: onViewIdea,
          actionLabel: "Set Pricing",
          gradient: "from-green-500/20 to-teal-500/20",
          questName: activeQuestIdea.business_name,
        };
      }

      if (!completedSteps.includes('outreach')) {
        return {
          id: 'start_outreach',
          title: "Start Customer Outreach",
          description: "Begin prospecting and reaching out to potential customers",
          icon: <Mail className="w-5 h-5" />,
          action: onViewIdea,
          actionLabel: "Start Outreach",
          gradient: "from-orange-500/20 to-red-500/20",
          questName: activeQuestIdea.business_name,
        };
      }

      if (!completedSteps.includes('first_sale')) {
        return {
          id: 'first_sale',
          title: "Close Your First Sale! 🎯",
          description: "You're so close! Land your first paying customer to complete the mission",
          icon: <Trophy className="w-5 h-5" />,
          action: onViewIdea,
          actionLabel: "Track Progress",
          gradient: "from-yellow-500/20 to-amber-500/20",
          questName: activeQuestIdea.business_name,
        };
      }

      // Active quest is complete!
      return {
        id: 'complete',
        title: "Quest Complete! 🎉",
        description: `You've completed ${activeQuestIdea.business_name}. Start a new venture!`,
        icon: <Trophy className="w-5 h-5" />,
        action: () => setShowVentureDialog(true),
        actionLabel: "Start New Venture",
        gradient: "from-emerald-500/20 to-green-500/20",
        questName: activeQuestIdea.business_name,
      };
    }

    // Default flow when no active quest is set
    // Stage 1: Foundation
    if (!completedQuests.includes('generate_idea')) {
      return {
        id: 'generate_idea',
          title: "The Fun Begins Here! ✨",
          description: "One click, and Mya creates your perfect business plan—easy!",
        icon: <Lightbulb className="w-5 h-5" />,
        action: onGenerateIdea,
        actionLabel: "Let's Go!",
        gradient: "from-amber-500/20 to-orange-500/20",
      };
    }

    if (!completedQuests.includes('save_idea')) {
      return {
        id: 'save_idea',
          title: "Found One You Love?",
          description: "Save it to unlock your implementation toolkit—you're already ahead!",
        icon: <Bookmark className="w-5 h-5" />,
        action: onStartChat,
        actionLabel: "Pick a Winner",
        gradient: "from-blue-500/20 to-cyan-500/20",
      };
    }

    // Stage 2: Validation
    if (!completedQuests.includes('review_checklist')) {
      return {
        id: 'review_checklist',
        title: "Open the Quick Start Checklist",
        description: "Follow the step-by-step guide to validate and implement your plan",
        icon: <CheckSquare className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "View Checklist",
        gradient: "from-green-500/20 to-emerald-500/20",
      };
    }

    // Stage 3: Build
    if (!completedQuests.includes('create_landing')) {
      return {
        id: 'create_landing',
        title: "Create Your Landing Page",
        description: "Set up a simple offer page to start capturing leads",
        icon: <Globe className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "Build Landing Page",
        gradient: "from-indigo-500/20 to-blue-500/20",
      };
    }

    if (!completedQuests.includes('define_offer')) {
      return {
        id: 'define_offer',
        title: "Define Your Offer & Pricing",
        description: "Finalize your service packages and pricing strategy",
        icon: <DollarSign className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "Set Pricing",
        gradient: "from-green-500/20 to-teal-500/20",
      };
    }

    // Stage 4: Launch
    if (!completedQuests.includes('setup_automation')) {
      return {
        id: 'setup_automation',
        title: "Setup Your Automation",
        description: "Generate an n8n workflow to automate your business operations",
        icon: <Bot className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "Create Workflow",
        gradient: "from-violet-500/20 to-purple-500/20",
      };
    }

    if (!completedQuests.includes('start_outreach')) {
      return {
        id: 'start_outreach',
        title: "Start Customer Outreach",
        description: "Begin prospecting and reaching out to potential customers",
        icon: <Mail className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "Start Outreach",
        gradient: "from-orange-500/20 to-red-500/20",
      };
    }

    // Stage 5: First Customer
    if (!completedQuests.includes('first_sale')) {
      return {
        id: 'first_sale',
        title: "Close Your First Sale! 🎯",
        description: "You're so close! Land your first paying customer to complete the mission",
        icon: <Trophy className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "Track Progress",
        gradient: "from-yellow-500/20 to-amber-500/20",
      };
    }

    // All complete
    return {
      id: 'complete',
      title: "You Did It! 🎉",
      description: "All quests complete! Ready for your next adventure?",
      icon: <Trophy className="w-5 h-5" />,
      action: () => setShowVentureDialog(true),
      actionLabel: "New Adventure",
      gradient: "from-emerald-500/20 to-green-500/20",
    };
  };

  const handleContinueFromIdea = (ideaId: string) => {
    setShowVentureDialog(false);
    onSelectIdea?.(ideaId);
  };

  const handleStartFresh = () => {
    setShowVentureDialog(false);
    onGenerateIdea();
  };

  const nextAction = getNextAction();
  const currentStageData = QUEST_STAGES.find(s => s.stage === currentStage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`glass rounded-xl p-4 border border-accent/30 bg-gradient-to-br ${nextAction.gradient}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
          {nextAction.icon}
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm">What's Next?</h3>
          {nextAction.questName ? (
            <span className="text-xs text-accent font-medium">
              🎯 {nextAction.questName}
            </span>
          ) : currentStageData ? (
            <span className="text-xs text-muted-foreground">
              Stage {currentStage}: {currentStageData.title}
            </span>
          ) : null}
        </div>
      </div>
      
      <h4 className="font-medium text-base mb-1">{nextAction.title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{nextAction.description}</p>
      
      <Button 
        size="sm" 
        onClick={nextAction.action}
        className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {nextAction.actionLabel}
        <ArrowRight className="w-4 h-4" />
      </Button>

      {/* New Venture Dialog */}
      <Dialog open={showVentureDialog} onOpenChange={setShowVentureDialog}>
        <DialogContent className="sm:max-w-sm max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-accent shrink-0" />
              Start Your Next Venture
            </DialogTitle>
            <DialogDescription className="text-sm">
              Choose how to proceed with your next journey.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-2">
            {/* Start Fresh Option */}
            <button
              onClick={handleStartFresh}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-accent hover:bg-accent/5 transition-colors text-left"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-accent/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm">Start Fresh</div>
                <div className="text-xs text-muted-foreground">
                  Generate a new business plan
                </div>
              </div>
            </button>

            {/* Continue from Saved Idea */}
            {businessIdeas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FolderOpen className="w-3 h-3 shrink-0" />
                  <span>Continue from saved plan:</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {businessIdeas.map((idea) => (
                    <button
                      key={idea.id}
                      onClick={() => handleContinueFromIdea(idea.id)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:border-accent hover:bg-accent/5 transition-colors text-left"
                    >
                      <div className="w-7 h-7 shrink-0 rounded-md bg-primary/20 flex items-center justify-center">
                        <Lightbulb className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{idea.business_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {idea.niche}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
