-- Sinalização efêmera de chamadas: somente integrantes atuais de um casal ativo.
-- Os pacotes de áudio/vídeo nunca passam pelo banco; o Realtime carrega apenas
-- ofertas/respostas SDP e o estado básico da chamada entre os dois clientes.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_use_couple_calls(p_couple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.couples AS c
    JOIN public.couple_members AS m
      ON m.couple_id = c.id
    WHERE c.id = p_couple_id
      AND c.status = 'active'
      AND m.user_id = (SELECT auth.uid())
      AND m.ended_at IS NULL
      AND (
        SELECT pg_catalog.count(*)
        FROM public.couple_members AS current_member
        WHERE current_member.couple_id = c.id
          AND current_member.ended_at IS NULL
      ) = 2
  );
$$;

REVOKE ALL ON FUNCTION public.can_use_couple_calls(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_couple_calls(uuid) TO authenticated;

DROP POLICY IF EXISTS morados_couple_call_broadcast_read ON realtime.messages;
CREATE POLICY morados_couple_call_broadcast_read
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'broadcast'
    AND public.can_use_couple_calls(
      CASE
        WHEN (SELECT realtime.topic()) ~ '^morados-call:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN substring((SELECT realtime.topic()) FROM 14)::uuid
        ELSE NULL
      END
    )
  );

DROP POLICY IF EXISTS morados_couple_call_broadcast_write ON realtime.messages;
CREATE POLICY morados_couple_call_broadcast_write
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND public.can_use_couple_calls(
      CASE
        WHEN (SELECT realtime.topic()) ~ '^morados-call:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN substring((SELECT realtime.topic()) FROM 14)::uuid
        ELSE NULL
      END
    )
  );

COMMIT;
