-- Reaproveita um espaço legado de um integrante quando as duas contas confirmam
-- o pareamento por e-mail; não exige link de convite e não permite terceiros.
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

COMMENT ON FUNCTION public.complete_couple_pairing(text) IS
  'Conecta duas contas com confirmação recíproca de e-mail; reaproveita um espaço legado pendente de um integrante sem exigir link de convite.';
