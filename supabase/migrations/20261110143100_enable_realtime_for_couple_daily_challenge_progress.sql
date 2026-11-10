BEGIN;

DO $publication$
BEGIN
  IF pg_catalog.to_regclass('public.couple_daily_challenge_progress') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_daily_challenge_progress ausente; aplicar a migration de progresso primeiro';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'preflight: publicação supabase_realtime não encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'couple_daily_challenge_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.couple_daily_challenge_progress;
  END IF;
END;
$publication$;

COMMIT;
