-- Add archived column to business_ideas table to support pivot archival
ALTER TABLE public.business_ideas 
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Add index for efficient queries of active (non-archived) business ideas
CREATE INDEX idx_business_ideas_archived ON public.business_ideas(archived) WHERE archived = false;

-- Add comment for documentation
COMMENT ON COLUMN public.business_ideas.archived IS 'Indicates if this business idea has been archived during a pivot. Archived ideas are hidden from active views but retained for historical analysis.';