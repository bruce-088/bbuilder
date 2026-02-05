-- Add ElevenLabs voice configuration to user_ai_preferences
ALTER TABLE public.user_ai_preferences 
ADD COLUMN IF NOT EXISTS elevenlabs_configured boolean DEFAULT false;

ALTER TABLE public.user_ai_preferences
ADD COLUMN IF NOT EXISTS preferred_voice_id text DEFAULT 'JBFqnCBsd6RMkjVDRZzb';

ALTER TABLE public.user_ai_preferences
ADD COLUMN IF NOT EXISTS voice_enabled boolean DEFAULT true;

-- Store competitor analysis results
CREATE TABLE public.competitor_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_idea_id uuid REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  pricing_info jsonb,
  features text[],
  positioning text,
  strengths text[],
  weaknesses text[],
  recent_news jsonb,
  source_urls text[],
  analyzed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Store differentiation strategies
CREATE TABLE public.differentiation_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_idea_id uuid REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  strategy_type text NOT NULL,
  recommendation text NOT NULL,
  confidence_score integer,
  supporting_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.differentiation_strategies ENABLE ROW LEVEL SECURITY;

-- RLS policies for competitor_analyses
CREATE POLICY "Users can view own analyses"
  ON public.competitor_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.competitor_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.competitor_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.competitor_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for differentiation_strategies
CREATE POLICY "Users can view own strategies"
  ON public.differentiation_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON public.differentiation_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON public.differentiation_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON public.differentiation_strategies FOR DELETE
  USING (auth.uid() = user_id);