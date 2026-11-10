BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL
     OR pg_catalog.to_regprocedure('public.can_view_couple(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples, couple_members ou can_view_couple ausente';
  END IF;

  IF pg_catalog.to_regclass('public.couple_memories') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_memories já existe; revisar antes de continuar';
  END IF;

  IF pg_catalog.to_regprocedure('public.couple_memories_before_update()') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: função couple_memories_before_update já existe';
  END IF;
END;
$preflight$;

CREATE TABLE public.couple_memories (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  couple_id uuid NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  visibility text NOT NULL CHECK (visibility IN ('private', 'shared')),
  title text NULL,
  body text NOT NULL,
  memory_date date NOT NULL DEFAULT ((pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT couple_memories_scope_chk CHECK (
    (visibility = 'private' AND couple_id IS NULL)
    OR
    (visibility = 'shared' AND couple_id IS NOT NULL)
  ),
  CONSTRAINT couple_memories_title_length_chk CHECK (
    title IS NULL OR pg_catalog.length(pg_catalog.btrim(title)) BETWEEN 1 AND 120
  ),
  CONSTRAINT couple_memories_body_length_chk CHECK (
    pg_catalog.length(pg_catalog.btrim(body)) BETWEEN 1 AND 5000
  )
);

CREATE INDEX couple_memories_owner_date_idx
  ON public.couple_memories (owner_id, memory_date DESC, created_at DESC);

CREATE INDEX couple_memories_couple_date_idx
  ON public.couple_memories (couple_id, memory_date DESC, created_at DESC)
  WHERE visibility = 'shared';

ALTER TABLE public.couple_memories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_memories FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.couple_memories TO authenticated;
GRANT ALL ON TABLE public.couple_memories TO service_role;

CREATE POLICY couple_memories_select_owner_or_active_partner
  ON public.couple_memories
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (
      visibility = 'shared'
      AND couple_id IS NOT NULL
      AND public.can_view_couple(couple_id)
      AND EXISTS (
        SELECT 1
        FROM public.couple_members AS m
        JOIN public.couples AS c ON c.id = m.couple_id
        WHERE m.couple_id = couple_memories.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
    )
  );

CREATE POLICY couple_memories_insert_owner_scope
  ON public.couple_memories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      (visibility = 'private' AND couple_id IS NULL)
      OR (
        visibility = 'shared'
        AND couple_id IS NOT NULL
        AND public.can_view_couple(couple_id)
        AND EXISTS (
          SELECT 1
          FROM public.couple_members AS m
          JOIN public.couples AS c ON c.id = m.couple_id
          WHERE m.couple_id = couple_memories.couple_id
            AND m.user_id = (SELECT auth.uid())
            AND m.ended_at IS NULL
            AND c.status = 'active'
        )
      )
    )
  );

CREATE POLICY couple_memories_update_owner_scope
  ON public.couple_memories
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      (visibility = 'private' AND couple_id IS NULL)
      OR (
        visibility = 'shared'
        AND couple_id IS NOT NULL
        AND public.can_view_couple(couple_id)
        AND EXISTS (
          SELECT 1
          FROM public.couple_members AS m
          JOIN public.couples AS c ON c.id = m.couple_id
          WHERE m.couple_id = couple_memories.couple_id
            AND m.user_id = (SELECT auth.uid())
            AND m.ended_at IS NULL
            AND c.status = 'active'
        )
      )
    )
  );

CREATE POLICY couple_memories_delete_owner
  ON public.couple_memories
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE FUNCTION public.couple_memories_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'memory identity fields are immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.couple_memories_before_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER couple_memories_before_update
  BEFORE UPDATE ON public.couple_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.couple_memories_before_update();

COMMENT ON TABLE public.couple_memories IS
  'Text memories. Private records are visible only to their owner; shared records are visible to current members of the active couple. The creator alone may edit or delete a record.';

COMMENT ON COLUMN public.couple_memories.visibility IS
  'Initial visibility modes: private (owner only) and shared (current members of the active couple).';

COMMIT;
