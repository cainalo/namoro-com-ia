-- Harden account erasure against invitation acceptance and schema drift.
-- Both acceptance and deletion serialize on the recipient/actor account advisory lock.

DO $preflight$
DECLARE
  v_name text;
  v_accept_definition text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'couples',
    'couple_members',
    'couple_invitations',
    'couple_messages',
    'couple_game_choices',
    'couple_daily_challenge_progress',
    'couple_game_matches',
    'couple_game_private_state',
    'couple_game_piles',
    'couple_memories',
    'couple_plan_events',
    'couple_posts',
    'couple_conversation_settings',
    'couple_conversation_member_settings'
  ] LOOP
    IF pg_catalog.to_regclass('public.' || v_name) IS NULL THEN
      RAISE EXCEPTION 'account deletion preflight: required table public.% is missing', v_name;
    END IF;
  END LOOP;

  IF pg_catalog.to_regprocedure('public.delete_couple_account_bundle(uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.accept_couple_invitation(text)') IS NULL
     OR pg_catalog.to_regprocedure('public.couples_block_delete()') IS NULL
     OR pg_catalog.to_regprocedure('public.couple_invitations_before_delete()') IS NULL
     OR pg_catalog.to_regprocedure('public.couple_members_before_insert()') IS NULL THEN
    RAISE EXCEPTION 'account deletion preflight: required security functions are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'couples'
      AND t.tgname = 'couples_block_delete'
      AND NOT t.tgisinternal
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'couple_members'
      AND t.tgname = 'couple_members_block_delete'
      AND NOT t.tgisinternal
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'couple_invitations'
      AND t.tgname = 'couple_invitations_before_delete'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'account deletion preflight: protected history triggers are missing';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    'public.accept_couple_invitation(text)'::pg_catalog.regprocedure
  ) INTO v_accept_definition;

  IF pg_catalog.strpos(pg_catalog.upper(v_accept_definition), 'FOR UPDATE') = 0
     OR pg_catalog.strpos(pg_catalog.upper(v_accept_definition), 'INSERT INTO PUBLIC.COUPLE_MEMBERS') = 0
     OR pg_catalog.strpos(pg_catalog.upper(v_accept_definition), 'TOKEN_HASH') = 0 THEN
    RAISE EXCEPTION 'account deletion preflight: invitation acceptance function does not match the expected locked flow';
  END IF;
END;
$preflight$;

-- An account-level advisory lock is acquired before the couple row lock.
-- The delete RPC acquires the same lock, including when the recipient has
-- not accepted an invitation and therefore has no couple_members row yet.
CREATE OR REPLACE FUNCTION public.accept_couple_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_crypto_schema name;
  v_token_hash text;
  v_initial_couple_id uuid;
  v_couple_id uuid;
  v_couple_status text;
  v_created_by uuid;
  v_invitation_id uuid;
  v_invitation_status text;
  v_inviter uuid;
  v_expires_at timestamptz;
  v_members integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('delete_account:' || v_uid::text, 0)
  );

  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;

  SELECT n.nspname
    INTO v_crypto_schema
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_crypto_schema IS NULL THEN
    RAISE EXCEPTION 'pgcrypto unavailable' USING ERRCODE = 'feature_not_supported';
  END IF;

  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.encode(%I.digest(pg_catalog.convert_to($1, ''UTF8''), ''sha256''), ''hex'')',
    v_crypto_schema
  ) INTO v_token_hash USING p_token;

  SELECT i.couple_id INTO v_initial_couple_id
  FROM public.couple_invitations i
  WHERE i.token_hash = v_token_hash;

  IF v_initial_couple_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT c.status, c.created_by
    INTO v_couple_status, v_created_by
  FROM public.couples c
  WHERE c.id = v_initial_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT i.id, i.couple_id, i.inviter_user_id, i.status, i.expires_at
    INTO v_invitation_id, v_couple_id, v_inviter, v_invitation_status, v_expires_at
  FROM public.couple_invitations i
  WHERE i.token_hash = v_token_hash
    AND i.couple_id = v_initial_couple_id
  FOR UPDATE;

  IF NOT FOUND OR v_invitation_status IS DISTINCT FROM 'pending'
     OR v_couple_status IS DISTINCT FROM 'pending' THEN
    RETURN NULL;
  END IF;

  IF v_expires_at <= pg_catalog.now() THEN
    UPDATE public.couple_invitations i
       SET status = 'expired'
     WHERE i.id = v_invitation_id;
    RETURN NULL;
  END IF;

  IF v_inviter IS DISTINCT FROM v_created_by
     OR v_inviter = v_uid THEN
    RETURN NULL;
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_members
  FROM public.couple_members m
  WHERE m.couple_id = v_couple_id
    AND m.ended_at IS NULL;

  IF v_members <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.couple_id = v_couple_id
      AND m.user_id = v_inviter
      AND m.ended_at IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.user_id = v_uid
      AND m.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'account_already_linked' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_couple_id, v_uid, 'admin');

  UPDATE public.couples c
     SET status = 'active'
   WHERE c.id = v_couple_id;

  UPDATE public.couple_invitations i
     SET status = 'accepted', accepted_by = v_uid
   WHERE i.id = v_invitation_id;

  RETURN v_couple_id;
END;
$$;

-- Re-read current partners only after locking the actor against both account
-- deletion and couple creation, then lock the current couple before finalizing
-- the partner list. Invitation acceptance uses the same delete_account lock.
CREATE OR REPLACE FUNCTION public.delete_couple_account_bundle(p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_initial_current_couple_ids uuid[];
  v_user_ids uuid[];
  v_couple_ids uuid[];
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'account not found' USING ERRCODE = 'no_data_found';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('delete_account:' || p_actor_id::text, 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('create_couple:' || p_actor_id::text, 0)
  );

  SELECT COALESCE(
    pg_catalog.array_agg(DISTINCT m.couple_id ORDER BY m.couple_id),
    ARRAY[]::uuid[]
  )
  INTO v_initial_current_couple_ids
  FROM public.couple_members m
  WHERE m.user_id = p_actor_id
    AND m.ended_at IS NULL;

  IF pg_catalog.cardinality(v_initial_current_couple_ids) > 1 THEN
    RAISE EXCEPTION 'account has multiple current couple memberships; deletion aborted'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM c.id
  FROM public.couples c
  WHERE c.id = ANY(v_initial_current_couple_ids)
  ORDER BY c.id
  FOR UPDATE;

  SELECT COALESCE(
    pg_catalog.array_agg(DISTINCT current_member.user_id ORDER BY current_member.user_id),
    ARRAY[p_actor_id]::uuid[]
  )
  INTO v_user_ids
  FROM public.couple_members actor_member
  JOIN public.couple_members current_member
    ON current_member.couple_id = actor_member.couple_id
   AND current_member.ended_at IS NULL
  WHERE actor_member.user_id = p_actor_id
    AND actor_member.ended_at IS NULL;

  IF NOT (p_actor_id = ANY(v_user_ids)) OR pg_catalog.cardinality(v_user_ids) > 2 THEN
    RAISE EXCEPTION 'current couple membership changed unexpectedly; deletion aborted'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(
    pg_catalog.array_agg(DISTINCT scope.couple_id ORDER BY scope.couple_id),
    ARRAY[]::uuid[]
  )
  INTO v_couple_ids
  FROM (
    SELECT m.couple_id
    FROM public.couple_members m
    WHERE m.user_id = ANY(v_user_ids)

    UNION

    SELECT c.id
    FROM public.couples c
    WHERE c.created_by = ANY(v_user_ids)

    UNION

    SELECT i.couple_id
    FROM public.couple_invitations i
    WHERE i.inviter_user_id = ANY(v_user_ids)
       OR i.accepted_by = ANY(v_user_ids)
  ) AS scope;

  PERFORM c.id
  FROM public.couples c
  WHERE c.id = ANY(v_couple_ids)
  ORDER BY c.id
  FOR UPDATE;

  PERFORM u.id
  FROM auth.users u
  WHERE u.id = ANY(v_user_ids)
  ORDER BY u.id
  FOR UPDATE;

  PERFORM pg_catalog.set_config('app.account_deletion', 'true', true);

  DELETE FROM public.couple_game_private_state s
  WHERE s.user_id = ANY(v_user_ids)
     OR s.match_id IN (
       SELECT m.id FROM public.couple_game_matches m
       WHERE m.couple_id = ANY(v_couple_ids)
     );

  DELETE FROM public.couple_game_piles p
  WHERE p.match_id IN (
    SELECT m.id FROM public.couple_game_matches m
    WHERE m.couple_id = ANY(v_couple_ids)
  );

  DELETE FROM public.couple_game_matches m
  WHERE m.couple_id = ANY(v_couple_ids)
     OR m.player_one_id = ANY(v_user_ids)
     OR m.player_two_id = ANY(v_user_ids)
     OR m.winner_id = ANY(v_user_ids);

  DELETE FROM public.couple_posts
  WHERE couple_id = ANY(v_couple_ids)
     OR author_id = ANY(v_user_ids);

  DELETE FROM public.couple_messages
  WHERE couple_id = ANY(v_couple_ids)
     OR sender_id = ANY(v_user_ids);

  DELETE FROM public.couple_game_choices
  WHERE couple_id = ANY(v_couple_ids)
     OR user_id = ANY(v_user_ids);

  DELETE FROM public.couple_daily_challenge_progress
  WHERE couple_id = ANY(v_couple_ids)
     OR user_id = ANY(v_user_ids);

  DELETE FROM public.couple_memories
  WHERE couple_id = ANY(v_couple_ids)
     OR owner_id = ANY(v_user_ids);

  DELETE FROM public.couple_plan_events
  WHERE couple_id = ANY(v_couple_ids)
     OR owner_id = ANY(v_user_ids);

  DELETE FROM public.couple_conversation_member_settings
  WHERE couple_id = ANY(v_couple_ids)
     OR user_id = ANY(v_user_ids);

  DELETE FROM public.couple_conversation_settings
  WHERE couple_id = ANY(v_couple_ids);

  DELETE FROM public.couple_invitations
  WHERE couple_id = ANY(v_couple_ids)
     OR inviter_user_id = ANY(v_user_ids)
     OR accepted_by = ANY(v_user_ids);

  DELETE FROM public.couple_members
  WHERE couple_id = ANY(v_couple_ids)
     OR user_id = ANY(v_user_ids);

  DELETE FROM public.couples
  WHERE id = ANY(v_couple_ids)
     OR created_by = ANY(v_user_ids);

  DELETE FROM auth.users
  WHERE id = ANY(v_user_ids);

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'deleted_accounts', pg_catalog.cardinality(v_user_ids),
    'deleted_couples', pg_catalog.cardinality(v_couple_ids)
  );
END;
$$;
