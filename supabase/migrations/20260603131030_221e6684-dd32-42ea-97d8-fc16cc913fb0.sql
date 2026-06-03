-- Fix broken participants insert policy (self-referential subquery always true)
DROP POLICY IF EXISTS "participants insert self" ON public.conversation_participants;
CREATE POLICY "participants insert self"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
    )
  );

-- Restrict jobs SELECT to authenticated only so anon cannot scrape application_email
DROP POLICY IF EXISTS "jobs read all" ON public.jobs;
CREATE POLICY "jobs read authenticated"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.jobs FROM anon;