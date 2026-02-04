-- Harden display_name handling for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  raw_display_name text;
  safe_display_name text;
  email_localpart text;
BEGIN
  raw_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Prefer provided display_name, else fall back to email local-part, else 'User'
  safe_display_name := NULLIF(btrim(raw_display_name), '');

  email_localpart := split_part(COALESCE(NEW.email, ''), '@', 1);
  email_localpart := NULLIF(btrim(email_localpart), '');

  safe_display_name := COALESCE(safe_display_name, email_localpart, 'User');

  -- Remove control characters; normalize whitespace; trim again
  safe_display_name := regexp_replace(safe_display_name, '[[:cntrl:]]', '', 'g');
  safe_display_name := regexp_replace(safe_display_name, '\s+', ' ', 'g');
  safe_display_name := btrim(safe_display_name);

  -- Enforce max length
  safe_display_name := left(safe_display_name, 100);

  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, safe_display_name);

  RETURN NEW;
END;
$function$;

-- Normalize existing display_names to satisfy the constraint below
UPDATE public.profiles
SET display_name = NULLIF(
  left(
    btrim(
      regexp_replace(
        regexp_replace(COALESCE(display_name, ''), '[[:cntrl:]]', '', 'g'),
        '\\s+',
        ' ',
        'g'
      )
    ),
    100
  ),
  ''
)
WHERE display_name IS NOT NULL;

-- Enforce a safe max length at the database level
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 100);
