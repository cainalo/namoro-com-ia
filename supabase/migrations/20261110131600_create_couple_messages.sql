BEGIN;

-- Falha antes de criar qualquer objeto se a fundação do casal não estiver presente.
DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL
     OR pg_catalog.to_regprocedure('public.can_view_couple(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples, couple_members ou can_view_couple ausente';
  END IF;

  IF pg_catalog.to_regclass('public.couple_messages') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_messages já existe; revisar antes de continuar';
  END IF;
END;
$preflight$;

CREATE TABLE public.couple_messages (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT couple_messages_body_length_chk
    CHECK (pg_catalog.length(pg_catalog.btrim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX couple_messages_couple_created_idx
  ON public.couple_messages (couple_id, created_at DESC, id DESC);

ALTER TABLE public.couple_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.couple_messages TO authenticated;
GRANT ALL ON TABLE public.couple_messages TO service_role;

-- Integrantes atuais e antigos podem consultar o histórico do próprio casal.
CREATE POLICY couple_messages_select_members
  ON public.couple_messages
  FOR SELECT
  TO authenticated
  USING (public.can_view_couple(couple_id));

-- Só um integrante atual pode enviar, em um casal ativo e em seu próprio nome.
CREATE POLICY couple_messages_insert_current_member
  ON public.couple_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_messages.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

COMMENT ON TABLE public.couple_messages IS
  'Mensagens de texto privadas do casal. Integrantes consultam o histórico; somente integrantes atuais de um casal ativo podem inserir.';

COMMIT;
