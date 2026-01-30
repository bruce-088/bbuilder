-- Allow 'perplexity' as a provider in user_api_keys table
-- First drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_api_keys_provider_check' 
    AND table_name = 'user_api_keys'
  ) THEN
    ALTER TABLE user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
  END IF;
END $$;

-- Add updated constraint that includes perplexity
ALTER TABLE user_api_keys 
ADD CONSTRAINT user_api_keys_provider_check 
CHECK (provider IN ('openai', 'claude', 'perplexity'));