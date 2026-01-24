-- Create a table to track user mission progress
CREATE TABLE public.user_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  target_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '14 days'),
  current_stage INTEGER NOT NULL DEFAULT 1,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mission" 
ON public.user_missions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mission" 
ON public.user_missions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mission" 
ON public.user_missions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_missions_updated_at
BEFORE UPDATE ON public.user_missions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();