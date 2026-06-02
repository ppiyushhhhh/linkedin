CREATE TABLE public.resume_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL DEFAULT 'modern',
  title text,
  summary text,
  resume_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_drafts TO authenticated;
GRANT ALL ON public.resume_drafts TO service_role;

ALTER TABLE public.resume_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resume_drafts read own" ON public.resume_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "resume_drafts insert own" ON public.resume_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resume_drafts update own" ON public.resume_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "resume_drafts delete own" ON public.resume_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER resume_drafts_updated_at BEFORE UPDATE ON public.resume_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_resume_drafts_user ON public.resume_drafts(user_id, updated_at DESC);