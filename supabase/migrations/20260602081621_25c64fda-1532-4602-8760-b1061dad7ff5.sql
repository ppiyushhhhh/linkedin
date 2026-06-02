-- Saved posts table
CREATE TABLE public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_posts read own"
  ON public.saved_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_posts write own"
  ON public.saved_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX saved_posts_user_idx ON public.saved_posts(user_id, created_at DESC);
CREATE INDEX saved_posts_post_idx ON public.saved_posts(post_id);

-- Reposts: model as posts referencing an original post.
-- A repost is a regular row in public.posts whose repost_of_id is set.
-- This keeps feed/comment/like behavior consistent and avoids a parallel post stream.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS repost_of_id uuid;
CREATE INDEX IF NOT EXISTS posts_repost_of_idx ON public.posts(repost_of_id);
