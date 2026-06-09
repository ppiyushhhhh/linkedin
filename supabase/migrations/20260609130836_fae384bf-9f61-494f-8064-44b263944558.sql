
-- 1) Profiles: revoke column-level SELECT on sensitive preference flags from anon/authenticated.
-- The owner reads these via server functions using service_role (supabaseAdmin).
REVOKE SELECT (email_notifications, push_notifications, allow_messages, allow_connection_requests, profile_visibility, show_email, show_location)
  ON public.profiles FROM anon, authenticated;

-- profile_visibility is still needed to render private-profile gating for callers viewing
-- another profile. Keep it readable by authenticated users only (not anon).
GRANT SELECT (profile_visibility) ON public.profiles TO authenticated;

-- 2) job_applications: split update policies and enforce immutable fields with a trigger.
DROP POLICY IF EXISTS "applications update applicant or poster" ON public.job_applications;

CREATE POLICY "applications update applicant"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = applicant_id)
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "applications update poster"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id AND j.posted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id AND j.posted_by = auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_job_application_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_applicant boolean := (auth.uid() = OLD.applicant_id);
  is_poster boolean := EXISTS (
    SELECT 1 FROM public.jobs j WHERE j.id = OLD.job_id AND j.posted_by = auth.uid()
  );
BEGIN
  -- Immutable identifiers
  IF NEW.applicant_id IS DISTINCT FROM OLD.applicant_id THEN
    RAISE EXCEPTION 'applicant_id is immutable';
  END IF;
  IF NEW.job_id IS DISTINCT FROM OLD.job_id THEN
    RAISE EXCEPTION 'job_id is immutable';
  END IF;

  -- Applicants may edit their own submission content but not status
  IF is_applicant AND NOT is_poster THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Applicants cannot change application status';
    END IF;
  END IF;

  -- Posters may only change status; everything else must remain unchanged
  IF is_poster AND NOT is_applicant THEN
    IF NEW.cover_note IS DISTINCT FROM OLD.cover_note
       OR NEW.resume_url IS DISTINCT FROM OLD.resume_url
       OR NEW.portfolio_url IS DISTINCT FROM OLD.portfolio_url THEN
      RAISE EXCEPTION 'Posters can only update application status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_job_application_update_rules ON public.job_applications;
CREATE TRIGGER enforce_job_application_update_rules
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_job_application_update_rules();
