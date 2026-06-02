ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_location boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_connection_requests boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications boolean NOT NULL DEFAULT true;