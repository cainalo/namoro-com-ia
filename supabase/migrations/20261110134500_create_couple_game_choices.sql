BEGIN;

-- A fundação do casal deve existir antes de receber respostas de jogos.
DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL
     OR pg_catalog.to_regprocedure('public.can_view_couple(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples, couple_members ou can_view_couple ausente';
  END IF;

  IF pg_catalog.to_regclass('public.couple_game_choices') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_game_choices já existe; revisar antes de continuar';
  END IF;
END;
$preflight$;

CREATE TABLE public.couple_game_choices (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  question_id text NOT NULL
    CHECK (question_id ~ '^[a-z0-9-]{1,64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  choice text NOT NULL CHECK (choice IN ('a', 'b')),
  answered_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (couple_id, question_id, user_id)
);

ALTER TABLE public.couple_game_choices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_game_choices FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.couple_game_choices TO authenticated;
GRANT ALL ON TABLE public.couple_game_choices TO service_role;

-- Integrantes atuais e antigos podem consultar o histórico de escolhas do casal.
CREATE POLICY couple_game_choices_select_members
  ON public.couple_game_choices
  FOR SELECT
  TO authenticated
  USING (public.can_view_couple(couple_id));

-- Cada pessoa pode salvar ou alterar somente a própria escolha,
-- enquanto for integrante atual de um casal ativo.
CREATE POLICY couple_game_choices_insert_own
  ON public.couple_game_choices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_game_choices.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

CREATE POLICY couple_game_choices_update_own
  ON public.couple_game_choices
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_game_choices.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_game_choices.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

COMMENT ON TABLE public.couple_game_choices IS
  'Respostas individuais do jogo Isto ou Aquilo. Cada integrante altera somente as próprias escolhas.';

COMMIT;
