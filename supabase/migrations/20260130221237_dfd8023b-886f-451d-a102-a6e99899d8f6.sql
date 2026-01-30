-- Track automation runs
CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_idea_id UUID NOT NULL REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_phase TEXT,
  phases_completed JSONB DEFAULT '[]'::jsonb,
  phase_logs JSONB DEFAULT '[]'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  ai_provider TEXT DEFAULT 'lovable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_runs
CREATE POLICY "Users can view their own automation runs"
ON public.automation_runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation runs"
ON public.automation_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation runs"
ON public.automation_runs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation runs"
ON public.automation_runs FOR DELETE
USING (auth.uid() = user_id);

-- Store AI provider preferences
CREATE TABLE public.user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferred_provider TEXT DEFAULT 'lovable',
  openai_configured BOOLEAN DEFAULT false,
  claude_configured BOOLEAN DEFAULT false,
  perplexity_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ai_preferences
CREATE POLICY "Users can view their own AI preferences"
ON public.user_ai_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI preferences"
ON public.user_ai_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences"
ON public.user_ai_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on automation_runs
CREATE TRIGGER update_automation_runs_updated_at
BEFORE UPDATE ON public.automation_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_ai_preferences
CREATE TRIGGER update_user_ai_preferences_updated_at
BEFORE UPDATE ON public.user_ai_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();