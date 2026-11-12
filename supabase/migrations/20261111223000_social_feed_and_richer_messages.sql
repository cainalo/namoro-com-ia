BEGIN;

-- Rich messages: text, image, video, audio, document, sticker and gift.
ALTER TABLE public.couple_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.couple_messages
  DROP CONSTRAINT IF EXISTS couple_messages_type_chk;
ALTER TABLE public.couple_messages
  ADD CONSTRAINT couple_messages_type_chk
  CHECK (message_type IN ('text','image','video','audio','file','sticker','gift'));

-- Couple social feed. Each post belongs to one active couple and is visible
-- to its members; only its author can edit or remove it.
CREATE TABLE IF NOT EXISTS public.couple_posts (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body text NOT NULL DEFAULT '',
  media_path text,
  media_name text,
  media_mime text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT couple_posts_body_length_chk
    CHECK (pg_catalog.length(pg_catalog.btrim(body)) <= 5000),
  CONSTRAINT couple_posts_content_chk
    CHECK (pg_catalog.length(pg_catalog.btrim(body)) > 0 OR media_path IS NOT NULL),
  CONSTRAINT couple_posts_media_pair_chk
    CHECK ((media_path IS NULL AND media_mime IS NULL) OR (media_path IS NOT NULL AND media_mime IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS couple_posts_couple_created_idx
  ON public.couple_posts (couple_id, created_at DESC, id DESC);

ALTER TABLE public.couple_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.couple_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.couple_posts TO authenticated;
GRANT ALL ON TABLE public.couple_posts TO service_role;

DROP POLICY IF EXISTS couple_posts_select_members ON public.couple_posts;
CREATE POLICY couple_posts_select_members
  ON public.couple_posts FOR SELECT TO authenticated
  USING (public.can_view_couple(couple_id));

DROP POLICY IF EXISTS couple_posts_insert_current_member ON public.couple_posts;
CREATE POLICY couple_posts_insert_current_member
  ON public.couple_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_posts.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS couple_posts_update_author ON public.couple_posts;
CREATE POLICY couple_posts_update_author
  ON public.couple_posts FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()) AND public.can_view_couple(couple_id))
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_posts.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS couple_posts_delete_author ON public.couple_posts;
CREATE POLICY couple_posts_delete_author
  ON public.couple_posts FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()) AND public.can_view_couple(couple_id));

-- Permit each partner to see only the other current partner's display name/avatar.
DROP POLICY IF EXISTS profiles_select_current_partner ON public.profiles;
CREATE POLICY profiles_select_current_partner
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.couple_members AS mine
      JOIN public.couple_members AS partner ON partner.couple_id = mine.couple_id
      JOIN public.couples AS c ON c.id = mine.couple_id
      WHERE mine.user_id = (SELECT auth.uid())
        AND mine.ended_at IS NULL
        AND partner.user_id = profiles.id
        AND partner.ended_at IS NULL
        AND c.status = 'active'
    )
  );

-- One private bucket stores both chat attachments and feed media.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'couple-media',
  'couple-media',
  false,
  36700160,
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm',
    'application/pdf','text/plain',
    'application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS couple_media_select_members ON storage.objects;
CREATE POLICY couple_media_select_members
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'couple-media'
    AND public.can_view_couple(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS couple_media_insert_current_member ON storage.objects;
CREATE POLICY couple_media_insert_current_member
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'couple-media'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = (((storage.foldername(name))[1])::uuid)
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS couple_media_delete_owner ON storage.objects;
CREATE POLICY couple_media_delete_owner
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'couple-media'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND public.can_view_couple(((storage.foldername(name))[1])::uuid)
  );

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'couple_posts'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_posts;
  END IF;
END;
$publication$;

COMMENT ON TABLE public.couple_posts IS
  'Private social feed for the two current members of one couple.';

COMMENT ON COLUMN public.couple_messages.message_type IS
  'Presentation type for richer private messages. Attachment files live in the private couple-media bucket.';

COMMIT;
