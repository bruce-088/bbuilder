-- Drop the existing check constraint and recreate with elevenlabs included
ALTER TABLE public.user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check;

ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_provider_check 
CHECK (provider IN ('openai', 'claude', 'perplexity', 'gemini', 'elevenlabs', 'n8n', 'browserbase'));