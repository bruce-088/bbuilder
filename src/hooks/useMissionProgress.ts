import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MissionProgress } from '@/components/MissionControl/types';
import { QUEST_STAGES } from '@/components/MissionControl/types';

export function useMissionProgress() {
  const { user } = useAuth();
  const [mission, setMission] = useState<MissionProgress | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [activeQuestId, setActiveQuestIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load mission progress
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadMission();
  }, [user]);

  const loadMission = async () => {
    if (!user) return;

    try {
      // First, check if mission exists
      const { data, error } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMission(data);
        // Load persisted active quest ID
        if (data.active_quest_id) {
          setActiveQuestIdState(data.active_quest_id);
        }
      } else {
        // Create new mission for user
        const { data: newMission, error: insertError } = await supabase
          .from('user_missions')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setMission(newMission);
      }

      // Load completed quests from implementation_progress
      await loadCompletedQuests();
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedQuests = async () => {
    if (!user) return;

    try {
      // Check various indicators to determine completed quests
      const [ideasResult, promptsResult, progressResult] = await Promise.all([
        supabase.from('business_ideas').select('id').eq('user_id', user.id),
        supabase.from('ai_prompts').select('id').eq('user_id', user.id).eq('prompt_type', 'n8n_workflow'),
        supabase.from('implementation_progress').select('completed_steps, section_id').eq('user_id', user.id),
      ]);

      const completed: string[] = [];

      // Check idea generation
      if (ideasResult.data && ideasResult.data.length > 0) {
        completed.push('generate_idea');
        completed.push('save_idea');
      }

      // Check n8n workflow
      if (promptsResult.data && promptsResult.data.length > 0) {
        completed.push('setup_automation');
      }

      // Check implementation progress
      if (progressResult.data) {
        const allSteps = progressResult.data.flatMap(p => p.completed_steps || []);
        
        // Quick start checklist
        if (allSteps.length > 0) {
          completed.push('review_checklist');
        }
        
        // Validation milestone
        const validationSteps = allSteps.filter(s => s.includes('validation') || s.includes('validate'));
        if (validationSteps.length > 0) {
          completed.push('complete_validation');
        }

        // Landing page
        const landingSteps = allSteps.filter(s => s.includes('landing') || s.includes('website'));
        if (landingSteps.length > 0) {
          completed.push('create_landing');
        }

        // Offer definition
        const offerSteps = allSteps.filter(s => s.includes('offer') || s.includes('pricing'));
        if (offerSteps.length > 0) {
          completed.push('define_offer');
        }

        // Outreach
        const outreachSteps = allSteps.filter(s => s.includes('outreach') || s.includes('prospect'));
        if (outreachSteps.length > 0) {
          completed.push('start_outreach');
        }

        // First sale
        const saleSteps = allSteps.filter(s => s.includes('sale') || s.includes('customer'));
        if (saleSteps.length > 0) {
          completed.push('first_sale');
        }
      }

      setCompletedQuests(completed);
    } catch (error) {
      console.error('Error loading completed quests:', error);
    }
  };

  const calculateCurrentStage = useCallback(() => {
    for (const stage of QUEST_STAGES) {
      const stageQuests = stage.quests;
      const allComplete = stageQuests.every(q => completedQuests.includes(q.id));
      if (!allComplete) {
        return stage.stage;
      }
    }
    return QUEST_STAGES.length; // All complete
  }, [completedQuests]);

  const calculateXP = useCallback(() => {
    return QUEST_STAGES.flatMap(s => s.quests)
      .filter(q => completedQuests.includes(q.id))
      .reduce((acc, q) => acc + q.xp, 0);
  }, [completedQuests]);

  const getUnlockedAchievements = useCallback(() => {
    const achievements: string[] = [];
    
    if (completedQuests.includes('generate_idea')) {
      achievements.push('first_idea');
    }
    if (completedQuests.includes('save_idea')) {
      achievements.push('idea_saved');
    }
    if (completedQuests.length >= 5) {
      achievements.push('deep_dive');
    }
    if (completedQuests.includes('setup_automation')) {
      achievements.push('automator');
    }
    if (completedQuests.length >= 3) {
      achievements.push('implementer');
    }
    if (completedQuests.includes('first_sale')) {
      achievements.push('closer');
      achievements.push('empire_builder');
    }

    return achievements;
  }, [completedQuests]);

  const completeQuest = async (questId: string) => {
    if (!user || completedQuests.includes(questId)) return;

    // Add to local state immediately for responsiveness
    setCompletedQuests(prev => [...prev, questId]);

    // Update XP and stage in database
    const newXP = calculateXP() + (QUEST_STAGES.flatMap(s => s.quests).find(q => q.id === questId)?.xp || 0);
    const newStage = calculateCurrentStage();

    try {
      await supabase
        .from('user_missions')
        .update({ 
          xp_earned: newXP, 
          current_stage: newStage,
          achievements: getUnlockedAchievements()
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating mission:', error);
    }
  };

  const setActiveQuestId = async (questId: string | null) => {
    if (!user) return;

    // Update local state immediately
    setActiveQuestIdState(questId);

    try {
      await supabase
        .from('user_missions')
        .update({ active_quest_id: questId })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating active quest:', error);
    }
  };

  return {
    mission,
    loading,
    completedQuests,
    activeQuestId,
    currentStage: calculateCurrentStage(),
    xpEarned: calculateXP(),
    unlockedAchievements: getUnlockedAchievements(),
    completeQuest,
    setActiveQuestId,
    refreshMission: loadMission,
  };
}
