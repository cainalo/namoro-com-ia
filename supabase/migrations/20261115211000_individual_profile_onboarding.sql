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


-- O acesso individual nunca depende do status da outra confirmação.
-- O vínculo é concluído em segundo plano quando o segundo e-mail também estiver confirmado.
CREATE OR REPLACE FUNCTION public.complete_couple_pairing(p_token text)
RETURNS TABLE(result_status text, couple_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_email text;
  v_confirmed_at timestamptz;
  v_stored_token text;
  v_partner_email text;
  v_partner_id uuid;
  v_self_couple uuid;
  v_partner_couple uuid;
  v_new_couple_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN QUERY SELECT 'no_pairing'::text, NULL::uuid;
    RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('morados_pair:' || p_token, 0)
  );

  SELECT
    pg_catalog.lower(u.email),
    u.email_confirmed_at,
    u.raw_user_meta_data ->> 'morados_pair_token',
    pg_catalog.lower(u.raw_user_meta_data ->> 'morados_pair_email')
  INTO v_email, v_confirmed_at, v_stored_token, v_partner_email
  FROM auth.users AS u
  WHERE u.id = v_uid
  FOR UPDATE;

  IF NOT FOUND OR v_stored_token IS DISTINCT FROM p_token OR v_partner_email IS NULL THEN
    RETURN QUERY SELECT 'no_pairing'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_confirmed_at IS NULL THEN
    RETURN QUERY SELECT 'waiting_for_self_verification'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT u.id
  INTO v_partner_id
  FROM auth.users AS u
  WHERE pg_catalog.lower(u.email) = v_partner_email
    AND u.email_confirmed_at IS NOT NULL
    AND u.raw_user_meta_data ->> 'morados_pair_token' = p_token
    AND pg_catalog.lower(u.raw_user_meta_data ->> 'morados_pair_email') = v_email
  FOR UPDATE;

  IF v_partner_id IS NULL THEN
    RETURN QUERY SELECT 'waiting_for_partner'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_partner_id = v_uid THEN
    RAISE EXCEPTION 'pair_accounts_must_be_distinct' USING ERRCODE = 'check_violation';
  END IF;

  SELECT m.couple_id INTO v_self_couple
  FROM public.couple_members AS m
  WHERE m.user_id = v_uid AND m.ended_at IS NULL
  FOR UPDATE;

  SELECT m.couple_id INTO v_partner_couple
  FROM public.couple_members AS m
  WHERE m.user_id = v_partner_id AND m.ended_at IS NULL
  FOR UPDATE;

  IF v_self_couple IS NOT NULL OR v_partner_couple IS NOT NULL THEN
    IF v_self_couple IS NOT NULL AND v_self_couple = v_partner_couple THEN
      RETURN QUERY SELECT 'already_connected'::text, v_self_couple;
      RETURN;
    END IF;
    RAISE EXCEPTION 'pair_user_already_linked' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.couples (created_by, status)
  VALUES (v_uid, 'pending')
  RETURNING id INTO v_new_couple_id;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES
    (v_new_couple_id, v_uid, 'admin'),
    (v_new_couple_id, v_partner_id, 'admin');

  UPDATE public.couples
  SET status = 'active'
  WHERE id = v_new_couple_id;

  RETURN QUERY SELECT 'connected'::text, v_new_couple_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_couple_pairing(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_couple_pairing(text) TO authenticated;

COMMENT ON FUNCTION public.complete_couple_pairing(text) IS
  'Conecta duas contas que compartilham convite recíproco somente após cada uma confirmar o próprio e-mail; nunca bloqueia o acesso individual.';
