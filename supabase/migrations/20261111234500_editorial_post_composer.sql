BEGIN;

ALTER TABLE public.couple_posts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.couple_posts
  DROP CONSTRAINT IF EXISTS couple_posts_content_chk;

ALTER TABLE public.couple_posts
  ADD CONSTRAINT couple_posts_content_chk
  CHECK (
    pg_catalog.length(pg_catalog.btrim(body)) > 0
    OR media_path IS NOT NULL
    OR pg_catalog.length(pg_catalog.btrim(COALESCE(title, ''))) > 0
    OR (
      pg_catalog.jsonb_typeof(content_blocks) = 'array'
      AND pg_catalog.jsonb_array_length(content_blocks) > 0
    )
  );

ALTER TABLE public.couple_posts
  ADD CONSTRAINT couple_posts_title_length_chk
  CHECK (pg_catalog.length(pg_catalog.btrim(COALESCE(title, ''))) <= 180);

ALTER TABLE public.couple_posts
  ADD CONSTRAINT couple_posts_content_blocks_chk
  CHECK (
    pg_catalog.jsonb_typeof(content_blocks) = 'array'
    AND pg_catalog.jsonb_array_length(content_blocks) <= 16
    AND pg_catalog.octet_length(content_blocks::text) <= 131072
  );

COMMENT ON COLUMN public.couple_posts.content_blocks IS
  'Ordered editorial blocks for a couple publication. Media assets reference private couple-media storage paths.';

COMMIT;
