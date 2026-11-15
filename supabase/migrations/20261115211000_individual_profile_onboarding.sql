-- Morados: onboarding independente e mídia de perfil por usuário.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hobbies text,
  ADD COLUMN IF NOT EXISTS favorite_food text,
  ADD COLUMN IF NOT EXISTS favorite_music text,
  ADD COLUMN IF NOT EXISTS favorite_film text,
  ADD COLUMN IF NOT EXISTS profile_quote text,
  ADD COLUMN IF NOT EXISTS app_onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS app_tour_completed_at timestamptz;

GRANT UPDATE (
  display_name,
  avatar_path,
  bio,
  banner_path,
  interests,
  hobbies,
  favorite_food,
  favorite_music,
  favorite_film,
  profile_quote,
  app_onboarding_completed_at,
  app_tour_completed_at
) ON TABLE public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.app_onboarding_completed_at IS
  'Indica que o próprio usuário concluiu a configuração inicial do perfil.';
COMMENT ON COLUMN public.profiles.app_tour_completed_at IS
  'Indica que o usuário concluiu ou dispensou o tutorial guiado do Morados.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles-media',
  'profiles-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[];

DROP POLICY IF EXISTS profiles_media_select_own ON storage.objects;
CREATE POLICY profiles_media_select_own
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profiles-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS profiles_media_insert_own ON storage.objects;
CREATE POLICY profiles_media_insert_own
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profiles-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS profiles_media_update_own ON storage.objects;
CREATE POLICY profiles_media_update_own
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profiles-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'profiles-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS profiles_media_delete_own ON storage.objects;
CREATE POLICY profiles_media_delete_own
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profiles-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
