-- Convites globais para partidas online do Morados.
BEGIN;

CREATE TABLE public.couple_game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  game_key text NOT NULL CHECK (game_key IN (
    'connect-four','checkers','this-or-that','daily-challenge',
    'investigation','investigation-train','chess','battleship',
    'domino','truco','quiz','escape-room','island-survival','cave-expedition'
  )),
  game_mode text NOT NULL CHECK (game_mode IN ('competitive','cooperative')),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  match_id uuid REFERENCES public.couple_game_matches(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL DEFAULT (pg_catalog.now() + interval '15 minutes'),
  responded_at timestamptz,
  CONSTRAINT couple_game_invitations_distinct_users CHECK (from_user_id <> to_user_id),
  CONSTRAINT couple_game_invitations_response_state CHECK (
    (status = 'pending' AND responded_at IS NULL AND match_id IS NULL)
    OR (status = 'accepted' AND responded_at IS NOT NULL)
    OR (status IN ('declined','cancelled','expired') AND responded_at IS NOT NULL AND match_id IS NULL)
  )
);

CREATE INDEX couple_game_invitations_recipient_pending_idx
  ON public.couple_game_invitations (to_user_id, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX couple_game_invitations_sender_pending_idx
  ON public.couple_game_invitations (from_user_id, created_at DESC)
  WHERE status = 'pending';
CREATE UNIQUE INDEX couple_game_invitations_one_pending_per_couple_uidx
  ON public.couple_game_invitations (couple_id)
  WHERE status = 'pending';

REVOKE ALL ON TABLE public.couple_game_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.couple_game_invitations TO authenticated;
GRANT ALL ON TABLE public.couple_game_invitations TO service_role;
ALTER TABLE public.couple_game_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY couple_game_invitations_select_current_members
  ON public.couple_game_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.couples AS c
      JOIN public.couple_members AS m ON m.couple_id = c.id
      WHERE c.id = couple_game_invitations.couple_id
        AND c.status = 'active'
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
    )
  );

CREATE FUNCTION public.create_couple_game_invitation(p_game_key text, p_game_mode text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_couple_id uuid;
  v_partner_id uuid;
  v_member_count integer;
  v_invitation_id uuid;
  v_expected_mode text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_game_key NOT IN (
    'connect-four','checkers','this-or-that','daily-challenge',
    'investigation','investigation-train','chess','battleship',
    'domino','truco','quiz','escape-room','island-survival','cave-expedition'
  ) THEN
    RAISE EXCEPTION 'invalid_game' USING ERRCODE = 'check_violation';
  END IF;

  v_expected_mode := CASE
    WHEN p_game_key IN (
      'this-or-that','daily-challenge','investigation','investigation-train',
      'escape-room','island-survival','cave-expedition'
    ) THEN 'cooperative'
    ELSE 'competitive'
  END;

  IF p_game_mode IS DISTINCT FROM v_expected_mode THEN
    RAISE EXCEPTION 'invalid_game_mode' USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.id INTO v_couple_id
  FROM public.couples AS c
  JOIN public.couple_members AS m ON m.couple_id = c.id
  WHERE m.user_id = v_uid
    AND m.ended_at IS NULL
    AND c.status = 'active'
  FOR UPDATE OF c;

  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'active_couple_required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('game_invitation:' || v_couple_id::text, 0)
  );

  SELECT pg_catalog.count(*)::integer INTO v_member_count
  FROM public.couple_members AS m
  WHERE m.couple_id = v_couple_id AND m.ended_at IS NULL;

  IF v_member_count <> 2 THEN
    RAISE EXCEPTION 'invalid_couple_members' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT m.user_id INTO v_partner_id
  FROM public.couple_members AS m
  WHERE m.couple_id = v_couple_id
    AND m.user_id <> v_uid
    AND m.ended_at IS NULL;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.couple_game_invitations AS i
  SET status = 'expired', responded_at = pg_catalog.now()
  WHERE i.couple_id = v_couple_id
    AND i.status = 'pending'
    AND i.expires_at <= pg_catalog.now();

  IF EXISTS (
    SELECT 1 FROM public.couple_game_invitations AS i
    WHERE i.couple_id = v_couple_id AND i.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'invitation_already_pending' USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.couple_game_matches AS g
    WHERE g.couple_id = v_couple_id
      AND g.game_key = p_game_key
      AND g.status = 'active'
  ) THEN
    RAISE EXCEPTION 'active_match_exists' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.couple_game_invitations (
    couple_id, game_key, game_mode, from_user_id, to_user_id
  )
  VALUES (v_couple_id, p_game_key, p_game_mode, v_uid, v_partner_id)
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

CREATE FUNCTION public.respond_couple_game_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
RETURNS TABLE (
  invitation_id uuid,
  invitation_status text,
  game_key text,
  game_mode text,
  couple_id uuid,
  match_id uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_invitation public.couple_game_invitations%ROWTYPE;
  v_match_id uuid;
  v_member_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT i.* INTO v_invitation
  FROM public.couple_game_invitations AS i
  WHERE i.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_invitation.to_user_id <> v_uid THEN
    RAISE EXCEPTION 'not_invitation_recipient' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_invitation.status = 'accepted' THEN
    RETURN QUERY SELECT v_invitation.id, v_invitation.status, v_invitation.game_key,
      v_invitation.game_mode, v_invitation.couple_id, v_invitation.match_id, v_invitation.expires_at;
    RETURN;
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending' USING ERRCODE = 'check_violation';
  END IF;

  IF v_invitation.expires_at <= pg_catalog.now() THEN
    UPDATE public.couple_game_invitations AS i
    SET status = 'expired', responded_at = pg_catalog.now()
    WHERE i.id = v_invitation.id
    RETURNING i.* INTO v_invitation;
    RETURN QUERY SELECT v_invitation.id, v_invitation.status, v_invitation.game_key,
      v_invitation.game_mode, v_invitation.couple_id, v_invitation.match_id, v_invitation.expires_at;
    RETURN;
  END IF;

  IF NOT p_accept THEN
    UPDATE public.couple_game_invitations AS i
    SET status = 'declined', responded_at = pg_catalog.now()
    WHERE i.id = v_invitation.id
    RETURNING i.* INTO v_invitation;
    RETURN QUERY SELECT v_invitation.id, v_invitation.status, v_invitation.game_key,
      v_invitation.game_mode, v_invitation.couple_id, v_invitation.match_id, v_invitation.expires_at;
    RETURN;
  END IF;

  SELECT pg_catalog.count(*)::integer INTO v_member_count
  FROM public.couple_members AS m
  WHERE m.couple_id = v_invitation.couple_id
    AND m.ended_at IS NULL
    AND m.user_id IN (v_invitation.from_user_id, v_invitation.to_user_id);

  IF v_member_count <> 2 OR NOT EXISTS (
    SELECT 1 FROM public.couples AS c
    WHERE c.id = v_invitation.couple_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'couple_no_longer_active' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A partida só é criada dentro da transação de aceite.
  IF v_invitation.game_key = 'connect-four' THEN
    v_match_id := public.create_connect_four_match(v_invitation.couple_id);
  ELSIF v_invitation.game_key NOT IN ('this-or-that','daily-challenge') THEN
    v_match_id := public.start_game_match(
      v_invitation.couple_id,
      v_invitation.game_key,
      v_invitation.game_mode
    );
  END IF;

  UPDATE public.couple_game_invitations AS i
  SET status = 'accepted',
      match_id = v_match_id,
      responded_at = pg_catalog.now()
  WHERE i.id = v_invitation.id
  RETURNING i.* INTO v_invitation;

  RETURN QUERY SELECT v_invitation.id, v_invitation.status, v_invitation.game_key,
    v_invitation.game_mode, v_invitation.couple_id, v_invitation.match_id, v_invitation.expires_at;
END;
$$;

CREATE FUNCTION public.cancel_couple_game_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.couple_game_invitations AS i
  SET status = 'cancelled', responded_at = pg_catalog.now()
  WHERE i.id = p_invitation_id
    AND i.from_user_id = v_uid
    AND i.status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'invitation_not_cancellable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_couple_game_invitation(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_couple_game_invitation(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_couple_game_invitation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple_game_invitation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_couple_game_invitation(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_couple_game_invitation(uuid) TO authenticated;

DO $publication$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'couple_game_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_game_invitations;
  END IF;
END;
$publication$;

NOTIFY pgrst, 'reload schema';
COMMIT;
