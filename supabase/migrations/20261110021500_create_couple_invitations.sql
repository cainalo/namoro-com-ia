-- Etapa 3: convites seguros e aceite transacional do casal.
-- Implantação pelo Supabase GitHub Integration (Deploy to production).
-- A migration falha antes de qualquer DDL se o estado-base não corresponder ao esperado.

DO $preflight$
DECLARE
  v_crypto_schema name;
  v_member_insert_def text;
  v_role_check text;
  v_sig text;
BEGIN
  IF pg_catalog.to_regclass('public.couples') IS NULL
     OR pg_catalog.to_regclass('public.couple_members') IS NULL THEN
    RAISE EXCEPTION 'preflight: couples/couple_members ausentes; migration interrompida';
  END IF;

  IF pg_catalog.to_regclass('public.couple_invitations') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: public.couple_invitations já existe; comparar antes de continuar';
  END IF;

  FOREACH v_sig IN ARRAY ARRAY[
    'public.create_couple_invitation(uuid)',
    'public.revoke_couple_invitation(uuid)',
    'public.accept_couple_invitation(text)',
    'public.couple_invitations_before_update()',
    'public.couple_invitations_before_delete()'
  ] LOOP
    IF pg_catalog.to_regprocedure(v_sig) IS NOT NULL THEN
      RAISE EXCEPTION 'preflight: objeto conflitante % já existe', v_sig;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'couple_members'
      AND t.tgname = 'couple_members_before_insert'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'preflight: trigger couple_members_before_insert ausente';
  END IF;

  SELECT pg_catalog.pg_get_functiondef('public.couple_members_before_insert()'::pg_catalog.regprocedure)
    INTO v_member_insert_def;
  IF pg_catalog.strpos(pg_catalog.upper(v_member_insert_def), 'FOR UPDATE') = 0
     OR pg_catalog.strpos(pg_catalog.upper(v_member_insert_def), 'NEW.ROLE <> ''ADMIN''') = 0 THEN
    RAISE EXCEPTION 'preflight: trigger de membership não corresponde à etapa 2 corrigida';
  END IF;

  SELECT pg_catalog.pg_get_constraintdef(c.oid)
    INTO v_role_check
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.couple_members'::pg_catalog.regclass
    AND c.conname = 'couple_members_role_check'
    AND c.contype = 'c';
  IF v_role_check IS NULL
     OR pg_catalog.strpos(v_role_check, 'role = ''admin''') = 0 THEN
    RAISE EXCEPTION 'preflight: CHECK de role não garante admin para os dois integrantes';
  END IF;

  SELECT n.nspname
    INTO v_crypto_schema
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_crypto_schema IS NULL THEN
    RAISE EXCEPTION 'preflight: extensão pgcrypto não encontrada';
  END IF;

  IF pg_catalog.to_regprocedure(pg_catalog.format('%I.gen_random_bytes(integer)', v_crypto_schema)) IS NULL
     OR pg_catalog.to_regprocedure(pg_catalog.format('%I.digest(bytea,text)', v_crypto_schema)) IS NULL THEN
    RAISE EXCEPTION 'preflight: pgcrypto não expõe gen_random_bytes(integer) e digest(bytea,text) no schema %', v_crypto_schema;
  END IF;
END;
$preflight$;

-- Impede qualquer nova membership fora de um casal pendente.
CREATE OR REPLACE FUNCTION public.couple_members_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_created_by uuid;
  v_current integer;
BEGIN
  SELECT c.status, c.created_by
    INTO v_status, v_created_by
  FROM public.couples c
  WHERE c.id = NEW.couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'couple not found' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'new members can only join a pending couple' USING ERRCODE = 'check_violation';
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_current
  FROM public.couple_members m
  WHERE m.couple_id = NEW.couple_id
    AND m.ended_at IS NULL;

  IF v_current >= 2 THEN
    RAISE EXCEPTION 'couple already has two current members' USING ERRCODE = 'check_violation';
  ELSIF v_current = 0 THEN
    IF NEW.user_id IS DISTINCT FROM v_created_by OR NEW.role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'first member must be the creator as admin' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF NEW.user_id IS NOT DISTINCT FROM v_created_by OR NEW.role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'second member must be another user as admin' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.joined_at := pg_catalog.now();
  NEW.ended_at := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.couple_members_before_insert() FROM PUBLIC, anon, authenticated;

-- Convites são registros de auditoria: token bruto nunca é armazenado.
CREATE TABLE public.couple_invitations (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE RESTRICT,
  inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL,
  accepted_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at timestamptz NULL,
  revoked_at timestamptz NULL,
  CONSTRAINT couple_invitations_token_hash_format_chk
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT couple_invitations_expiry_chk
    CHECK (expires_at > created_at),
  CONSTRAINT couple_invitations_status_fields_chk CHECK (
    (status = 'pending' AND accepted_by IS NULL AND accepted_at IS NULL AND revoked_at IS NULL)
    OR (status = 'accepted' AND accepted_by IS NOT NULL AND accepted_at IS NOT NULL AND revoked_at IS NULL)
    OR (status = 'revoked' AND accepted_by IS NULL AND accepted_at IS NULL AND revoked_at IS NOT NULL)
    OR (status = 'expired' AND accepted_by IS NULL AND accepted_at IS NULL AND revoked_at IS NULL)
  )
);

CREATE UNIQUE INDEX couple_invitations_one_pending_per_couple_uidx
  ON public.couple_invitations (couple_id)
  WHERE status = 'pending';

ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.couple_invitations FROM PUBLIC, anon, authenticated;
-- Sem policies: o acesso é exclusivamente pelas RPCs SECURITY DEFINER autorizadas.

CREATE OR REPLACE FUNCTION public.couple_invitations_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.couple_id IS DISTINCT FROM OLD.couple_id
     OR NEW.inviter_user_id IS DISTINCT FROM OLD.inviter_user_id
     OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'invitation identity fields are immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'terminal invitation is immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status NOT IN ('accepted', 'revoked', 'expired') THEN
    RAISE EXCEPTION 'invalid invitation status transition' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'accepted' THEN
    IF NEW.accepted_by IS NULL
       OR NEW.accepted_by IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'accepted_by must be the authenticated recipient' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.accepted_at := pg_catalog.now();
    NEW.revoked_at := NULL;
  ELSIF NEW.status = 'revoked' THEN
    NEW.accepted_by := NULL;
    NEW.accepted_at := NULL;
    NEW.revoked_at := pg_catalog.now();
  ELSE
    IF OLD.expires_at > pg_catalog.now() THEN
      RAISE EXCEPTION 'only an expired invitation can transition to expired' USING ERRCODE = 'check_violation';
    END IF;
    NEW.accepted_by := NULL;
    NEW.accepted_at := NULL;
    NEW.revoked_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.couple_invitations_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'invitation history cannot be deleted' USING ERRCODE = 'check_violation';
END;
$$;

REVOKE ALL ON FUNCTION public.couple_invitations_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.couple_invitations_before_delete() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER couple_invitations_before_update
  BEFORE UPDATE ON public.couple_invitations
  FOR EACH ROW EXECUTE FUNCTION public.couple_invitations_before_update();

CREATE TRIGGER couple_invitations_before_delete
  BEFORE DELETE ON public.couple_invitations
  FOR EACH ROW EXECUTE FUNCTION public.couple_invitations_before_delete();

COMMENT ON TABLE public.couple_invitations IS
  'One-time couple invitations. Only SHA-256 token hashes are stored; use the authenticated RPCs.';

-- Cria ou renova um link. O token bruto retorna uma única vez.
CREATE OR REPLACE FUNCTION public.create_couple_invitation(p_couple_id uuid)
RETURNS TABLE(invitation_id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_status text;
  v_created_by uuid;
  v_members integer;
  v_crypto_schema name;
  v_random bytea;
  v_token text;
  v_token_hash text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT c.status, c.created_by
    INTO v_status, v_created_by
  FROM public.couples c
  WHERE c.id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND OR v_status IS DISTINCT FROM 'pending' OR v_created_by IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'couple unavailable for invitation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_members
  FROM public.couple_members m
  WHERE m.couple_id = p_couple_id
    AND m.ended_at IS NULL;

  IF v_members <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.couple_id = p_couple_id
      AND m.user_id = v_uid
      AND m.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'couple is not awaiting its second member' USING ERRCODE = 'check_violation';
  END IF;

  -- Lock order for all invitation RPCs: couples first, invitations second.
  UPDATE public.couple_invitations i
     SET status = 'expired'
   WHERE i.couple_id = p_couple_id
     AND i.status = 'pending'
     AND i.expires_at <= pg_catalog.now();

  UPDATE public.couple_invitations i
     SET status = 'revoked'
   WHERE i.couple_id = p_couple_id
     AND i.status = 'pending';

  SELECT n.nspname
    INTO v_crypto_schema
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_crypto_schema IS NULL THEN
    RAISE EXCEPTION 'pgcrypto unavailable' USING ERRCODE = 'feature_not_supported';
  END IF;

  EXECUTE pg_catalog.format('SELECT %I.gen_random_bytes(32)', v_crypto_schema)
    INTO v_random;
  v_token := pg_catalog.encode(v_random, 'hex');
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.encode(%I.digest(pg_catalog.convert_to($1, ''UTF8''), ''sha256''), ''hex'')',
    v_crypto_schema
  ) INTO v_token_hash USING v_token;

  v_expires_at := pg_catalog.now() + INTERVAL '7 days';

  INSERT INTO public.couple_invitations AS ci (
    couple_id, inviter_user_id, token_hash, status, expires_at
  ) VALUES (
    p_couple_id, v_uid, v_token_hash, 'pending', v_expires_at
  ) RETURNING ci.id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$;

-- Revoga o convite vigente sem permitir consultar seu token.
CREATE OR REPLACE FUNCTION public.revoke_couple_invitation(p_couple_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_status text;
  v_members integer;
  v_invitation_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT c.status INTO v_status
  FROM public.couples c
  WHERE c.id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND OR v_status IS DISTINCT FROM 'pending' THEN
    RETURN false;
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_members
  FROM public.couple_members m
  WHERE m.couple_id = p_couple_id
    AND m.ended_at IS NULL;

  IF v_members <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.couple_id = p_couple_id
      AND m.user_id = v_uid
      AND m.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not authorized to revoke this invitation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT i.id, i.expires_at
    INTO v_invitation_id, v_expires_at
  FROM public.couple_invitations i
  WHERE i.couple_id = p_couple_id
    AND i.status = 'pending'
  FOR UPDATE;

  IF v_invitation_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.couple_invitations i
     SET status = CASE
       WHEN v_expires_at <= pg_catalog.now() THEN 'expired'
       ELSE 'revoked'
     END
   WHERE i.id = v_invitation_id;

  RETURN true;
END;
$$;

-- Aceita o token e ativa o casal numa única transação.
CREATE OR REPLACE FUNCTION public.accept_couple_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_crypto_schema name;
  v_token_hash text;
  v_initial_couple_id uuid;
  v_couple_id uuid;
  v_couple_status text;
  v_created_by uuid;
  v_invitation_id uuid;
  v_invitation_status text;
  v_inviter uuid;
  v_expires_at timestamptz;
  v_members integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;

  SELECT n.nspname
    INTO v_crypto_schema
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_crypto_schema IS NULL THEN
    RAISE EXCEPTION 'pgcrypto unavailable' USING ERRCODE = 'feature_not_supported';
  END IF;

  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.encode(%I.digest(pg_catalog.convert_to($1, ''UTF8''), ''sha256''), ''hex'')',
    v_crypto_schema
  ) INTO v_token_hash USING p_token;

  -- Leitura inicial apenas para descobrir o casal; a validação é repetida após os locks.
  SELECT i.couple_id INTO v_initial_couple_id
  FROM public.couple_invitations i
  WHERE i.token_hash = v_token_hash;

  IF v_initial_couple_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Ordem estável de locks: casal -> convite.
  SELECT c.status, c.created_by
    INTO v_couple_status, v_created_by
  FROM public.couples c
  WHERE c.id = v_initial_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT i.id, i.couple_id, i.inviter_user_id, i.status, i.expires_at
    INTO v_invitation_id, v_couple_id, v_inviter, v_invitation_status, v_expires_at
  FROM public.couple_invitations i
  WHERE i.token_hash = v_token_hash
    AND i.couple_id = v_initial_couple_id
  FOR UPDATE;

  IF NOT FOUND OR v_invitation_status IS DISTINCT FROM 'pending'
     OR v_couple_status IS DISTINCT FROM 'pending' THEN
    RETURN NULL;
  END IF;

  IF v_expires_at <= pg_catalog.now() THEN
    UPDATE public.couple_invitations i
       SET status = 'expired'
     WHERE i.id = v_invitation_id;
    RETURN NULL; -- Commit da expiração; não lançar exceção aqui.
  END IF;

  IF v_inviter IS DISTINCT FROM v_created_by
     OR v_inviter = v_uid THEN
    RETURN NULL;
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_members
  FROM public.couple_members m
  WHERE m.couple_id = v_couple_id
    AND m.ended_at IS NULL;

  IF v_members <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.couple_id = v_couple_id
      AND m.user_id = v_inviter
      AND m.ended_at IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.couple_members m
    WHERE m.user_id = v_uid
      AND m.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'account_already_linked' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_couple_id, v_uid, 'admin');

  UPDATE public.couples c
     SET status = 'active'
   WHERE c.id = v_couple_id;

  UPDATE public.couple_invitations i
     SET status = 'accepted', accepted_by = v_uid
   WHERE i.id = v_invitation_id;

  RETURN v_couple_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_couple_invitation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_couple_invitation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_couple_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_couple_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_couple_invitation(text) TO authenticated;
