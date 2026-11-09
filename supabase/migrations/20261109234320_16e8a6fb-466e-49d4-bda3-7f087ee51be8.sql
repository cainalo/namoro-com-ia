-- Etapa 1: fundação de public.profiles (aditiva e idempotente)

-- 1. Tabela
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Privilégios: nada para anon; authenticated só lê e atualiza colunas editáveis
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_path) ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 3. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies (somente o próprio titular; sem INSERT/DELETE para clientes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT TO authenticated
      USING (id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = (SELECT auth.uid()))
      WITH CHECK (id = (SELECT auth.uid()));
  END IF;
END
$$;

-- 5. updated_at automático
CREATE OR REPLACE FUNCTION public.profiles_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profiles_set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.profiles_set_updated_at() FROM authenticated;

CREATE OR REPLACE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_set_updated_at();

-- 6. Criação do perfil após cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM authenticated;

CREATE OR REPLACE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- 7. Backfill idempotente (somente ids)
INSERT INTO public.profiles (id)
SELECT u.id FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;