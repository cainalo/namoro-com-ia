-- Account deletion: remove the couple bundle and both current accounts atomically.
-- The caller is authenticated by the Edge Function; only service_role can execute this RPC.

DO $preflight$
DECLARE
  v_name text;
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

  IF pg_catalog.to_regprocedure('public.couples_block_delete()') IS NULL
     OR pg_catalog.to_regprocedure('public.couple_invitations_before_delete()') IS NULL THEN
    RAISE EXCEPTION 'account deletion preflight: protected-history triggers are missing';
  END IF;
END;
$preflight$;

-- Preserve normal history protection. Only the privileged deletion transaction
-- can set this transaction-local flag and pass through these DELETE guards.
CREATE OR REPLACE FUNCTION public.couples_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.current_setting('app.account_deletion', true) = 'true' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'couple history cannot be deleted' USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.couple_invitations_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.current_setting('app.account_deletion', true) = 'true' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'invitation history cannot be deleted' USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_couple_account_bundle(p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
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

  -- An active or pending couple is one deletion unit. If the account has no
  -- current partner, only the requesting account is included.
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

  -- Include every couple record associated with the accounts being removed,
  -- including archived history and invitation-only remnants.
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

  -- Serialize with concurrent account/couple operations before removing data.
  PERFORM u.id
  FROM auth.users u
  WHERE u.id = ANY(v_user_ids)
  ORDER BY u.id
  FOR UPDATE;

  PERFORM c.id
  FROM public.couples c
  WHERE c.id = ANY(v_couple_ids)
  ORDER BY c.id
  FOR UPDATE;

  -- This flag is local to this transaction. It does not relax DELETE rules
  -- for clients, other requests, or later transactions.
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

  -- These history tables normally reject DELETE. The transaction-local guard
  -- above permits this explicit, verified account-erasure operation only.
  DELETE FROM public.couple_members
  WHERE couple_id = ANY(v_couple_ids)
     OR user_id = ANY(v_user_ids);

  DELETE FROM public.couples
  WHERE id = ANY(v_couple_ids)
     OR created_by = ANY(v_user_ids);

  -- Profiles and Auth-owned rows cascade from this single transactional delete.
  -- Direct deletion here is intentional: it keeps both partner accounts and
  -- all dependent relational data in the same PostgreSQL transaction.
  DELETE FROM auth.users
  WHERE id = ANY(v_user_ids);

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'deleted_accounts', pg_catalog.cardinality(v_user_ids),
    'deleted_couples', pg_catalog.cardinality(v_couple_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_couple_account_bundle(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_couple_account_bundle(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_couple_account_bundle(uuid) IS
  'Server-only, atomic erasure of the requesting account, its current partner (if any), and the couple data linked to either account. Storage files must be removed by the authenticated Edge Function before this RPC.';
