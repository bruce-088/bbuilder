-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted column to user_api_keys for storing properly encrypted keys
ALTER TABLE public.user_api_keys 
ADD COLUMN IF NOT EXISTS encrypted_key_secure bytea;

-- Create a secure function to store encrypted API keys using pgcrypto
-- The encryption key is passed from the edge function (from Supabase secrets)
CREATE OR REPLACE FUNCTION public.store_api_key_encrypted(
  p_user_id uuid,
  p_provider text,
  p_encrypted_data bytea,
  p_service_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Verify the calling user matches the target user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot store keys for other users';
  END IF;

  -- Upsert the encrypted key
  INSERT INTO public.user_api_keys (user_id, provider, encrypted_key, encrypted_key_secure, service_type)
  VALUES (p_user_id, p_provider, '[ENCRYPTED]', p_encrypted_data, p_service_type)
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET 
    encrypted_key_secure = p_encrypted_data,
    encrypted_key = '[ENCRYPTED]',
    updated_at = now()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

-- Create a secure function to retrieve encrypted API keys
CREATE OR REPLACE FUNCTION public.get_api_key_encrypted(
  p_user_id uuid,
  p_provider text
)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_data bytea;
BEGIN
  -- Verify the calling user matches the target user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot retrieve keys for other users';
  END IF;

  -- Get the encrypted key
  SELECT encrypted_key_secure INTO encrypted_data 
  FROM public.user_api_keys 
  WHERE user_id = p_user_id AND provider = p_provider;

  RETURN encrypted_data;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.store_api_key_encrypted TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_key_encrypted TO authenticated;