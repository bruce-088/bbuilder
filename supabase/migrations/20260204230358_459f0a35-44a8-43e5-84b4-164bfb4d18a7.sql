-- Drop the unused legacy n8n_credentials table
-- This table was superseded by user_api_keys with proper encryption via secure-api-keys edge function
-- The table currently has zero records and no code references it

-- First drop the RLS policies
DROP POLICY IF EXISTS "Users can view their own n8n credentials" ON public.n8n_credentials;
DROP POLICY IF EXISTS "Users can insert their own n8n credentials" ON public.n8n_credentials;
DROP POLICY IF EXISTS "Users can update their own n8n credentials" ON public.n8n_credentials;
DROP POLICY IF EXISTS "Users can delete their own n8n credentials" ON public.n8n_credentials;

-- Then drop the table
DROP TABLE IF EXISTS public.n8n_credentials;

-- Add a comment explaining the security improvement
COMMENT ON TABLE public.user_api_keys IS 
  'Secure storage for API keys and credentials. Uses server-side encryption via secure-api-keys edge function. Replaced legacy n8n_credentials table.';