-- Partidas online genéricas para todos os jogos do Morados.
-- Corrige create_connect_four_match (versão ativa usava pg_catalog.coalesce, que não existe -> 42883).
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couple_game_matches') IS NULL THEN
    RAISE EXCEPTION 'preflight: couple_game_matches ausente';
  END IF;
  IF pg_catalog.to_regclass('public.couple_game_private_state') IS NOT NULL
     OR pg_catalog.to_regclass('public.couple_game_piles') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: tabelas de estado privado já existem';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
             AND table_name='couple_game_matches' AND column_name IN ('mode','state','version')) THEN
    RAISE EXCEPTION 'preflight: colunas genéricas já existem';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint
      WHERE conrelid = 'public.couple_game_matches'::regclass
        AND conname IN ('couple_game_matches_game_key_check','couple_game_matches_board_check',
                        'couple_game_matches_turn_number_check','couple_game_matches_status_check',
                        'couple_game_matches_outcome_chk')) <> 5 THEN
    RAISE EXCEPTION 'preflight: constraints esperadas de couple_game_matches divergem';
  END IF;
  IF pg_catalog.to_regclass('public.couple_game_matches_one_active_per_couple_uidx') IS NULL THEN
    RAISE EXCEPTION 'preflight: índice de partida ativa esperado ausente';
  END IF;
END;
$preflight$;

ALTER TABLE public.couple_game_matches
  DROP CONSTRAINT couple_game_matches_game_key_check,
  DROP CONSTRAINT couple_game_matches_board_check,
  DROP CONSTRAINT couple_game_matches_turn_number_check,
  DROP CONSTRAINT couple_game_matches_status_check,
  DROP CONSTRAINT couple_game_matches_outcome_chk;

ALTER TABLE public.couple_game_matches
  ADD COLUMN mode text NOT NULL DEFAULT 'competitive',
  ADD COLUMN state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN version integer NOT NULL DEFAULT 0,
  ALTER COLUMN board SET DEFAULT '[]'::jsonb;

ALTER TABLE public.couple_game_matches
  ADD CONSTRAINT couple_game_matches_game_key_check CHECK (game_key IN ('connect-four','checkers','this-or-that','daily-challenge','investigation','investigation-train','chess','battleship','domino','truco','quiz','escape-room','island-survival')),
  ADD CONSTRAINT couple_game_matches_mode_check CHECK (mode IN ('competitive','cooperative')),
  ADD CONSTRAINT couple_game_matches_state_check CHECK (pg_catalog.jsonb_typeof(state) = 'object'),
  ADD CONSTRAINT couple_game_matches_version_check CHECK (version >= 0),
  ADD CONSTRAINT couple_game_matches_board_check CHECK (
    pg_catalog.jsonb_typeof(board) = 'array'
    AND (game_key <> 'connect-four' OR pg_catalog.jsonb_array_length(board) = 42)),
  ADD CONSTRAINT couple_game_matches_turn_number_check CHECK (
    turn_number >= 0 AND (game_key <> 'connect-four' OR turn_number <= 42)),
  ADD CONSTRAINT couple_game_matches_status_check CHECK (status IN ('active','finished','abandoned')),
  ADD CONSTRAINT couple_game_matches_outcome_chk CHECK (
    (status = 'active' AND winner_id IS NULL AND NOT is_draw AND finished_at IS NULL)
    OR (status = 'finished' AND finished_at IS NOT NULL
        AND NOT (winner_id IS NOT NULL AND is_draw)
        AND (game_key <> 'connect-four' OR winner_id IS NOT NULL OR is_draw))
    OR (status = 'abandoned' AND finished_at IS NOT NULL AND winner_id IS NULL AND NOT is_draw));

DROP INDEX public.couple_game_matches_one_active_per_couple_uidx;
CREATE UNIQUE INDEX couple_game_matches_one_active_per_game_uidx
  ON public.couple_game_matches (couple_id, game_key) WHERE status = 'active';

-- Estado privado por pessoa (mão de cartas, frota secreta). Só o titular lê.
CREATE TABLE public.couple_game_private_state (
  match_id uuid NOT NULL REFERENCES public.couple_game_matches(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_catalog.jsonb_typeof(data) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (match_id, user_id)
);
REVOKE ALL ON TABLE public.couple_game_private_state FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.couple_game_private_state TO authenticated;
GRANT ALL ON TABLE public.couple_game_private_state TO service_role;
ALTER TABLE public.couple_game_private_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY couple_game_private_state_select_own
  ON public.couple_game_private_state FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Monte embaralhado no servidor (peças/cartas ainda não distribuídas). Ninguém lê diretamente.
CREATE TABLE public.couple_game_piles (
  match_id uuid PRIMARY KEY REFERENCES public.couple_game_matches(id) ON DELETE RESTRICT,
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (pg_catalog.jsonb_typeof(items) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);
REVOKE ALL ON TABLE public.couple_game_piles FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.couple_game_piles TO service_role;
ALTER TABLE public.couple_game_piles ENABLE ROW LEVEL SECURITY;

-- Valida membro atual de casal ativo e devolve a partida travada.
CREATE FUNCTION public.game_lock_match_for_member(p_match_id uuid)
RETURNS public.couple_game_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_game public.couple_game_matches%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT g.* INTO v_game FROM public.couple_game_matches AS g WHERE g.id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.couples AS c WHERE c.id = v_game.couple_id AND c.status = 'active')
     OR NOT EXISTS (SELECT 1 FROM public.couple_members AS m
                    WHERE m.couple_id = v_game.couple_id AND m.user_id = v_uid AND m.ended_at IS NULL) THEN
    RAISE EXCEPTION 'not_current_couple_member' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'match_already_finished' USING ERRCODE = 'check_violation';
  END IF;
  IF v_game.game_key = 'connect-four' THEN
    RAISE EXCEPTION 'wrong_game' USING ERRCODE = 'check_violation';
  END IF;
  RETURN v_game;
END;
$$;

CREATE FUNCTION public.start_game_match(p_couple_id uuid, p_game_key text, p_mode text)
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
  IF p_game_key NOT IN ('connect-four','checkers','this-or-that','daily-challenge','investigation','investigation-train','chess','battleship','domino','truco','quiz','escape-room','island-survival') OR p_game_key = 'connect-four' THEN
    RAISE EXCEPTION 'invalid_game' USING ERRCODE = 'check_violation';
  END IF;
  IF p_mode NOT IN ('competitive','cooperative') THEN
    RAISE EXCEPTION 'invalid_mode' USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.status INTO v_status FROM public.couples AS c WHERE c.id = p_couple_id FOR UPDATE;
  IF NOT FOUND OR v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'couple_not_active' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT pg_catalog.count(*) INTO v_members FROM public.couple_members AS m
   WHERE m.couple_id = p_couple_id AND m.ended_at IS NULL;
  IF v_members <> 2 OR NOT EXISTS (SELECT 1 FROM public.couple_members AS m
       WHERE m.couple_id = p_couple_id AND m.user_id = v_uid AND m.ended_at IS NULL) THEN
    RAISE EXCEPTION 'invalid_couple_members' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT g.id INTO v_id FROM public.couple_game_matches AS g
   WHERE g.couple_id = p_couple_id AND g.game_key = p_game_key AND g.status = 'active';
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT m.user_id INTO v_partner FROM public.couple_members AS m
   WHERE m.couple_id = p_couple_id AND m.ended_at IS NULL AND m.user_id <> v_uid;

  INSERT INTO public.couple_game_matches
    (couple_id, game_key, mode, player_one_id, player_two_id, board, current_turn, state, version)
  VALUES (p_couple_id, p_game_key, p_mode, v_uid, v_partner, '[]'::jsonb, v_uid, '{}'::jsonb, 0)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Grava novo estado compartilhado. Valida versão esperada (concorrência) e,
-- em jogos competitivos, que é a vez de quem chama. Regras detalhadas ficam no cliente.
CREATE FUNCTION public.submit_game_state(
  p_match_id uuid,
  p_expected_version integer,
  p_state jsonb,
  p_next_turn_seat integer DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_winner_seat integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_game public.couple_game_matches%ROWTYPE;
  v_next_turn uuid;
  v_winner uuid;
BEGIN
  v_game := public.game_lock_match_for_member(p_match_id);

  IF v_game.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale_version' USING ERRCODE = 'serialization_failure';
  END IF;
  IF v_game.mode = 'competitive' AND v_game.current_turn <> v_uid THEN
    RAISE EXCEPTION 'not_your_turn' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_state IS NULL OR pg_catalog.jsonb_typeof(p_state) <> 'object'
     OR pg_catalog.pg_column_size(p_state) > 262144 THEN
    RAISE EXCEPTION 'invalid_state' USING ERRCODE = 'check_violation';
  END IF;
  IF p_next_turn_seat IS NOT NULL AND p_next_turn_seat NOT IN (0, 1) THEN
    RAISE EXCEPTION 'invalid_seat' USING ERRCODE = 'check_violation';
  END IF;
  IF p_outcome IS NOT NULL AND p_outcome NOT IN ('win','draw','complete') THEN
    RAISE EXCEPTION 'invalid_outcome' USING ERRCODE = 'check_violation';
  END IF;

  v_next_turn := CASE p_next_turn_seat
    WHEN 0 THEN v_game.player_one_id
    WHEN 1 THEN v_game.player_two_id
    ELSE v_game.current_turn END;

  IF p_outcome = 'win' THEN
    IF p_winner_seat NOT IN (0, 1) THEN
      RAISE EXCEPTION 'invalid_winner' USING ERRCODE = 'check_violation';
    END IF;
    v_winner := CASE p_winner_seat WHEN 0 THEN v_game.player_one_id ELSE v_game.player_two_id END;
  END IF;

  UPDATE public.couple_game_matches AS g
     SET state = p_state,
         version = g.version + 1,
         turn_number = g.turn_number + 1,
         current_turn = v_next_turn,
         status = CASE WHEN p_outcome IS NULL THEN 'active' ELSE 'finished' END,
         winner_id = v_winner,
         is_draw = (p_outcome = 'draw'),
         finished_at = CASE WHEN p_outcome IS NULL THEN NULL ELSE pg_catalog.now() END,
         updated_at = pg_catalog.now()
   WHERE g.id = p_match_id;

  RETURN v_game.version + 1;
END;
$$;

CREATE FUNCTION public.abandon_game_match(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game public.couple_game_matches%ROWTYPE;
BEGIN
  v_game := public.game_lock_match_for_member(p_match_id);
  UPDATE public.couple_game_matches AS g
     SET status = 'abandoned', finished_at = pg_catalog.now(), updated_at = pg_catalog.now(),
         version = g.version + 1
   WHERE g.id = v_game.id;
  RETURN true;
END;
$$;

-- Substitui o estado privado de quem chama (nunca o de outra pessoa).
CREATE FUNCTION public.set_game_private_state(p_match_id uuid, p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_game public.couple_game_matches%ROWTYPE;
BEGIN
  v_game := public.game_lock_match_for_member(p_match_id);
  IF p_data IS NULL OR pg_catalog.jsonb_typeof(p_data) <> 'object'
     OR pg_catalog.pg_column_size(p_data) > 65536 THEN
    RAISE EXCEPTION 'invalid_state' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.couple_game_private_state AS p (match_id, user_id, data, updated_at)
  VALUES (v_game.id, v_uid, p_data, pg_catalog.now())
  ON CONFLICT (match_id, user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = pg_catalog.now();
  RETURN p_data;
END;
$$;

-- Novo baralho/monte embaralhado no servidor; limpa as mãos privadas da partida.
CREATE FUNCTION public.reset_game_pile(p_match_id uuid, p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game public.couple_game_matches%ROWTYPE;
  v_shuffled jsonb;
BEGIN
  v_game := public.game_lock_match_for_member(p_match_id);
  IF v_game.game_key NOT IN ('domino','truco') THEN
    RAISE EXCEPTION 'invalid_game' USING ERRCODE = 'check_violation';
  END IF;
  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) <> 'array'
     OR pg_catalog.jsonb_array_length(p_items) > 64 THEN
    RAISE EXCEPTION 'invalid_pile' USING ERRCODE = 'check_violation';
  END IF;
  SELECT pg_catalog.jsonb_agg(e.value ORDER BY pg_catalog.random())
    INTO v_shuffled
    FROM pg_catalog.jsonb_array_elements(p_items) AS e;
  INSERT INTO public.couple_game_piles AS p (match_id, items, updated_at)
  VALUES (v_game.id, COALESCE(v_shuffled, '[]'::jsonb), pg_catalog.now())
  ON CONFLICT (match_id) DO UPDATE SET items = EXCLUDED.items, updated_at = pg_catalog.now();
  UPDATE public.couple_game_private_state AS s SET data = '{}'::jsonb, updated_at = pg_catalog.now()
   WHERE s.match_id = v_game.id;
  RETURN pg_catalog.jsonb_array_length(COALESCE(v_shuffled, '[]'::jsonb));
END;
$$;

-- Compra p_count itens do monte. p_to_hand=true acrescenta à mão privada de quem chama
-- e devolve o estado privado; false devolve os itens (ex.: vira do truco, pública).
CREATE FUNCTION public.draw_game_pile(p_match_id uuid, p_count integer, p_deal_id text, p_to_hand boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_game public.couple_game_matches%ROWTYPE;
  v_items jsonb;
  v_taken jsonb;
  v_rest jsonb;
  v_data jsonb;
BEGIN
  v_game := public.game_lock_match_for_member(p_match_id);
  IF p_count < 1 OR p_count > 10 THEN
    RAISE EXCEPTION 'invalid_count' USING ERRCODE = 'check_violation';
  END IF;
  SELECT p.items INTO v_items FROM public.couple_game_piles AS p WHERE p.match_id = v_game.id FOR UPDATE;
  IF v_items IS NULL OR pg_catalog.jsonb_array_length(v_items) < p_count THEN
    RAISE EXCEPTION 'pile_empty' USING ERRCODE = 'check_violation';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(e.value ORDER BY e.ordinality) FILTER (WHERE e.ordinality <= p_count), '[]'::jsonb),
         COALESCE(pg_catalog.jsonb_agg(e.value ORDER BY e.ordinality) FILTER (WHERE e.ordinality > p_count), '[]'::jsonb)
    INTO v_taken, v_rest
    FROM pg_catalog.jsonb_array_elements(v_items) WITH ORDINALITY AS e(value, ordinality);
  UPDATE public.couple_game_piles AS p SET items = v_rest, updated_at = pg_catalog.now() WHERE p.match_id = v_game.id;

  IF NOT p_to_hand THEN
    RETURN v_taken;
  END IF;

  SELECT s.data INTO v_data FROM public.couple_game_private_state AS s
   WHERE s.match_id = v_game.id AND s.user_id = v_uid FOR UPDATE;
  v_data := COALESCE(v_data, '{}'::jsonb);
  IF p_deal_id IS NOT NULL AND (v_data ->> 'dealId') IS DISTINCT FROM p_deal_id THEN
    v_data := pg_catalog.jsonb_build_object('dealId', p_deal_id, 'hand', '[]'::jsonb);
  END IF;
  v_data := pg_catalog.jsonb_set(v_data, '{hand}',
              COALESCE(v_data -> 'hand', '[]'::jsonb) || v_taken, true);
  INSERT INTO public.couple_game_private_state AS s (match_id, user_id, data, updated_at)
  VALUES (v_game.id, v_uid, v_data, pg_catalog.now())
  ON CONFLICT (match_id, user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = pg_catalog.now();
  RETURN v_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_connect_four_match(p_couple_id uuid)
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
    AND g.status = 'active'
    AND g.game_key = 'connect-four';

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

  IF p_column IS NULL OR p_column < 0 OR p_column > 6 THEN
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

  IF v_game.game_key IS DISTINCT FROM 'connect-four' THEN
    RAISE EXCEPTION 'wrong_game' USING ERRCODE = 'check_violation';
  END IF;

  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'match_already_finished' USING ERRCODE = 'check_violation';
  END IF;

  IF v_game.current_turn <> v_user_id THEN
    RAISE EXCEPTION 'not_your_turn' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_expected_turn IS NULL OR v_game.turn_number <> p_expected_turn THEN
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

REVOKE ALL ON FUNCTION public.game_lock_match_for_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_game_match(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_game_state(uuid, integer, jsonb, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.abandon_game_match(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_game_private_state(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_game_pile(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.draw_game_pile(uuid, integer, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_connect_four_match(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.play_connect_four_move(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_match(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_game_state(uuid, integer, jsonb, integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_game_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_game_private_state(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_game_pile(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_game_pile(uuid, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_connect_four_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_connect_four_move(uuid, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
