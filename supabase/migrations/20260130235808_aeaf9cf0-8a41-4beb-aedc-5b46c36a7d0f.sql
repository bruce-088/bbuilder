-- Allow 'gemini' as a provider in user_api_keys table
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check;

ALTER TABLE user_api_keys 
ADD CONSTRAINT user_api_keys_provider_check 
CHECK (provider IN ('openai', 'claude', 'perplexity', 'gemini'));

-- Add gemini_configured column to user_ai_preferences
ALTER TABLE user_ai_preferences 
ADD COLUMN IF NOT EXISTS gemini_configured boolean DEFAULT false;