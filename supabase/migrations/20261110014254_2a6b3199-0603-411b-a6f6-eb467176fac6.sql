-- Correção etapa 2: os dois membros são admin (privilégios iguais)

ALTER TABLE public.couple_members DROP CONSTRAINT IF EXISTS couple_members_role_check;
ALTER TABLE public.couple_members
  ADD CONSTRAINT couple_members_role_check CHECK (role = 'admin');
ALTER TABLE public.couple_members ALTER COLUMN role SET DEFAULT 'admin';

DROP INDEX IF EXISTS public.couple_members_one_current_admin_uidx;

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
    IF NEW.user_id = v_created_by OR NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'second member must be another user as admin' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.joined_at := pg_catalog.now();
  NEW.ended_at := NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.couple_members_before_insert() FROM PUBLIC, anon, authenticated;