
-- Create workflows table
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflows" ON public.workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workflows" ON public.workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workflows" ON public.workflows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workflows" ON public.workflows FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create workflow_nodes table
CREATE TABLE public.workflow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Node',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_prompt TEXT,
  ai_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workflow nodes" ON public.workflow_nodes FOR SELECT USING (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_nodes.workflow_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their workflow nodes" ON public.workflow_nodes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_nodes.workflow_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their workflow nodes" ON public.workflow_nodes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_nodes.workflow_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their workflow nodes" ON public.workflow_nodes FOR DELETE USING (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_nodes.workflow_id AND user_id = auth.uid()));

-- Create workflow_edges table
CREATE TABLE public.workflow_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT DEFAULT 'output',
  target_handle TEXT DEFAULT 'input',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workflow edges" ON public.workflow_edges FOR SELECT USING (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_edges.workflow_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their workflow edges" ON public.workflow_edges FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_edges.workflow_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their workflow edges" ON public.workflow_edges FOR UPDATE USING (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_edges.workflow_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their workflow edges" ON public.workflow_edges FOR DELETE USING (EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_edges.workflow_id AND user_id = auth.uid()));

-- Create workflow_executions table
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  trigger_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workflow executions" ON public.workflow_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their workflow executions" ON public.workflow_executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their workflow executions" ON public.workflow_executions FOR UPDATE USING (auth.uid() = user_id);

-- Create workflow_execution_logs table
CREATE TABLE public.workflow_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their execution logs" ON public.workflow_execution_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.workflow_executions WHERE id = workflow_execution_logs.execution_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their execution logs" ON public.workflow_execution_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_executions WHERE id = workflow_execution_logs.execution_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their execution logs" ON public.workflow_execution_logs FOR UPDATE USING (EXISTS (SELECT 1 FROM public.workflow_executions WHERE id = workflow_execution_logs.execution_id AND user_id = auth.uid()));

-- Enable realtime for execution logs (for live status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_execution_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;
