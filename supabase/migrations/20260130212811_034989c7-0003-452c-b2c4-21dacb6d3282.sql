-- Store workflow snapshots for conversation context
CREATE TABLE public.n8n_workflow_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  nodes JSONB NOT NULL,
  connections JSONB,
  captured_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'mcp_cache'
);

-- Enable Row Level Security
ALTER TABLE public.n8n_workflow_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own snapshots" 
  ON public.n8n_workflow_snapshots FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots" 
  ON public.n8n_workflow_snapshots FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots" 
  ON public.n8n_workflow_snapshots FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots" 
  ON public.n8n_workflow_snapshots FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_n8n_workflow_snapshots_user_id ON public.n8n_workflow_snapshots(user_id);
CREATE INDEX idx_n8n_workflow_snapshots_conversation_id ON public.n8n_workflow_snapshots(conversation_id);
CREATE INDEX idx_n8n_workflow_snapshots_workflow_id ON public.n8n_workflow_snapshots(workflow_id);