-- Create table for tracking n8n workflow executions
CREATE TABLE public.n8n_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  execution_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'waiting')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  error_message TEXT,
  error_node TEXT,
  trigger_type TEXT,
  node_execution_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  execution_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.n8n_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own execution logs"
ON public.n8n_execution_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own execution logs"
ON public.n8n_execution_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own execution logs"
ON public.n8n_execution_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own execution logs"
ON public.n8n_execution_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX idx_n8n_execution_logs_user_workflow ON public.n8n_execution_logs(user_id, workflow_id);
CREATE INDEX idx_n8n_execution_logs_started_at ON public.n8n_execution_logs(started_at DESC);
CREATE INDEX idx_n8n_execution_logs_status ON public.n8n_execution_logs(status);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_execution_logs;

-- Create aggregate stats table for faster dashboard queries
CREATE TABLE public.n8n_workflow_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  total_executions INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  last_status TEXT,
  success_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);

-- Enable RLS for stats table
ALTER TABLE public.n8n_workflow_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflow stats"
ON public.n8n_workflow_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflow stats"
ON public.n8n_workflow_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow stats"
ON public.n8n_workflow_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger to auto-update stats when executions change
CREATE OR REPLACE FUNCTION public.update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.n8n_workflow_stats (user_id, workflow_id, workflow_name, total_executions, success_count, error_count, avg_duration_ms, last_execution_at, last_status, success_rate)
  VALUES (
    NEW.user_id,
    NEW.workflow_id,
    NEW.workflow_name,
    1,
    CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'error' THEN 1 ELSE 0 END,
    COALESCE(NEW.duration_ms, 0),
    NEW.started_at,
    NEW.status,
    CASE WHEN NEW.status = 'success' THEN 100 ELSE 0 END
  )
  ON CONFLICT (user_id, workflow_id) DO UPDATE SET
    workflow_name = NEW.workflow_name,
    total_executions = n8n_workflow_stats.total_executions + 1,
    success_count = n8n_workflow_stats.success_count + CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
    error_count = n8n_workflow_stats.error_count + CASE WHEN NEW.status = 'error' THEN 1 ELSE 0 END,
    avg_duration_ms = (n8n_workflow_stats.avg_duration_ms * n8n_workflow_stats.total_executions + COALESCE(NEW.duration_ms, 0)) / (n8n_workflow_stats.total_executions + 1),
    last_execution_at = NEW.started_at,
    last_status = NEW.status,
    success_rate = CASE 
      WHEN (n8n_workflow_stats.total_executions + 1) > 0 
      THEN ((n8n_workflow_stats.success_count + CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END)::numeric / (n8n_workflow_stats.total_executions + 1) * 100)
      ELSE 0 
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_workflow_stats
AFTER INSERT OR UPDATE ON public.n8n_execution_logs
FOR EACH ROW
WHEN (NEW.status IN ('success', 'error'))
EXECUTE FUNCTION public.update_workflow_stats();