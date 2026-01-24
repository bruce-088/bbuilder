-- Add active_quest_id column to user_missions table
ALTER TABLE public.user_missions 
ADD COLUMN active_quest_id uuid REFERENCES public.business_ideas(id) ON DELETE SET NULL;