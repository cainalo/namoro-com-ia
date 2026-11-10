BEGIN;

DO $publication$
BEGIN
  IF pg_catalog.to_regclass('public.couple_plan_events') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_plan_events ausente; aplicar a migration de compromissos primeiro';
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
      AND tablename = 'couple_plan_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_plan_events;
  END IF;
END;
$publication$;

COMMIT;
