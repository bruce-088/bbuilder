// Mission Control Types

export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: string;
  isComplete: boolean;
  isActive: boolean;
  action?: () => void;
  actionLabel?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface MissionProgress {
  id: string;
  user_id: string;
  mission_started_at: string;
  target_date: string;
  current_stage: number;
  xp_earned: number;
  achievements: string[];
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_idea', title: 'Plan Generator', description: 'Generate your first business plan', icon: '💡' },
  { id: 'idea_saved', title: 'Plan Keeper', description: 'Save a business plan to your library', icon: '📚' },
  { id: 'deep_dive', title: 'Deep Diver', description: 'Complete the Quick Start Checklist', icon: '🤿' },
  { id: 'automator', title: 'Automator', description: 'Generate your first n8n workflow', icon: '⚙️' },
  { id: 'implementer', title: 'Implementer', description: 'Complete 3 implementation steps', icon: '🛠️' },
  { id: 'closer', title: 'Deal Closer', description: 'Mark your first sale complete', icon: '🎯' },
  { id: 'empire_builder', title: 'Empire Builder', description: 'Complete all quests', icon: '👑' },
];

// Quest definitions
export const QUEST_STAGES = [
  {
    stage: 1,
    title: 'Foundation',
    quests: [
      { id: 'generate_idea', title: 'Generate Your First Plan', description: 'Use AI to create a tailored business concept', xp: 100, icon: '💡' },
      { id: 'save_idea', title: 'Save to Library', description: 'Save your favorite plan for implementation', xp: 50, icon: '📌' },
    ]
  },
  {
    stage: 2,
    title: 'Validation',
    quests: [
      { id: 'review_checklist', title: 'Review Quick Start', description: 'Open the Quick Start Checklist', xp: 50, icon: '✅' },
      { id: 'complete_validation', title: 'Validate Your Plan', description: 'Complete the validation milestone', xp: 150, icon: '🔬' },
    ]
  },
  {
    stage: 3,
    title: 'Build',
    quests: [
      { id: 'create_landing', title: 'Create Landing Page', description: 'Set up your offer page', xp: 200, icon: '🌐' },
      { id: 'define_offer', title: 'Define Your Offer', description: 'Finalize pricing and packages', xp: 100, icon: '💰' },
    ]
  },
  {
    stage: 4,
    title: 'Launch',
    quests: [
      { id: 'setup_automation', title: 'Setup Automation', description: 'Generate and implement n8n workflow', xp: 200, icon: '🤖' },
      { id: 'start_outreach', title: 'Start Outreach', description: 'Begin prospecting for customers', xp: 150, icon: '📧' },
    ]
  },
  {
    stage: 5,
    title: 'First Customer',
    quests: [
      { id: 'first_sale', title: 'Close First Sale', description: 'Land your first paying customer! 🎉', xp: 500, icon: '🏆' },
    ]
  },
];

export const getTotalXP = () => {
  return QUEST_STAGES.flatMap(s => s.quests).reduce((acc, q) => acc + q.xp, 0);
};

export const calculateLevel = (xp: number): number => {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  return 5;
};
