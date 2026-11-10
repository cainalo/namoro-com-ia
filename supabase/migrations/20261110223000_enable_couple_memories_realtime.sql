BEGIN;

DO $publication$
BEGIN
  IF pg_catalog.to_regclass('public.couple_memories') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_memories ausente; aplicar a migration de memórias primeiro';
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
      AND tablename = 'couple_memories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_memories;
  END IF;
END;
$publication$;

COMMIT;
