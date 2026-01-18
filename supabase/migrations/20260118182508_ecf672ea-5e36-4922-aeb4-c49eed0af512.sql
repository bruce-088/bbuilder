-- Add is_favorite column to business_ideas table
ALTER TABLE public.business_ideas 
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;