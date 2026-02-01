-- Extend user_api_keys to support n8n service credentials
ALTER TABLE public.user_api_keys 
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'ai_provider',
  ADD COLUMN IF NOT EXISTS n8n_credential_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_api_keys.service_type IS 'Type of service: ai_provider, n8n_service, or webhook';
COMMENT ON COLUMN public.user_api_keys.n8n_credential_id IS 'Optional n8n credential ID for injection into workflows';