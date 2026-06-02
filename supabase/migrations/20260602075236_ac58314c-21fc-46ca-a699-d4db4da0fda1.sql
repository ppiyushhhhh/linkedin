
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT '';

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS level TEXT;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS credential_id TEXT;
