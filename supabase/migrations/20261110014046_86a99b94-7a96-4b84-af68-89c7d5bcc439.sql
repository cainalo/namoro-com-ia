-- Etapa 2: couples e couple_members

CREATE TABLE IF NOT EXISTS public.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','archived')),
  relationship_started_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  archived_at timestamptz,
  CONSTRAINT couples_status_timestamps_chk CHECK (
    (status = 'pending' AND activated_at IS NULL AND archived_at IS NULL)
    OR (status = 'active' AND activated_at IS NOT NULL AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS couples_created_by_idx ON public.couples (created_by);

CREATE TABLE IF NOT EXISTS public.couple_members (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  PRIMARY KEY (couple_id, user_id),
  CONSTRAINT couple_members_ended_after_joined_chk CHECK (ended_at IS NULL OR ended_at >= joined_at)
);
-- Unicidade concorrente: uma relação atual por usuário; um admin atual por casal.
-- Sem índice parcial extra por couple_id: a PK já começa por couple_id.
CREATE UNIQUE INDEX IF NOT EXISTS couple_members_one_current_per_user_uidx
  ON public.couple_members (user_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS couple_members_one_current_admin_uidx
  ON public.couple_members (couple_id) WHERE role = 'admin' AND ended_at IS NULL;

-- Privilégios
REVOKE ALL ON TABLE public.couples FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.couple_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.couples TO authenticated;
GRANT SELECT ON TABLE public.couple_members TO authenticated;
GRANT ALL ON TABLE public.couples TO service_role;
GRANT ALL ON TABLE public.couple_members TO service_role;

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- Helper de visibilidade (membro atual ou antigo)
CREATE OR REPLACE FUNCTION public.can_view_couple(p_couple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.couple_id = p_couple_id
      AND m.user_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_couple(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_couple(uuid) TO authenticated;

DROP POLICY IF EXISTS couples_select_member ON public.couples;
CREATE POLICY couples_select_member ON public.couples
  FOR SELECT TO authenticated USING (public.can_view_couple(id));

DROP POLICY IF EXISTS couple_members_select_member ON public.couple_members;
CREATE POLICY couple_members_select_member ON public.couple_members
  FOR SELECT TO authenticated USING (public.can_view_couple(couple_id));

-- Trigger: inserção de membership
CREATE OR REPLACE FUNCTION public.couple_members_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_created_by uuid;
  v_current int;
BEGIN
  SELECT c.status, c.created_by INTO v_status, v_created_by
  FROM public.couples c WHERE c.id = NEW.couple_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'couple not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_status = 'archived' THEN
    RAISE EXCEPTION 'couple is archived' USING ERRCODE = 'check_violation';
  END IF;

  SELECT pg_catalog.count(*) INTO v_current
  FROM public.couple_members m
  WHERE m.couple_id = NEW.couple_id AND m.ended_at IS NULL;

  IF v_current >= 2 THEN
    RAISE EXCEPTION 'couple already has two members' USING ERRCODE = 'check_violation';
  ELSIF v_current = 0 THEN
    IF NEW.user_id <> v_created_by OR NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'first member must be the creator as admin' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF NEW.user_id = v_created_by OR NEW.role <> 'member' THEN
      RAISE EXCEPTION 'second member must be another user as member' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.joined_at := pg_catalog.now();
  NEW.ended_at := NULL;
  RETURN NEW;
END;
$$;

-- Trigger: atualização de membership (só encerrar)
CREATE OR REPLACE FUNCTION public.couple_members_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.couple_id IS DISTINCT FROM OLD.couple_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.joined_at IS DISTINCT FROM OLD.joined_at THEN
    RAISE EXCEPTION 'membership fields are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'ended membership is immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.ended_at IS NULL THEN
    RAISE EXCEPTION 'only ending a membership is allowed' USING ERRCODE = 'check_violation';
  END IF;
  NEW.ended_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

-- Trigger: bloquear exclusão de histórico
CREATE OR REPLACE FUNCTION public.couples_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'couple history cannot be deleted' USING ERRCODE = 'check_violation';
END;
$$;

-- Trigger: atualização de casal
CREATE OR REPLACE FUNCTION public.couples_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_current int;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'couple identity fields are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status = 'archived' THEN
    RAISE EXCEPTION 'archived couple is immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status = 'active' THEN
      SELECT pg_catalog.count(*) INTO v_current
      FROM public.couple_members m
      WHERE m.couple_id = NEW.id AND m.ended_at IS NULL;
      IF v_current <> 2 THEN
        RAISE EXCEPTION 'active couple requires exactly two current members' USING ERRCODE = 'check_violation';
      END IF;
      NEW.activated_at := pg_catalog.now();
      NEW.archived_at := NULL;
    ELSIF NEW.status = 'archived' AND OLD.status IN ('pending','active') THEN
      NEW.activated_at := OLD.activated_at;
      NEW.archived_at := pg_catalog.now();
    ELSE
      RAISE EXCEPTION 'invalid couple status transition' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    NEW.activated_at := OLD.activated_at;
    NEW.archived_at := OLD.archived_at;
  END IF;

  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

-- Trigger: encerrar memberships ao arquivar
CREATE OR REPLACE FUNCTION public.couples_after_archive()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.couple_members
     SET ended_at = pg_catalog.now()
   WHERE couple_id = NEW.id AND ended_at IS NULL;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.couple_members_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.couple_members_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.couples_block_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.couples_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.couples_after_archive() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER couple_members_before_insert
  BEFORE INSERT ON public.couple_members
  FOR EACH ROW EXECUTE FUNCTION public.couple_members_before_insert();
CREATE OR REPLACE TRIGGER couple_members_before_update
  BEFORE UPDATE ON public.couple_members
  FOR EACH ROW EXECUTE FUNCTION public.couple_members_before_update();
CREATE OR REPLACE TRIGGER couple_members_block_delete
  BEFORE DELETE ON public.couple_members
  FOR EACH ROW EXECUTE FUNCTION public.couples_block_delete();
CREATE OR REPLACE TRIGGER couples_block_delete
  BEFORE DELETE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.couples_block_delete();
CREATE OR REPLACE TRIGGER couples_before_update
  BEFORE UPDATE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.couples_before_update();
CREATE OR REPLACE TRIGGER couples_after_archive
  AFTER UPDATE OF status ON public.couples
  FOR EACH ROW
  WHEN (NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived')
  EXECUTE FUNCTION public.couples_after_archive();

-- Função exposta: criar casal pendente
CREATE OR REPLACE FUNCTION public.create_couple(p_relationship_started_on date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_couple_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('create_couple:' || v_uid::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.user_id = v_uid AND m.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'user already belongs to a current couple' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.couples (created_by, status, relationship_started_on)
  VALUES (v_uid, 'pending', p_relationship_started_on)
  RETURNING id INTO v_couple_id;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_couple_id, v_uid, 'admin');

  RETURN v_couple_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_couple(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple(date) TO authenticated;