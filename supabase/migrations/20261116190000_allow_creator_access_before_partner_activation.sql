-- O criador pode publicar e conversar antes da entrada do segundo integrante.
-- O segundo integrante só é vinculado quando sua própria conta confirmar o e-mail.
BEGIN;

-- Predicado restrito: somente o criador, como único membro atual de um casal
-- pendente, pode usar os recursos compartilhados antes da ativação.
CREATE OR REPLACE FUNCTION public.can_use_pending_couple(p_couple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.couples AS c
    JOIN public.couple_members AS m
      ON m.couple_id = c.id
    WHERE c.id = p_couple_id
      AND c.status = 'pending'
      AND c.created_by = (SELECT auth.uid())
      AND m.user_id = (SELECT auth.uid())
      AND m.ended_at IS NULL
      AND (
        SELECT pg_catalog.count(*)
        FROM public.couple_members AS current_member
        WHERE current_member.couple_id = c.id
          AND current_member.ended_at IS NULL
      ) = 1
  );
$$;

REVOKE ALL ON FUNCTION public.can_use_pending_couple(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_pending_couple(uuid) TO authenticated;

-- A primeira conta confirmada recebe imediatamente um espaço pendente, com
-- uma única membership. A outra conta não é adicionada até concluir a própria
-- confirmação. Quando ela entrar, a chamada seguinte ativa o mesmo casal.
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
  v_partner_confirmed_at timestamptz;
  v_self_couple uuid;
  v_partner_couple uuid;
  v_target_couple uuid;
  v_created_by uuid;
  v_couple_status text;
  v_member_count integer;
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

  -- Localiza a conta recíproca mesmo que ainda não tenha confirmado o e-mail.
  -- A conta só será adicionada como integrante depois de confirmada.
  SELECT u.id, u.email_confirmed_at
  INTO v_partner_id, v_partner_confirmed_at
  FROM auth.users AS u
  WHERE pg_catalog.lower(u.email) = v_partner_email
    AND u.raw_user_meta_data ->> 'morados_pair_token' = p_token
    AND pg_catalog.lower(u.raw_user_meta_data ->> 'morados_pair_email') = v_email
  FOR UPDATE;

  IF v_partner_id = v_uid THEN
    RAISE EXCEPTION 'pair_accounts_must_be_distinct' USING ERRCODE = 'check_violation';
  END IF;

  SELECT m.couple_id INTO v_self_couple
  FROM public.couple_members AS m
  WHERE m.user_id = v_uid AND m.ended_at IS NULL
  FOR UPDATE;

  IF v_partner_id IS NOT NULL THEN
    SELECT m.couple_id INTO v_partner_couple
    FROM public.couple_members AS m
    WHERE m.user_id = v_partner_id AND m.ended_at IS NULL
    FOR UPDATE;
  END IF;

  -- Sem segunda conta confirmada: criar ou reaproveitar o espaço pendente
  -- do criador, sem atribuir membership à outra pessoa.
  IF v_partner_id IS NULL OR v_partner_confirmed_at IS NULL THEN
    IF v_partner_couple IS NOT NULL THEN
      RAISE EXCEPTION 'pair_user_already_linked' USING ERRCODE = 'unique_violation';
    END IF;

    IF v_self_couple IS NOT NULL THEN
      SELECT c.created_by, c.status
      INTO v_created_by, v_couple_status
      FROM public.couples AS c
      WHERE c.id = v_self_couple
      FOR UPDATE;

      SELECT pg_catalog.count(*)::integer
      INTO v_member_count
      FROM public.couple_members AS m
      WHERE m.couple_id = v_self_couple AND m.ended_at IS NULL;

      IF v_couple_status IS DISTINCT FROM 'pending'
         OR v_created_by IS DISTINCT FROM v_uid
         OR v_member_count <> 1 THEN
        RAISE EXCEPTION 'pair_user_already_linked' USING ERRCODE = 'unique_violation';
      END IF;

      RETURN QUERY SELECT 'waiting_for_partner'::text, v_self_couple;
      RETURN;
    END IF;

    INSERT INTO public.couples (created_by, status)
    VALUES (v_uid, 'pending')
    RETURNING id INTO v_new_couple_id;

    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (v_new_couple_id, v_uid, 'admin');

    RETURN QUERY SELECT 'waiting_for_partner'::text, v_new_couple_id;
    RETURN;
  END IF;

  SELECT m.couple_id INTO v_partner_couple
  FROM public.couple_members AS m
  WHERE m.user_id = v_partner_id AND m.ended_at IS NULL
  FOR UPDATE;

  IF v_self_couple IS NOT NULL AND v_self_couple = v_partner_couple THEN
    RETURN QUERY SELECT 'already_connected'::text, v_self_couple;
    RETURN;
  END IF;

  IF v_self_couple IS NOT NULL OR v_partner_couple IS NOT NULL THEN
    IF v_self_couple IS NOT NULL AND v_partner_couple IS NOT NULL THEN
      RAISE EXCEPTION 'pair_user_already_linked' USING ERRCODE = 'unique_violation';
    END IF;

    v_target_couple := COALESCE(v_self_couple, v_partner_couple);

    SELECT c.created_by, c.status
    INTO v_created_by, v_couple_status
    FROM public.couples AS c
    WHERE c.id = v_target_couple
    FOR UPDATE;

    SELECT pg_catalog.count(*)::integer
    INTO v_member_count
    FROM public.couple_members AS m
    WHERE m.couple_id = v_target_couple AND m.ended_at IS NULL;

    IF v_couple_status IS DISTINCT FROM 'pending'
       OR v_member_count <> 1
       OR v_created_by NOT IN (v_uid, v_partner_id) THEN
      RAISE EXCEPTION 'pair_user_already_linked' USING ERRCODE = 'unique_violation';
    END IF;

    IF v_self_couple IS NOT NULL THEN
      INSERT INTO public.couple_members (couple_id, user_id, role)
      VALUES (v_target_couple, v_partner_id, 'admin');
    ELSE
      INSERT INTO public.couple_members (couple_id, user_id, role)
      VALUES (v_target_couple, v_uid, 'admin');
    END IF;

    UPDATE public.couples
    SET status = 'active'
    WHERE id = v_target_couple;

    UPDATE public.couple_invitations
    SET status = 'revoked', revoked_at = pg_catalog.now()
    WHERE couple_id = v_target_couple AND status = 'pending';

    RETURN QUERY SELECT 'connected'::text, v_target_couple;
    RETURN;
  END IF;

  INSERT INTO public.couples (created_by, status)
  VALUES (v_uid, 'pending')
  RETURNING id INTO v_new_couple_id;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_new_couple_id, v_uid, 'admin');

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_new_couple_id, v_partner_id, 'admin');

  UPDATE public.couples
  SET status = 'active'
  WHERE id = v_new_couple_id;

  RETURN QUERY SELECT 'connected'::text, v_new_couple_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_couple_pairing(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_couple_pairing(text) TO authenticated;

-- Mensagens: o criador pode ler/enviar enquanto o casal aguarda a segunda conta.
DROP POLICY IF EXISTS couple_messages_insert_current_member ON public.couple_messages;
CREATE POLICY couple_messages_insert_current_member
  ON public.couple_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_messages.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple(couple_id)
    )
  );

DROP POLICY IF EXISTS couple_messages_update_sender ON public.couple_messages;
CREATE POLICY couple_messages_update_sender
  ON public.couple_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    AND public.can_view_couple(couple_id)
  )
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_messages.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple(couple_id)
    )
  );

-- Feed: publicações do criador ficam salvas no mesmo couple_id e passam a
-- aparecer automaticamente para o segundo integrante após a entrada dele.
DROP POLICY IF EXISTS couple_posts_insert_current_member ON public.couple_posts;
CREATE POLICY couple_posts_insert_current_member
  ON public.couple_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_posts.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple(couple_id)
    )
  );

DROP POLICY IF EXISTS couple_posts_update_author ON public.couple_posts;
CREATE POLICY couple_posts_update_author
  ON public.couple_posts
  FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND public.can_view_couple(couple_id)
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_posts.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple(couple_id)
    )
  );

-- Uploads privados: permitir ao criador anexar fotos, vídeos e áudios antes
-- de a segunda conta confirmar; o bucket continua privado.
DROP POLICY IF EXISTS couple_media_insert_current_member ON storage.objects;
CREATE POLICY couple_media_insert_current_member
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'couple-media'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = (((storage.foldername(name))[1])::uuid)
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple((((storage.foldername(name))[1])::uuid))
    )
  );

-- Preferências visuais compartilhadas podem ser preparadas pelo criador.
DROP POLICY IF EXISTS couple_conversation_settings_write_current_members ON public.couple_conversation_settings;
CREATE POLICY couple_conversation_settings_write_current_members
  ON public.couple_conversation_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_conversation_settings.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
    OR public.can_use_pending_couple(couple_id)
  )
  WITH CHECK (
    updated_by = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_conversation_settings.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple(couple_id)
    )
  );

-- Preferências pessoais de notificação também podem ser ajustadas pelo criador.
DROP POLICY IF EXISTS couple_conversation_member_settings_write_own ON public.couple_conversation_member_settings;
CREATE POLICY couple_conversation_member_settings_write_own
  ON public.couple_conversation_member_settings
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.can_view_couple(couple_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_conversation_member_settings.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
      OR public.can_use_pending_couple(couple_id)
    )
  );

COMMIT;
