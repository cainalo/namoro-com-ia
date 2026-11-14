-- Add the new memory games to the generic online match system.
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couple_game_matches') IS NULL THEN
    RAISE EXCEPTION 'preflight: couple_game_matches ausente';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.couple_game_matches'::regclass
      AND conname = 'couple_game_matches_game_key_check'
  ) THEN
    RAISE EXCEPTION 'preflight: constraint de game_key ausente';
  END IF;
END;
$preflight$;

ALTER TABLE public.couple_game_matches
  DROP CONSTRAINT couple_game_matches_game_key_check;

ALTER TABLE public.couple_game_matches
  ADD CONSTRAINT couple_game_matches_game_key_check
  CHECK (game_key IN (
    'connect-four','checkers','this-or-that','daily-challenge',
    'investigation','investigation-train','chess','battleship',
    'domino','truco','quiz','escape-room','island-survival',
    'memory-match','symbol-sequence'
  ));

CREATE OR REPLACE FUNCTION public.start_game_match(p_couple_id uuid, p_game_key text, p_mode text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_status text;
  v_partner uuid;
  v_members integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_game_key NOT IN (
    'connect-four','checkers','this-or-that','daily-challenge',
    'investigation','investigation-train','chess','battleship',
    'domino','truco','quiz','escape-room','island-survival',
    'memory-match','symbol-sequence'
  ) OR p_game_key = 'connect-four' THEN
    RAISE EXCEPTION 'invalid_game' USING ERRCODE = 'check_violation';
  END IF;
  IF p_mode NOT IN ('competitive','cooperative') THEN
    RAISE EXCEPTION 'invalid_mode' USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.status INTO v_status
  FROM public.couples AS c
  WHERE c.id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND OR v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'couple_not_active' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT pg_catalog.count(*) INTO v_members
  FROM public.couple_members AS m
  WHERE m.couple_id = p_couple_id AND m.ended_at IS NULL;

  IF v_members <> 2 OR NOT EXISTS (
    SELECT 1 FROM public.couple_members AS m
    WHERE m.couple_id = p_couple_id
      AND m.user_id = v_uid
      AND m.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_couple_members' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT g.id INTO v_id
  FROM public.couple_game_matches AS g
  WHERE g.couple_id = p_couple_id
    AND g.game_key = p_game_key
    AND g.status = 'active';

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT m.user_id INTO v_partner
  FROM public.couple_members AS m
  WHERE m.couple_id = p_couple_id
    AND m.ended_at IS NULL
    AND m.user_id <> v_uid;

  INSERT INTO public.couple_game_matches
    (couple_id, game_key, mode, player_one_id, player_two_id, board, current_turn, state, version)
  VALUES
    (p_couple_id, p_game_key, p_mode, v_uid, v_partner, '[]'::jsonb, v_uid, '{}'::jsonb, 0)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_game_match(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_game_match(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
