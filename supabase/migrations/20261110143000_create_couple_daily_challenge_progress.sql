BEGIN;

-- O progresso só pode ser gravado depois da fundação de casais e membership.
DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL
     OR pg_catalog.to_regprocedure('public.can_view_couple(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples, couple_members ou can_view_couple ausente';
  END IF;

  IF pg_catalog.to_regclass('public.couple_daily_challenge_progress') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_daily_challenge_progress já existe; revisar antes de continuar';
  END IF;
END;
$preflight$;

CREATE TABLE public.couple_daily_challenge_progress (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  challenge_date date NOT NULL,
  challenge_id text NOT NULL
    CHECK (challenge_id ~ '^[a-z0-9-]{1,64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  completed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (couple_id, challenge_date, user_id)
);

CREATE INDEX couple_daily_challenge_progress_history_idx
  ON public.couple_daily_challenge_progress (couple_id, challenge_date DESC);

ALTER TABLE public.couple_daily_challenge_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_daily_challenge_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.couple_daily_challenge_progress TO authenticated;
GRANT ALL ON TABLE public.couple_daily_challenge_progress TO service_role;

-- O casal pode consultar o próprio histórico, inclusive após o encerramento do vínculo.
CREATE POLICY couple_daily_challenge_progress_select_members
  ON public.couple_daily_challenge_progress
  FOR SELECT
  TO authenticated
  USING (public.can_view_couple(couple_id));

-- Cada integrante registra apenas a própria conclusão, no dia atual de São Paulo,
-- enquanto o casal estiver ativo. Não há UPDATE nem DELETE para preservar o histórico.
CREATE POLICY couple_daily_challenge_progress_insert_own
  ON public.couple_daily_challenge_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND challenge_date = (
      (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date
    )
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_daily_challenge_progress.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

COMMENT ON TABLE public.couple_daily_challenge_progress IS
  'Conclusões individuais e imutáveis dos desafios diários compartilhados pelo casal.';

COMMIT;
