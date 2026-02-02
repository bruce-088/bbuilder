-- Create table for tracking n8n deployment requests
CREATE TABLE public.n8n_deployment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_idea_id UUID REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  n8n_workflow_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deployed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.n8n_deployment_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view own deployment requests" 
  ON public.n8n_deployment_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deployment requests" 
  ON public.n8n_deployment_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployment requests" 
  ON public.n8n_deployment_requests FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deployment requests" 
  ON public.n8n_deployment_requests FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER update_deployment_requests_updated_at
  BEFORE UPDATE ON public.n8n_deployment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for deployment status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_deployment_requests;