
-- Jobs feature tables

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid NOT NULL,
  title text NOT NULL,
  company_name text NOT NULL,
  company_logo_url text,
  location text NOT NULL DEFAULT '',
  workplace_type text NOT NULL DEFAULT 'On-site',
  job_type text NOT NULL DEFAULT 'Full-time',
  experience_level text NOT NULL DEFAULT 'Mid-level',
  salary_min integer,
  salary_max integer,
  currency text NOT NULL DEFAULT 'INR',
  description text NOT NULL,
  responsibilities text,
  requirements text,
  skills text[] NOT NULL DEFAULT '{}',
  application_email text,
  external_apply_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs read all" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs insert own" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "jobs update own" ON public.jobs FOR UPDATE USING (auth.uid() = posted_by);
CREATE POLICY "jobs delete own" ON public.jobs FOR DELETE USING (auth.uid() = posted_by);

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_jobs_posted_by ON public.jobs(posted_by);

-- Job applications
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  cover_note text,
  resume_url text,
  portfolio_url text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Applicant can read own applications; job poster can read applications to their jobs
CREATE POLICY "applications read own or poster" ON public.job_applications FOR SELECT
USING (
  auth.uid() = applicant_id
  OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid())
);

CREATE POLICY "applications insert self" ON public.job_applications FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "applications update applicant or poster" ON public.job_applications FOR UPDATE
USING (
  auth.uid() = applicant_id
  OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid())
);

CREATE POLICY "applications delete applicant" ON public.job_applications FOR DELETE
USING (auth.uid() = applicant_id);

CREATE INDEX idx_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_applications_applicant ON public.job_applications(applicant_id);

-- Saved jobs
CREATE TABLE public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_jobs read own" ON public.saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_jobs write own" ON public.saved_jobs FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_jobs_user ON public.saved_jobs(user_id);
