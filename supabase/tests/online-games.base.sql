CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated, anon;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
CREATE PUBLICATION supabase_realtime;
CREATE TABLE public.couples (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES auth.users(id), status text NOT NULL DEFAULT 'pending');
CREATE TABLE public.couple_members (couple_id uuid NOT NULL REFERENCES public.couples(id), user_id uuid NOT NULL REFERENCES auth.users(id), role text NOT NULL DEFAULT 'admin', joined_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, PRIMARY KEY (couple_id,user_id));
CREATE FUNCTION public.can_view_couple(p_couple_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.couple_members m WHERE m.couple_id = p_couple_id AND m.user_id = (SELECT auth.uid())); $$;
CREATE TABLE public.couple_game_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
 game_key text NOT NULL, player_one_id uuid NOT NULL REFERENCES auth.users(id), player_two_id uuid NOT NULL REFERENCES auth.users(id),
 board jsonb NOT NULL, current_turn uuid NOT NULL, status text NOT NULL DEFAULT 'active', winner_id uuid REFERENCES auth.users(id),
 is_draw boolean NOT NULL DEFAULT false, turn_number integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 CONSTRAINT couple_game_matches_board_check CHECK (((jsonb_typeof(board) = 'array'::text) AND (jsonb_array_length(board) = 42))),
 CONSTRAINT couple_game_matches_current_turn_chk CHECK (((current_turn = player_one_id) OR (current_turn = player_two_id))),
 CONSTRAINT couple_game_matches_distinct_players_chk CHECK ((player_one_id <> player_two_id)),
 CONSTRAINT couple_game_matches_game_key_check CHECK ((game_key = 'connect-four'::text)),
 CONSTRAINT couple_game_matches_outcome_chk CHECK ((((status = 'active'::text) AND (winner_id IS NULL) AND (NOT is_draw) AND (finished_at IS NULL)) OR ((status = 'finished'::text) AND (finished_at IS NOT NULL) AND (((winner_id IS NOT NULL) AND (NOT is_draw)) OR ((winner_id IS NULL) AND is_draw))))),
 CONSTRAINT couple_game_matches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'finished'::text]))),
 CONSTRAINT couple_game_matches_turn_number_check CHECK (((turn_number >= 0) AND (turn_number <= 42))),
 CONSTRAINT couple_game_matches_winner_chk CHECK (((winner_id IS NULL) OR ((winner_id = player_one_id) OR (winner_id = player_two_id))))
);
CREATE UNIQUE INDEX couple_game_matches_one_active_per_couple_uidx ON public.couple_game_matches (couple_id) WHERE status='active';
REVOKE ALL ON public.couple_game_matches FROM PUBLIC, anon, authenticated; GRANT SELECT ON public.couple_game_matches TO authenticated;
ALTER TABLE public.couple_game_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY couple_game_matches_select_members ON public.couple_game_matches FOR SELECT TO authenticated USING (public.can_view_couple(couple_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_game_matches;
INSERT INTO auth.users VALUES ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333');
INSERT INTO public.couples VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','active');
INSERT INTO public.couple_members(couple_id,user_id) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111'),('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222');
