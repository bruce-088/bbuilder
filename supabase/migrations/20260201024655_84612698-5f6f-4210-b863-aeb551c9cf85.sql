-- Create automation_jobs table for tracking background browser automation tasks
CREATE TABLE public.automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_actions INTEGER DEFAULT 0,
  completed_actions INTEGER DEFAULT 0,
  current_action TEXT,
  results JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own automation jobs"
  ON public.automation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create own automation jobs"
  ON public.automation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update own automation jobs"
  ON public.automation_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_automation_jobs_updated_at
  BEFORE UPDATE ON public.automation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_jobs;