import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import myaAvatar from '@/assets/mya-avatar.png';

interface DailyBriefingProps {
  completedQuests: string[];
  totalXP: number;
  momentumCount: number;
  nextAction: { title: string; description: string } | null;
}

export default function DailyBriefing({ completedQuests, totalXP, momentumCount, nextAction }: DailyBriefingProps) {
  const { user } = useAuth();
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const { playAudio, stopAudio, isPlaying, isLoadingAudio } = useVoiceChat();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const generateBriefing = useCallback(async () => {
    if (!user) return;
    setLoadingBriefing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-briefing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) throw new Error('Failed to generate briefing');

      const data = await response.json();
      setBriefingText(data.briefing);
    } catch (error) {
      console.error('Error generating briefing:', error);
      // Fallback briefing
      const fallback = nextAction
        ? `${getGreeting()}! You've earned ${totalXP} XP so far. ${momentumCount > 0 ? `${momentumCount} actions in the last 24 hours — great momentum!` : 'Ready to build some momentum?'} Your next step: ${nextAction.title}.`
        : `${getGreeting()}! Welcome to your mission. Start by generating your first business plan to get rolling.`;
      setBriefingText(fallback);
    } finally {
      setLoadingBriefing(false);
    }
  }, [user, totalXP, momentumCount, nextAction]);

  useEffect(() => {
    generateBriefing();
  }, [generateBriefing]);

  const handlePlayBriefing = () => {
    if (isPlaying) {
      stopAudio();
    } else if (briefingText) {
      playAudio(briefingText);
    }
  };

  return (
    <Card className="glass border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <img
            src={myaAvatar}
            alt="Mya"
            className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-primary/30"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-display font-semibold text-primary">Mya</p>
              <span className="text-xs text-muted-foreground">{getGreeting()}</span>
            </div>
            {loadingBriefing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Preparing your briefing...
              </div>
            ) : (
              <p className="text-sm text-foreground/90 leading-relaxed">
                {briefingText}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePlayBriefing}
              disabled={!briefingText || isLoadingAudio}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={generateBriefing}
              disabled={loadingBriefing}
            >
              <RefreshCw className={`w-3 h-3 ${loadingBriefing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
