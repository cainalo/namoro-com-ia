-- Campos recuperados da implementação de perfil da PR #20.
-- Mantém o onboarding atual do Morados e amplia seus dados pessoais sem
-- recriar colunas, buckets ou funções de pareamento já existentes.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS favorite_song text,
  ADD COLUMN IF NOT EXISTS favorite_place text,
  ADD COLUMN IF NOT EXISTS personal_phrase text;

GRANT UPDATE (
  headline,
  favorite_song,
  favorite_place,
  personal_phrase
) ON TABLE public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.headline IS
  'Frase curta de apresentação do perfil pessoal.';
COMMENT ON COLUMN public.profiles.favorite_song IS
  'Música ou canção favorita informada pelo usuário.';
COMMENT ON COLUMN public.profiles.favorite_place IS
  'Lugar favorito informado pelo usuário.';
COMMENT ON COLUMN public.profiles.personal_phrase IS
  'Frase pessoal, lema ou lembrança escolhida pelo usuário.';

COMMIT;
