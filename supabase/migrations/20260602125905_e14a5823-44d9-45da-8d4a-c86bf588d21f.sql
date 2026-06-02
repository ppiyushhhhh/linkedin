
-- Fix connections privilege escalation: only addressee can accept; neither side can flip status arbitrarily
DROP POLICY IF EXISTS "connections update involved" ON public.connections;

CREATE POLICY "connections accept by addressee"
ON public.connections
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

-- Lock down SECURITY DEFINER helpers from direct API execution
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;

-- Tighten always-true permissive policy: only let signed-in users create a conversation row
DROP POLICY IF EXISTS "conversations insert auth" ON public.conversations;
CREATE POLICY "conversations insert auth"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
