-- Create table for storing successful automation fix prompts
CREATE TABLE public.fix_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  node_type TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  fix_prompt TEXT NOT NULL,
  root_cause TEXT,
  solution_summary TEXT,
  workflow_name TEXT,
  success_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fix_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Users can view all fixes (shared knowledge base)
CREATE POLICY "Users can view all fixes"
ON public.fix_knowledge_base
FOR SELECT
USING (true);

-- Users can create their own fixes
CREATE POLICY "Users can create their own fixes"
ON public.fix_knowledge_base
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own fixes
CREATE POLICY "Users can update their own fixes"
ON public.fix_knowledge_base
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own fixes
CREATE POLICY "Users can delete their own fixes"
ON public.fix_knowledge_base
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for quick lookups by node type
CREATE INDEX idx_fix_knowledge_node_type ON public.fix_knowledge_base(node_type);

-- Create trigger for updated_at
CREATE TRIGGER update_fix_knowledge_base_updated_at
BEFORE UPDATE ON public.fix_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();