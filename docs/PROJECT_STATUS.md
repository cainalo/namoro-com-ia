# Namoro — estado do projeto

## Repositório
- Repositório: cainalo/namoro-com-ia
- Branch conectada: main
- Projeto Lovable: b4d0cd87-ea1b-4dd5-bd67-64c6f2bceb18
- Não trabalhar no repositório parecido cainalo/namoro-ai.

## Stack observada
- TanStack Start, React 19 e TypeScript.
- Tailwind CSS v4.
- Supabase JS.
- Lovable AI Gateway no servidor em src/routes/api/chat.ts.

## Integrações a preservar
- Chat de IA: src/components/AiChat.tsx -> /api/chat.
- Endpoint server-side: src/routes/api/chat.ts.
- Supabase externo: src/integrations/supabase/client.ts e supabase/config.toml.
- Arquivos gerados não devem ser editados manualmente.

## Regras do projeto
Consultar AGENTS.md antes de cada ciclo.
- Não editar manualmente supabase/migrations/ nem drizzle/. Solicitar alterações de schema pelo Lovable.
- Não editar arquivos com cabeçalho de geração automática.
- Manter chamadas de IA no Lovable AI Gateway e nunca expor LOVABLE_API_KEY.
- Não publicar secrets.
- Não reescrever histórico já publicado; sem force push, amend ou rebase de commits publicados.
- Manter main funcional para sincronização com Lovable.

## Decisões de produto
- Plataforma privada para duas contas individuais vinculadas como casal.
- Visibilidade por conteúdo: private, shared, selected, scheduled, secret e temporary.
- Diários e surpresas não são acessíveis automaticamente pelo parceiro.
- IA opcional e somente quando solicitada.
- Português brasileiro.
- Navegação: Hoje, Conversas, Memórias, Planos e Casa.
- Web responsiva primeiro; PWA e apps nativos posteriormente.
- Supabase externo como backend.

## Ciclos

### Ciclo 1 — shell visual
- [x] Substituir a tela branca inicial.
- [x] Navegação principal responsiva.
- [x] Chat de IA preservado.
- [x] Refinar o shell para reduzir linguagem de marketing e padrões genéricos.
- [ ] Validar preview, build e lint. Build e testes passaram; lint falhou (ver Validação local).

### Ciclo 2 — autenticação, dados e vínculo
- [x] Adicionar tela de cadastro e login por e-mail/senha usando o Supabase Auth existente.
- [x] Restaurar sessão no carregamento e ouvir alterações de autenticação.
- [x] Adicionar encerramento de sessão.
- [x] Exigir token Supabase válido no endpoint de IA.
- [x] Cadastro, confirmação de e-mail e login no Preview (confirmado pelo usuário, com URL de redirecionamento configurada por ele).
- [ ] Validar logout no Preview.
- [x] Inspecionar schema Supabase ativo, policies, buckets e extensões.
- [x] Etapa 1 — profiles aplicada no Supabase externo (ver docs/SUPABASE_SCHEMA_PLAN.md, Estado).
- [x] Etapa 2 — couples e couple_members aplicadas no Supabase externo, com os dois membros como admin (ver docs/SUPABASE_SCHEMA_PLAN.md, Estado).
- [ ] Aplicar convites, aceite e desvinculação.
- [ ] Testar create_couple, concorrência e isolamento de casais com duas contas.
- [ ] Implementar vínculo atômico limitado a duas contas. O limite de duas pessoas já está garantido no banco; o fluxo de convite/aceite ainda não existe.
- [ ] Implementar RLS e testar com duas contas. RLS de profiles aplicada; teste com duas contas não feito.
- [ ] Bloquear acesso ao backend fora de sessão quando o endpoint passar a lidar com dados privados.

### Validação local (executada antes das migrations da etapa 2 e da correção de role; o código atual não foi rebuildado depois)
- bun run build: passou.
- bun run test: 1 arquivo, 1 teste passou.
- bun run lint: falhou — 226 erros prettier/prettier e 6 avisos react-refresh/only-export-components.
- Checagem isolada de tipos: não executada.

### Pendências
- [ ] Cadastrar uma segunda conta para provar o trigger de criação de perfil.
- [ ] Testar isolamento de profiles entre duas contas.
- [ ] Testar atualização de perfil no Preview.
- [ ] Revisar formatação do lint sem editar arquivos gerados automaticamente.
- Não iniciar conversas nem memórias antes dessas pendências.

### Ciclos seguintes
1. Conversas e feed.
2. Memórias e biblioteca.
3. Organização e vida emocional.
4. Jogos e desafios.
5. Casa isométrica, avatares e mascotes.
6. Cinema, música, livros, culinária, viagens, natureza e projetos.
7. Eventos, surpresas e notificações.
8. Offline, backups independentes, acessibilidade e distribuição.

## Qualidade visual
Consultar docs/DESIGN_PRINCIPLES.md.
Não adicionar títulos e descrições por padrão. Cada tela deve ser orientada à tarefa e usar ajuda contextual somente quando necessária.

## Supabase
Consultar docs/SUPABASE_SCHEMA_PLAN.md.
Esse documento não é uma migration; as etapas 1 (profiles) e 2 (couples, couple_members) estão aplicadas, pelas migrations registradas nele.
A autenticação visual usa signUp/signInWithPassword/signOut do SDK Supabase já presente no projeto.
O usuário configurou a URL de redirecionamento e confirmou cadastro, confirmação de e-mail e login no Preview. Logout não foi confirmado. O endpoint /api/chat exige e valida um access token Supabase antes de consumir o gateway.
