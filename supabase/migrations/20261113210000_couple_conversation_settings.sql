BEGIN;

CREATE TABLE IF NOT EXISTS public.couple_conversation_settings (
  couple_id uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE IF NOT EXISTS public.couple_conversation_member_settings (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (couple_id, user_id)
);

ALTER TABLE public.couple_conversation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_conversation_member_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_conversation_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.couple_conversation_member_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.couple_conversation_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.couple_conversation_member_settings TO authenticated;
GRANT ALL ON TABLE public.couple_conversation_settings TO service_role;
GRANT ALL ON TABLE public.couple_conversation_member_settings TO service_role;

DROP POLICY IF EXISTS couple_conversation_settings_select_members ON public.couple_conversation_settings;
CREATE POLICY couple_conversation_settings_select_members
  ON public.couple_conversation_settings
  FOR SELECT TO authenticated
  USING (public.can_view_couple(couple_id));

DROP POLICY IF EXISTS couple_conversation_settings_write_current_members ON public.couple_conversation_settings;
CREATE POLICY couple_conversation_settings_write_current_members
  ON public.couple_conversation_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_conversation_settings.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  )
  WITH CHECK (
    updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_conversation_settings.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS couple_conversation_member_settings_select_own ON public.couple_conversation_member_settings;
CREATE POLICY couple_conversation_member_settings_select_own
  ON public.couple_conversation_member_settings
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.can_view_couple(couple_id)
  );

DROP POLICY IF EXISTS couple_conversation_member_settings_write_own ON public.couple_conversation_member_settings;
CREATE POLICY couple_conversation_member_settings_write_own
  ON public.couple_conversation_member_settings
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.can_view_couple(couple_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.couple_members AS m
      JOIN public.couples AS c ON c.id = m.couple_id
      WHERE m.couple_id = couple_conversation_member_settings.couple_id
        AND m.user_id = (SELECT auth.uid())
        AND m.ended_at IS NULL
        AND c.status = 'active'
    )
  );

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'couple_conversation_settings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_conversation_settings;
    END IF;
  END IF;
END;
$publication$;

COMMENT ON TABLE public.couple_conversation_settings IS
  'Aparência compartilhada da conversa privada de cada casal.';
COMMENT ON TABLE public.couple_conversation_member_settings IS
  'Preferências individuais de notificação da conversa para cada integrante.';

COMMIT;
