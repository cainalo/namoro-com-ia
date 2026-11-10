BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL
     OR pg_catalog.to_regprocedure('public.can_view_couple(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples, couple_members ou can_view_couple ausente';
  END IF;

  IF pg_catalog.to_regclass('public.couple_plan_events') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_plan_events já existe; revisar antes de continuar';
  END IF;

  IF pg_catalog.to_regprocedure('public.couple_plan_events_before_update()') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: função couple_plan_events_before_update já existe';
  END IF;
END;
$preflight$;

CREATE TABLE public.couple_plan_events (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  couple_id uuid NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  visibility text NOT NULL DEFAULT 'shared'
    CHECK (visibility IN ('private', 'shared')),
  title text NOT NULL,
  description text NULL,
  place text NULL,
  event_date date NOT NULL,
  all_day boolean NOT NULL DEFAULT true,
  start_time time without time zone NULL,
  end_time time without time zone NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT couple_plan_events_scope_chk CHECK (
    (visibility = 'private' AND couple_id IS NULL)
    OR
    (visibility = 'shared' AND couple_id IS NOT NULL)
  ),
  CONSTRAINT couple_plan_events_title_length_chk CHECK (
    pg_catalog.length(pg_catalog.btrim(title)) BETWEEN 1 AND 120
  ),
  CONSTRAINT couple_plan_events_description_length_chk CHECK (
    description IS NULL OR pg_catalog.length(pg_catalog.btrim(description)) BETWEEN 1 AND 2000
  ),
  CONSTRAINT couple_plan_events_place_length_chk CHECK (
    place IS NULL OR pg_catalog.length(pg_catalog.btrim(place)) BETWEEN 1 AND 120
  ),
  CONSTRAINT couple_plan_events_time_range_chk CHECK (
    (all_day = true AND start_time IS NULL AND end_time IS NULL)
    OR
    (all_day = false AND start_time IS NOT NULL AND (end_time IS NULL OR end_time > start_time))
  )
);

CREATE INDEX couple_plan_events_owner_date_idx
  ON public.couple_plan_events (owner_id, event_date, start_time);

CREATE INDEX couple_plan_events_couple_date_idx
  ON public.couple_plan_events (couple_id, event_date, start_time)
  WHERE visibility = 'shared';

ALTER TABLE public.couple_plan_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.couple_plan_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.couple_plan_events TO authenticated;
GRANT ALL ON TABLE public.couple_plan_events TO service_role;

CREATE POLICY couple_plan_events_select_owner_or_active_partner
  ON public.couple_plan_events
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
        WHERE m.couple_id = couple_plan_events.couple_id
          AND m.user_id = (SELECT auth.uid())
          AND m.ended_at IS NULL
          AND c.status = 'active'
      )
    )
  );

CREATE POLICY couple_plan_events_insert_owner_scope
  ON public.couple_plan_events
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
          WHERE m.couple_id = couple_plan_events.couple_id
            AND m.user_id = (SELECT auth.uid())
            AND m.ended_at IS NULL
            AND c.status = 'active'
        )
      )
    )
  );

CREATE POLICY couple_plan_events_update_owner_scope
  ON public.couple_plan_events
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
          WHERE m.couple_id = couple_plan_events.couple_id
            AND m.user_id = (SELECT auth.uid())
            AND m.ended_at IS NULL
            AND c.status = 'active'
        )
      )
    )
  );

CREATE POLICY couple_plan_events_delete_owner
  ON public.couple_plan_events
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE FUNCTION public.couple_plan_events_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'plan event identity fields are immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.couple_plan_events_before_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER couple_plan_events_before_update
  BEFORE UPDATE ON public.couple_plan_events
  FOR EACH ROW
  EXECUTE FUNCTION public.couple_plan_events_before_update();

COMMENT ON TABLE public.couple_plan_events IS
  'Calendar events. Private records are visible only to their owner; shared records are visible to current members of the active couple. Only the creator may edit or delete a record.';

COMMENT ON COLUMN public.couple_plan_events.visibility IS
  'Private: owner only. Shared: current members of the active couple.';

COMMIT;
