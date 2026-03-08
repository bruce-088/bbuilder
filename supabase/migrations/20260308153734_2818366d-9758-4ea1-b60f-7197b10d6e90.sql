
-- 1. Create the Business Manifests table (singleton per user)
CREATE TABLE IF NOT EXISTS public.triad_manifests (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  business_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  target_audience TEXT,
  content_pillars TEXT[],
  crm_stages TEXT[],
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the Event Bus table (with user_id for RLS)
CREATE TABLE IF NOT EXISTS public.triad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  source_app TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.triad_manifests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.triad_events;

-- 4. RLS on manifests
ALTER TABLE public.triad_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own manifest"
  ON public.triad_manifests FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own manifest"
  ON public.triad_manifests FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own manifest"
  ON public.triad_manifests FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete own manifest"
  ON public.triad_manifests FOR DELETE
  USING (auth.uid() = id);

-- 5. RLS on events (per-user)
ALTER TABLE public.triad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own events"
  ON public.triad_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON public.triad_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON public.triad_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON public.triad_events FOR DELETE
  USING (auth.uid() = user_id);
