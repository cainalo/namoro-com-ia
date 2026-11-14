BEGIN;

GRANT UPDATE, DELETE ON TABLE public.couple_messages TO authenticated;

DROP POLICY IF EXISTS couple_messages_update_sender ON public.couple_messages;
CREATE POLICY couple_messages_update_sender
  ON public.couple_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    AND public.can_view_couple(couple_id)
  )
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

DROP POLICY IF EXISTS couple_messages_delete_sender ON public.couple_messages;
DROP POLICY IF EXISTS couple_messages_delete_members ON public.couple_messages;
CREATE POLICY couple_messages_delete_members
  ON public.couple_messages
  FOR DELETE
  TO authenticated
  USING (public.can_view_couple(couple_id));

COMMENT ON POLICY couple_messages_update_sender ON public.couple_messages IS
  'Permite que cada pessoa edite somente as próprias mensagens em um casal ativo.';
COMMENT ON POLICY couple_messages_delete_members ON public.couple_messages IS
  'Permite que qualquer participante atual do casal exclua mensagens da conversa privada.';

COMMIT;
