
-- Create mission_events table
CREATE TABLE public.mission_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  quest_unlocked TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mission_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own events"
ON public.mission_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
ON public.mission_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_mission_events_user_created ON public.mission_events (user_id, created_at DESC);
CREATE INDEX idx_mission_events_type ON public.mission_events (user_id, event_type);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_events;
