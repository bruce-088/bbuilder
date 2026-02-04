-- Defense-in-depth for profiles email exposure
-- The current policy (auth.uid() = user_id) is correct, but we'll add additional safeguards

-- 1. Create a public-safe view that excludes email for any future cross-user features
-- This view only exposes non-sensitive profile data
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  display_name,
  created_at,
  updated_at
  -- email is intentionally excluded
FROM public.profiles;

-- 2. Add a comment documenting the security consideration
COMMENT ON TABLE public.profiles IS 
  'User profile data. Email field is PII - access restricted to profile owner only via RLS.';

COMMENT ON COLUMN public.profiles.email IS 
  'PII: User email address. Only accessible by the profile owner (auth.uid() = user_id).';

COMMENT ON VIEW public.profiles_public IS 
  'Public-safe view of profiles excluding email. Use this for any cross-user profile visibility features.';