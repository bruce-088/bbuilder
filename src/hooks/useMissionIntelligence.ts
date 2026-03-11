import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QUEST_STAGES, ACHIEVEMENTS } from '@/components/MissionControl/types';
import { toast } from 'sonner';
import { celebrateMilestone, celebrateFirstIdea } from '@/lib/confetti';
import type { Json } from '@/integrations/supabase/types';

// Event types that can be emitted
export type MissionEventType =
  | 'plan_saved'
  | 'lead_captured'
  | 'lead_won'
  | 'stage_changed'
  | 'email_sent'
  | 'workflow_deployed'
  | 'automation_completed'
  | 'checklist_opened'
  | 'outreach_started';

// Map event types to quest IDs they can unlock
const EVENT_TO_QUEST: Record<MissionEventType, string | null> = {
  plan_saved: 'save_idea',
  lead_captured: 'start_outreach',
  lead_won: 'first_sale',
  stage_changed: null,
  email_sent: 'start_outreach',
  workflow_deployed: 'setup_automation',
  automation_completed: 'setup_automation',
  checklist_opened: 'review_checklist',
  outreach_started: 'start_outreach',
};

// XP awarded per event type
const EVENT_XP: Record<MissionEventType, number> = {
  plan_saved: 50,
  lead_captured: 25,
  lead_won: 500,
  stage_changed: 10,
  email_sent: 15,
  workflow_deployed: 200,
  automation_completed: 100,
  checklist_opened: 50,
  outreach_started: 150,
};

// Celebration messages from Mya
const CELEBRATION_MESSAGES: Record<string, string> = {
  generate_idea: "💡 Your first plan is live! You're already ahead of 90% of people who just think about starting.",
  save_idea: "📌 Plan saved! Now you've got a blueprint. Let's make it real.",
  review_checklist: "✅ Checklist reviewed! Knowledge is power — now let's apply it.",
  setup_automation: "🤖 Automation deployed! Your business is starting to work while you sleep.",
  start_outreach: "📧 Outreach started! Every empire began with a single conversation.",
  first_sale: "🏆 FIRST SALE! You did it! The $10K/month journey has officially begun!",
};

export interface MissionEvent {
  id: string;
  user_id: string;
  event_type: MissionEventType;
  event_data: Record<string, unknown>;
  xp_awarded: number;
  quest_unlocked: string | null;
  created_at: string;
}

export function useMissionIntelligence() {
  const { user } = useAuth();
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [momentumCount, setMomentumCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const celebratedRef = useRef<Set<string>>(new Set());

  // Load events and compute state
  const loadEvents = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      const { data, error } = await supabase
        .from('mission_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedEvents = (data || []) as MissionEvent[];
      setEvents(typedEvents);

      // Compute completed quests from events
      const quests = new Set<string>();
      let xp = 0;
      for (const evt of typedEvents) {
        if (evt.quest_unlocked) quests.add(evt.quest_unlocked);
        xp += evt.xp_awarded;
      }
      
      // Also check for first plan generation (business_ideas exist = generate_idea quest)
      const { count } = await supabase
        .from('business_ideas')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (count && count > 0) {
        quests.add('generate_idea');
        if (!typedEvents.some(e => e.quest_unlocked === 'generate_idea')) {
          xp += 100; // generate_idea XP
        }
      }

      setCompletedQuests(Array.from(quests));
      setTotalXP(xp);

      // Calculate momentum (events in last 24h)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentCount = typedEvents.filter(e => e.created_at > dayAgo).length;
      setMomentumCount(recentCount);
    } catch (error) {
      console.error('Error loading mission events:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('mission_events_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mission_events', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newEvent = payload.new as MissionEvent;
          setEvents(prev => [newEvent, ...prev]);
          setTotalXP(prev => prev + newEvent.xp_awarded);
          
          if (newEvent.quest_unlocked && !completedQuests.includes(newEvent.quest_unlocked)) {
            setCompletedQuests(prev => [...prev, newEvent.quest_unlocked!]);
            celebrate(newEvent.quest_unlocked);
          }

          // Fire Mya celebration popup
          if (newEvent.xp_awarded > 0) {
            window.dispatchEvent(new CustomEvent('mya-celebrate', {
              detail: { xp: newEvent.xp_awarded, questId: newEvent.quest_unlocked },
            }));
          }

          // Update momentum
          setMomentumCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, completedQuests]);

  // Celebrate a quest unlock
  const celebrate = useCallback((questId: string) => {
    if (celebratedRef.current.has(questId)) return;
    celebratedRef.current.add(questId);

    const message = CELEBRATION_MESSAGES[questId];
    if (message) {
      toast.success(message, { duration: 5000 });
    }

    if (questId === 'first_sale') {
      celebrateFirstIdea();
      setTimeout(() => celebrateFirstIdea(), 1000);
    } else {
      celebrateMilestone();
    }
  }, []);

  // Emit a mission event
  const emitEvent = useCallback(async (
    eventType: MissionEventType,
    eventData: Record<string, unknown> = {}
  ) => {
    if (!user) return;

    const questUnlocked = EVENT_TO_QUEST[eventType];
    const xp = EVENT_XP[eventType];

    // Don't emit duplicate quest unlocks
    if (questUnlocked && completedQuests.includes(questUnlocked)) {
      // Still emit the event for activity tracking, just without quest unlock
      try {
        await supabase.from('mission_events').insert([{
          user_id: user.id,
          event_type: eventType,
          event_data: eventData as unknown as Json,
          xp_awarded: Math.round(xp * 0.25),
          quest_unlocked: null,
        }]);
      } catch (error) {
        console.error('Error emitting repeat event:', error);
      }
      return;
    }

    try {
      await supabase.from('mission_events').insert([{
        user_id: user.id,
        event_type: eventType,
        event_data: eventData as unknown as Json,
        xp_awarded: xp,
        quest_unlocked: questUnlocked,
      }]);

      // Update user_missions XP
      await supabase
        .from('user_missions')
        .update({ 
          xp_earned: totalXP + xp,
          current_stage: getCurrentStage(),
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error emitting mission event:', error);
    }
  }, [user, completedQuests, totalXP]);

  // Get current stage based on completed quests
  const getCurrentStage = useCallback(() => {
    for (const stage of QUEST_STAGES) {
      const allComplete = stage.quests.every(q => completedQuests.includes(q.id));
      if (!allComplete) return stage.stage;
    }
    return QUEST_STAGES.length;
  }, [completedQuests]);

  // Get the next action the user should take
  const getNextAction = useCallback((): { questId: string; title: string; description: string; icon: string } | null => {
    for (const stage of QUEST_STAGES) {
      for (const quest of stage.quests) {
        if (!completedQuests.includes(quest.id)) {
          return {
            questId: quest.id,
            title: quest.title,
            description: quest.description,
            icon: quest.icon,
          };
        }
      }
    }
    return null;
  }, [completedQuests]);

  // Get unlocked achievements based on events
  const getUnlockedAchievements = useCallback(() => {
    const achievements: string[] = [];
    if (completedQuests.includes('generate_idea')) achievements.push('first_idea');
    if (completedQuests.includes('save_idea')) achievements.push('idea_saved');
    if (completedQuests.length >= 5) achievements.push('deep_dive');
    if (completedQuests.includes('setup_automation')) achievements.push('automator');
    if (completedQuests.length >= 3) achievements.push('implementer');
    if (completedQuests.includes('first_sale')) {
      achievements.push('closer');
      achievements.push('empire_builder');
    }
    return achievements;
  }, [completedQuests]);

  // Get recent events for activity feed
  const getRecentEvents = useCallback((limit: number = 10) => {
    return events.slice(0, limit);
  }, [events]);

  return {
    events,
    completedQuests,
    totalXP,
    momentumCount,
    loading,
    emitEvent,
    getNextAction,
    getCurrentStage,
    getUnlockedAchievements,
    getRecentEvents,
    refreshEvents: loadEvents,
  };
}
