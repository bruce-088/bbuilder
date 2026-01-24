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
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUEST_STAGES } from "./types";

interface WhatsNextCardProps {
  completedQuests: string[];
  currentStage: number;
  hasBusinessIdeas: boolean;
  onGenerateIdea: () => void;
  onViewIdea: () => void;
  onStartChat: () => void;
}

interface NextAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  actionLabel: string;
  gradient: string;
}

export default function WhatsNextCard({
  completedQuests,
  currentStage,
  hasBusinessIdeas,
  onGenerateIdea,
  onViewIdea,
  onStartChat,
}: WhatsNextCardProps) {
  // Determine the next best action based on progress
  const getNextAction = (): NextAction => {
    // Stage 1: Foundation
    if (!completedQuests.includes('generate_idea')) {
      return {
        id: 'generate_idea',
        title: "Generate Your First Business Idea",
        description: "Let AI create a tailored, revenue-ready business concept just for you",
        icon: <Lightbulb className="w-5 h-5" />,
        action: onGenerateIdea,
        actionLabel: "Generate Idea",
        gradient: "from-amber-500/20 to-orange-500/20",
      };
    }

    if (!completedQuests.includes('save_idea')) {
      return {
        id: 'save_idea',
        title: "Save Your Favorite Idea",
        description: "Bookmark your best idea to unlock the Implementation Guide and automation tools",
        icon: <Bookmark className="w-5 h-5" />,
        action: onStartChat,
        actionLabel: "Review Ideas",
        gradient: "from-blue-500/20 to-cyan-500/20",
      };
    }

    // Stage 2: Validation
    if (!completedQuests.includes('review_checklist')) {
      return {
        id: 'review_checklist',
        title: "Open the Quick Start Checklist",
        description: "Follow the step-by-step guide to validate and implement your idea",
        icon: <CheckSquare className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "View Checklist",
        gradient: "from-green-500/20 to-emerald-500/20",
      };
    }

    if (!completedQuests.includes('complete_validation')) {
      return {
        id: 'complete_validation',
        title: "Validate Your Business Idea",
        description: "Complete market research and confirm there's real demand",
        icon: <Sparkles className="w-5 h-5" />,
        action: onViewIdea,
        actionLabel: "Continue Validation",
        gradient: "from-purple-500/20 to-pink-500/20",
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
      title: "Mission Accomplished! 🎉",
      description: "You've completed all quests. Now scale your empire!",
      icon: <Trophy className="w-5 h-5" />,
      action: onGenerateIdea,
      actionLabel: "Start New Venture",
      gradient: "from-emerald-500/20 to-green-500/20",
    };
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
          {currentStageData && (
            <span className="text-xs text-muted-foreground">
              Stage {currentStage}: {currentStageData.title}
            </span>
          )}
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
    </motion.div>
  );
}
