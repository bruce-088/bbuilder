
-- Create table for persisting setup guide / interactive course progress
CREATE TABLE public.setup_guide_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One row per user
CREATE UNIQUE INDEX idx_setup_guide_progress_user ON public.setup_guide_progress (user_id);

-- Enable RLS
ALTER TABLE public.setup_guide_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.setup_guide_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
ON public.setup_guide_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.setup_guide_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_setup_guide_progress_updated_at
BEFORE UPDATE ON public.setup_guide_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
