BEGIN;

DO $publication$
BEGIN
  IF pg_catalog.to_regclass('public.couple_messages') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_messages ausente; aplicar a migration de mensagens primeiro';
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
      AND tablename = 'couple_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_messages;
  END IF;
END;
$publication$;

COMMIT;
