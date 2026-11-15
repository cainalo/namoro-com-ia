-- Correct the deletion scope lock order so invitation acceptance cannot race account erasure.
-- The actor's current couple row is locked before its current partners are read again.
-- This serializes against accept_couple_invitation(), which locks the same couple row.

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

  -- Serialize against create_couple() for the actor.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('create_couple:' || p_actor_id::text, 0)
  );

  -- Determine and lock the actor's current couple(s) before discovering the
  -- partner list. accept_couple_invitation() locks this same couple row.
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

  -- Re-read the current members after the lock. If invitation acceptance won
  -- the lock first, its second member is now included. If deletion won first,
  -- the invite cannot attach a new account to the deleted couple.
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

  -- Lock historical records too, then lock both Auth users in stable order.
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
