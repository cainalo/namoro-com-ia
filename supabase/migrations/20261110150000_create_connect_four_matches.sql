BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL
     OR pg_catalog.to_regprocedure('public.can_view_couple(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples, couple_members ou can_view_couple ausente';
  END IF;

  IF pg_catalog.to_regclass('public.couple_game_matches') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_game_matches já existe; revisar antes de continuar';
  END IF;

  IF pg_catalog.to_regprocedure('public.create_connect_four_match(uuid)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.play_connect_four_move(uuid,integer,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: RPC de Lig 4 já existe; revisar antes de continuar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'preflight: publicação supabase_realtime não encontrada';
  END IF;
END;
$preflight$;

CREATE TABLE public.couple_game_matches (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  game_key text NOT NULL CHECK (game_key = 'connect-four'),
  player_one_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  player_two_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  board jsonb NOT NULL
    CHECK (
      pg_catalog.jsonb_typeof(board) = 'array'
      AND pg_catalog.jsonb_array_length(board) = 42
    ),
  current_turn uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finished')),
  winner_id uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_draw boolean NOT NULL DEFAULT false,
  turn_number integer NOT NULL DEFAULT 0 CHECK (turn_number BETWEEN 0 AND 42),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  finished_at timestamptz NULL,
  CONSTRAINT couple_game_matches_distinct_players_chk
    CHECK (player_one_id <> player_two_id),
  CONSTRAINT couple_game_matches_current_turn_chk
    CHECK (current_turn IN (player_one_id, player_two_id)),
  CONSTRAINT couple_game_matches_winner_chk
    CHECK (winner_id IS NULL OR winner_id IN (player_one_id, player_two_id)),
  CONSTRAINT couple_game_matches_outcome_chk
    CHECK (
      (status = 'active' AND winner_id IS NULL AND NOT is_draw AND finished_at IS NULL)
      OR
      (status = 'finished' AND finished_at IS NOT NULL
        AND ((winner_id IS NOT NULL AND NOT is_draw) OR (winner_id IS NULL AND is_draw)))
    )
);

CREATE UNIQUE INDEX couple_game_matches_one_active_per_couple_uidx
  ON public.couple_game_matches (couple_id)
  WHERE status = 'active';

CREATE INDEX couple_game_matches_history_idx
  ON public.couple_game_matches (couple_id, created_at DESC);

ALTER TABLE public.couple_game_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_game_matches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.couple_game_matches TO authenticated;
GRANT ALL ON TABLE public.couple_game_matches TO service_role;

CREATE POLICY couple_game_matches_select_members
  ON public.couple_game_matches
  FOR SELECT
  TO authenticated
  USING (public.can_view_couple(couple_id));

CREATE FUNCTION public.create_connect_four_match(p_couple_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_status text;
  v_members uuid[];
  v_partner_id uuid;
  v_existing_id uuid;
  v_match_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT c.status
    INTO v_status
  FROM public.couples AS c
  WHERE c.id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND OR v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'couple_not_active' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT pg_catalog.array_agg(m.user_id ORDER BY m.joined_at, m.user_id)
    INTO v_members
  FROM public.couple_members AS m
  WHERE m.couple_id = p_couple_id
    AND m.ended_at IS NULL;

  IF COALESCE(pg_catalog.array_length(v_members, 1), 0) <> 2
     OR NOT (v_user_id = ANY(v_members)) THEN
    RAISE EXCEPTION 'invalid_couple_members' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT m.user_id
    INTO v_partner_id
  FROM public.couple_members AS m
  WHERE m.couple_id = p_couple_id
    AND m.ended_at IS NULL
    AND m.user_id <> v_user_id;

  SELECT g.id
    INTO v_existing_id
  FROM public.couple_game_matches AS g
  WHERE g.couple_id = p_couple_id
    AND g.status = 'active';

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.couple_game_matches (
    couple_id,
    game_key,
    player_one_id,
    player_two_id,
    board,
    current_turn
  )
  VALUES (
    p_couple_id,
    'connect-four',
    v_user_id,
    v_partner_id,
    pg_catalog.to_jsonb(pg_catalog.array_fill(0, ARRAY[42])),
    v_user_id
  )
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

CREATE FUNCTION public.play_connect_four_move(
  p_match_id uuid,
  p_column integer,
  p_expected_turn integer
)
RETURNS TABLE (
  match_id uuid,
  couple_id uuid,
  game_key text,
  player_one_id uuid,
  player_two_id uuid,
  board jsonb,
  current_turn uuid,
  status text,
  winner_id uuid,
  is_draw boolean,
  turn_number integer,
  created_at timestamptz,
  updated_at timestamptz,
  finished_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_game public.couple_game_matches%ROWTYPE;
  v_couple_status text;
  v_mark integer;
  v_row integer := -1;
  v_candidate integer;
  v_index integer;
  v_direction integer;
  v_dx integer;
  v_dy integer;
  v_sign integer;
  v_x integer;
  v_y integer;
  v_count integer;
  v_winner_id uuid;
  v_is_draw boolean := false;
  v_next_turn uuid;
  v_next_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_column < 0 OR p_column > 6 THEN
    RAISE EXCEPTION 'invalid_column' USING ERRCODE = 'check_violation';
  END IF;

  SELECT g.*
    INTO v_game
  FROM public.couple_game_matches AS g
  WHERE g.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT c.status
    INTO v_couple_status
  FROM public.couples AS c
  WHERE c.id = v_game.couple_id;

  IF v_couple_status IS DISTINCT FROM 'active'
     OR NOT EXISTS (
       SELECT 1
       FROM public.couple_members AS m
       WHERE m.couple_id = v_game.couple_id
         AND m.user_id = v_user_id
         AND m.ended_at IS NULL
     ) THEN
    RAISE EXCEPTION 'not_current_couple_member' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'match_already_finished' USING ERRCODE = 'check_violation';
  END IF;

  IF v_game.current_turn <> v_user_id THEN
    RAISE EXCEPTION 'not_your_turn' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_game.turn_number <> p_expected_turn THEN
    RAISE EXCEPTION 'stale_turn' USING ERRCODE = 'serialization_failure';
  END IF;

  v_mark := CASE WHEN v_game.player_one_id = v_user_id THEN 1 ELSE 2 END;

  FOR v_candidate IN 0..5 LOOP
    v_index := (v_candidate * 7) + p_column;
    IF (v_game.board ->> v_index)::integer = 0 THEN
      v_row := v_candidate;
      EXIT;
    END IF;
  END LOOP;

  IF v_row = -1 THEN
    RAISE EXCEPTION 'column_full' USING ERRCODE = 'check_violation';
  END IF;

  v_game.board := pg_catalog.jsonb_set(
    v_game.board,
    ARRAY[((v_row * 7) + p_column)::text],
    pg_catalog.to_jsonb(v_mark),
    false
  );

  FOR v_direction IN 1..4 LOOP
    CASE v_direction
      WHEN 1 THEN v_dx := 1; v_dy := 0;
      WHEN 2 THEN v_dx := 0; v_dy := 1;
      WHEN 3 THEN v_dx := 1; v_dy := 1;
      ELSE v_dx := 1; v_dy := -1;
    END CASE;

    v_count := 1;

    FOREACH v_sign IN ARRAY ARRAY[-1, 1] LOOP
      v_x := p_column + (v_dx * v_sign);
      v_y := v_row + (v_dy * v_sign);

      WHILE v_x BETWEEN 0 AND 6 AND v_y BETWEEN 0 AND 5 LOOP
        v_index := (v_y * 7) + v_x;
        IF (v_game.board ->> v_index)::integer = v_mark THEN
          v_count := v_count + 1;
          v_x := v_x + (v_dx * v_sign);
          v_y := v_y + (v_dy * v_sign);
        ELSE
          EXIT;
        END IF;
      END LOOP;
    END LOOP;

    IF v_count >= 4 THEN
      v_winner_id := v_user_id;
      EXIT;
    END IF;
  END LOOP;

  IF v_winner_id IS NULL THEN
    SELECT NOT EXISTS (
      SELECT 1
      FROM pg_catalog.generate_series(0, 41) AS cells(position)
      WHERE (v_game.board ->> cells.position)::integer = 0
    )
    INTO v_is_draw;
  END IF;

  v_next_status := CASE
    WHEN v_winner_id IS NOT NULL OR v_is_draw THEN 'finished'
    ELSE 'active'
  END;

  v_next_turn := CASE
    WHEN v_next_status = 'finished' THEN v_user_id
    WHEN v_user_id = v_game.player_one_id THEN v_game.player_two_id
    ELSE v_game.player_one_id
  END;

  UPDATE public.couple_game_matches AS g
  SET board = v_game.board,
      current_turn = v_next_turn,
      status = v_next_status,
      winner_id = v_winner_id,
      is_draw = v_is_draw,
      turn_number = v_game.turn_number + 1,
      updated_at = pg_catalog.now(),
      finished_at = CASE
        WHEN v_next_status = 'finished' THEN pg_catalog.now()
        ELSE NULL
      END
  WHERE g.id = p_match_id;

  RETURN QUERY
  SELECT g.id, g.couple_id, g.game_key, g.player_one_id, g.player_two_id,
         g.board, g.current_turn, g.status, g.winner_id, g.is_draw,
         g.turn_number, g.created_at, g.updated_at, g.finished_at
  FROM public.couple_game_matches AS g
  WHERE g.id = p_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_connect_four_match(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.play_connect_four_move(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_connect_four_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_connect_four_move(uuid, integer, integer) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_game_matches;

COMMENT ON TABLE public.couple_game_matches IS
  'Partidas competitivas de dois jogadores. O estado só é alterado pelas RPCs validadas no servidor.';

COMMIT;
