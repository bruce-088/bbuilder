-- Create workflow_schedules table
CREATE TABLE public.workflow_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cron_expression TEXT NOT NULL DEFAULT '0 9 * * *',
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id)
);

-- Enable RLS
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedules"
ON public.workflow_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schedules"
ON public.workflow_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
ON public.workflow_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
ON public.workflow_schedules FOR DELETE
USING (auth.uid() = user_id);

-- Create revenue_entries table
CREATE TABLE public.revenue_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  lead_id UUID REFERENCES public.lead_contacts(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenue"
ON public.revenue_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenue"
ON public.revenue_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenue"
ON public.revenue_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenue"
ON public.revenue_entries FOR DELETE
USING (auth.uid() = user_id);

-- Timestamp trigger for both tables
CREATE TRIGGER update_workflow_schedules_updated_at
BEFORE UPDATE ON public.workflow_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revenue_entries_updated_at
BEFORE UPDATE ON public.revenue_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();