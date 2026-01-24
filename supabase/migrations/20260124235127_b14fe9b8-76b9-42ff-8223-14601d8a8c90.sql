-- Add DELETE policy so users can delete their own AI prompts
CREATE POLICY "Users can delete their own AI prompts"
  ON public.ai_prompts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add UPDATE policy so users can update their own AI prompts
CREATE POLICY "Users can update their own AI prompts"
  ON public.ai_prompts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);