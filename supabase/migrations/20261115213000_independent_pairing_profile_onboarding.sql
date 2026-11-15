-- Morados: pareamento independente por conta + perfil pessoal e tutorial.
-- A primeira conta verificada pode acessar seu próprio espaço enquanto aguarda a segunda.
-- O casal só passa a ACTIVE depois que os dois e-mails estiverem confirmados.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS favorite_song text,
  ADD COLUMN IF NOT EXISTS favorite_place text,
  ADD COLUMN IF NOT EXISTS personal_phrase text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;

GRANT UPDATE (
  display_name,
  avatar_path,
  bio,
  banner_path,
  headline,
  interests,
  favorite_song,
  favorite_place,
  personal_phrase,
  onboarding_completed_at,
  tutorial_completed_at
) ON TABLE public.profiles TO authenticated;

-- Mantém a leitura do perfil próprio e libera a leitura do perfil da outra pessoa
-- somente quando ambos já pertencem ao mesmo casal ativo.
DROP POLICY IF EXISTS profiles_select_active_partner ON public.profiles;
CREATE POLICY profiles_select_active_partner ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.couple_members AS own_member
      JOIN public.couple_members AS partner_member
        ON partner_member.couple_id = own_member.couple_id
      JOIN public.couples AS c
        ON c.id = own_member.couple_id
      WHERE own_member.user_id = (SELECT auth.uid())
        AND own_member.ended_at IS NULL
        AND partner_member.user_id = profiles.id
        AND partner_member.ended_at IS NULL
        AND c.status = 'active'
    )
  );

-- Imagens pessoais ficam em bucket privado e podem ser enviadas antes do pareamento.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'morados-profile-media',
  'morados-profile-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS morados_profile_media_read ON storage.objects;
CREATE POLICY morados_profile_media_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'morados-profile-media'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1
        FROM public.couple_members AS own_member
        JOIN public.couple_members AS partner_member
          ON partner_member.couple_id = own_member.couple_id
        JOIN public.couples AS c
          ON c.id = own_member.couple_id
        WHERE own_member.user_id = (SELECT auth.uid())
          AND own_member.ended_at IS NULL
          AND partner_member.user_id::text = (storage.foldername(name))[1]
          AND partner_member.ended_at IS NULL
          AND c.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS morados_profile_media_insert ON storage.objects;
CREATE POLICY morados_profile_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'morados-profile-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS morados_profile_media_update ON storage.objects;
CREATE POLICY morados_profile_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'morados-profile-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'morados-profile-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS morados_profile_media_delete ON storage.objects;
CREATE POLICY morados_profile_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'morados-profile-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Transação idempotente: cria o casal pendente no primeiro acesso verificado,
-- completa o segundo membro quando a outra conta também confirmar o e-mail.
CREATE OR REPLACE FUNCTION public.complete_couple_pairing(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_user auth.users%ROWTYPE;
  v_partner auth.users%ROWTYPE;
  v_partner_email text;
  v_couple_id uuid;
  v_partner_couple_id uuid;
  v_status text;
  v_created_by uuid;
  v_members integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_pair_token' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('morados-pairing:' || p_token, 0)
  );

  SELECT u.* INTO v_user
  FROM auth.users AS u
  WHERE u.id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'authenticated_user_not_found' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_user.email_confirmed_at IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'pending',
      'reason', 'awaiting_own_email',
      'couple_id', NULL
    );
  END IF;

  IF (v_user.raw_user_meta_data ->> 'morados_pair_token') IS DISTINCT FROM p_token THEN
    RAISE EXCEPTION 'pair_token_does_not_belong_to_user' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_partner_email := pg_catalog.lower(pg_catalog.btrim(
    v_user.raw_user_meta_data ->> 'morados_pair_email'
  ));

  IF v_partner_email IS NULL OR v_partner_email = ''
     OR v_user.email IS NULL
     OR v_partner_email = pg_catalog.lower(v_user.email) THEN
    RAISE EXCEPTION 'invalid_partner_email' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT u.* INTO v_partner
  FROM auth.users AS u
  WHERE pg_catalog.lower(u.email) = v_partner_email
    AND u.id <> v_uid
    AND u.raw_user_meta_data ->> 'morados_pair_token' = p_token
    AND pg_catalog.lower(COALESCE(u.raw_user_meta_data ->> 'morados_pair_email', ''))
        = pg_catalog.lower(v_user.email)
  LIMIT 1
  FOR UPDATE;

  -- Mesmo sem a segunda conta criada, o primeiro usuário confirmado ganha
  -- seu espaço pessoal e pode concluir o perfil; o vínculo não é ativado.
  IF NOT FOUND THEN
    v_partner.id := NULL;
  END IF;

  SELECT m.couple_id INTO v_couple_id
  FROM public.couple_members AS m
  WHERE m.user_id = v_uid
    AND m.ended_at IS NULL;

  IF v_partner.id IS NOT NULL THEN
    SELECT m.couple_id INTO v_partner_couple_id
    FROM public.couple_members AS m
    WHERE m.user_id = v_partner.id
      AND m.ended_at IS NULL;
  END IF;

  IF v_couple_id IS NOT NULL
     AND v_partner_couple_id IS NOT NULL
     AND v_couple_id IS DISTINCT FROM v_partner_couple_id THEN
    RAISE EXCEPTION 'pair_accounts_already_linked_differently'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Se a outra conta já criou o espaço pendente, a conta atual entra nele.
  IF v_couple_id IS NULL AND v_partner_couple_id IS NOT NULL THEN
    v_couple_id := v_partner_couple_id;
  END IF;

  -- Na primeira verificação, cria apenas o espaço pendente individual.
  IF v_couple_id IS NULL THEN
    INSERT INTO public.couples (created_by, status)
    VALUES (v_uid, 'pending')
    RETURNING id INTO v_couple_id;

    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (v_couple_id, v_uid, 'admin');
  END IF;

  SELECT c.status, c.created_by
    INTO v_status, v_created_by
  FROM public.couples AS c
  WHERE c.id = v_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pair_couple_not_found' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_status = 'active' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'active',
      'reason', 'already_paired',
      'couple_id', v_couple_id
    );
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'pair_couple_not_pending' USING ERRCODE = 'check_violation';
  END IF;

  -- Se a membership existente pertence à outra conta, insere a atual como segundo membro.
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_members AS m
    WHERE m.couple_id = v_couple_id
      AND m.user_id = v_uid
      AND m.ended_at IS NULL
  ) THEN
    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (v_couple_id, v_uid, 'admin');
  END IF;

  SELECT pg_catalog.count(*) INTO v_members
  FROM public.couple_members AS m
  WHERE m.couple_id = v_couple_id
    AND m.ended_at IS NULL;

  IF v_members > 2 THEN
    RAISE EXCEPTION 'pair_couple_has_too_many_members' USING ERRCODE = 'check_violation';
  END IF;

  IF v_partner.id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'pending',
      'reason', 'awaiting_partner_account',
      'couple_id', v_couple_id
    );
  END IF;

  IF v_partner.email_confirmed_at IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'pending',
      'reason', 'awaiting_partner_email',
      'couple_id', v_couple_id
    );
  END IF;

  IF v_partner_couple_id IS NOT NULL AND v_partner_couple_id <> v_couple_id THEN
    RAISE EXCEPTION 'partner_account_already_linked' USING ERRCODE = 'unique_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.couple_members AS m
    WHERE m.couple_id = v_couple_id
      AND m.user_id = v_partner.id
      AND m.ended_at IS NULL
  ) THEN
    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (v_couple_id, v_partner.id, 'admin');
  END IF;

  UPDATE public.couples AS c
  SET status = 'active'
  WHERE c.id = v_couple_id
    AND c.status = 'pending';

  -- O token perde a validade assim que o vínculo transacional é concluído.
  UPDATE auth.users AS u
  SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb)
    - 'morados_pair_token' - 'morados_pair_email'
  WHERE u.id IN (v_uid, v_partner.id);

  RETURN pg_catalog.jsonb_build_object(
    'status', 'active',
    'reason', 'both_emails_verified',
    'couple_id', v_couple_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_couple_pairing(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_couple_pairing(text) TO authenticated;

COMMENT ON FUNCTION public.complete_couple_pairing(text) IS
  'Allows each confirmed account to access its private profile; activates the couple only when both reciprocal email confirmations are complete.';
