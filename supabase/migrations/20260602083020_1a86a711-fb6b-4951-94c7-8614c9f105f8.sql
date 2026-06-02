-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_cp_user ON public.conversation_participants(user_id);
CREATE INDEX idx_cp_conv ON public.conversation_participants(conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS on participants
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conv AND user_id = _user
  )
$$;

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "conversations select participant"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "conversations insert auth"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "conversations update participant"
ON public.conversations FOR UPDATE TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- Participants policies
CREATE POLICY "participants select own conv"
ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "participants insert self"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR NOT EXISTS (
  SELECT 1 FROM public.conversation_participants WHERE conversation_id = conversation_participants.conversation_id
));

CREATE POLICY "participants update self"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "participants delete self"
ON public.conversation_participants FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "messages select participant"
ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "messages insert as self in conv"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "messages update own"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "messages delete own"
ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;

-- Updated_at trigger
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
