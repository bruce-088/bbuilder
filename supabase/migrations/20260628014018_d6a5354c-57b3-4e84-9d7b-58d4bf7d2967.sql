
CREATE TABLE public.system_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  blueprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  facets JSONB NOT NULL DEFAULT '{}'::jsonb,
  mutation_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  handoff_package JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_blueprints_user ON public.system_blueprints(user_id, created_at DESC);
CREATE INDEX idx_system_blueprints_tags ON public.system_blueprints USING GIN(tags);
CREATE INDEX idx_system_blueprints_facets ON public.system_blueprints USING GIN(facets);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_blueprints TO authenticated;
GRANT ALL ON public.system_blueprints TO service_role;

ALTER TABLE public.system_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own blueprints"
  ON public.system_blueprints FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_system_blueprints_updated_at
  BEFORE UPDATE ON public.system_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
