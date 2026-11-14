CREATE OR REPLACE FUNCTION public.create_connect_four_match(p_couple_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_status text; v_members uuid[]; v_partner_id uuid; v_existing_id uuid; v_match_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT c.status INTO v_status FROM public.couples AS c WHERE c.id = p_couple_id FOR UPDATE;
  IF NOT FOUND OR v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'couple_not_active' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT pg_catalog.array_agg(m.user_id ORDER BY m.joined_at, m.user_id) INTO v_members FROM public.couple_members AS m WHERE m.couple_id = p_couple_id AND m.ended_at IS NULL;
  IF pg_catalog.coalesce(pg_catalog.array_length(v_members, 1), 0) <> 2 OR NOT (v_user_id = ANY(v_members)) THEN
    RAISE EXCEPTION 'invalid_couple_members' USING ERRCODE = 'insufficient_privilege'; END IF;
  RETURN NULL;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.create_connect_four_match(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.play_connect_four_move(p_match_id uuid, p_column integer, p_expected_turn integer)
 RETURNS TABLE(match_id uuid, couple_id uuid, game_key text, player_one_id uuid, player_two_id uuid, board jsonb, current_turn uuid, status text, winner_id uuid, is_draw boolean, turn_number integer, created_at timestamptz, updated_at timestamptz, finished_at timestamptz) LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
