-- Morados: personalização dos perfis privados do casal.
-- Aplicar no Supabase externo antes de habilitar a edição de bio/capa.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS banner_path text;
GRANT UPDATE (display_name, avatar_path, bio, banner_path)
  ON TABLE public.profiles TO authenticated;
COMMENT ON COLUMN public.profiles.bio IS
  'Descrição opcional do perfil privado no Morados.';
COMMENT ON COLUMN public.profiles.banner_path IS
  'Caminho privado da imagem de capa no bucket couple-media.';
