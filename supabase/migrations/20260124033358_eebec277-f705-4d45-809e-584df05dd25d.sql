-- Add business_idea_id column to implementation_progress table
ALTER TABLE public.implementation_progress 
ADD COLUMN business_idea_id uuid REFERENCES public.business_ideas(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_implementation_progress_business_idea_id 
ON public.implementation_progress(business_idea_id);

-- Update unique constraint to be per user + section + business_idea
-- First drop any existing unique constraints on user_id + section_id
ALTER TABLE public.implementation_progress 
DROP CONSTRAINT IF EXISTS implementation_progress_user_id_section_id_key;

-- Add new unique constraint that includes business_idea_id
CREATE UNIQUE INDEX implementation_progress_unique_per_idea 
ON public.implementation_progress(user_id, section_id, business_idea_id) 
WHERE business_idea_id IS NOT NULL;

-- Keep unique constraint for global progress (null business_idea_id)
CREATE UNIQUE INDEX implementation_progress_unique_global 
ON public.implementation_progress(user_id, section_id) 
WHERE business_idea_id IS NULL;