-- Add is_favorite column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;