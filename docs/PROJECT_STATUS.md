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
- [x] Tokens claro/escuro.
- [x] Refinar o shell para remover linguagem e padrões de landing page genérica.
- [ ] Validar preview, build e lint.

### Ciclo 2 — base de dados e vínculo
- [ ] Inspecionar schema Supabase ativo, policies, buckets e extensões.
- [ ] Confirmar o conector Supabase no ChatGPT para administração direta.
- [ ] Criar perfis, casal, membros e convites por execução controlada do schema no Supabase/Lovable.
- [ ] Implementar vínculo atômico limitado a duas contas.
- [ ] Implementar RLS e testar com duas contas.

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
Não adicionar headings e descrições por padrão. Cada tela deve ser orientada à tarefa e usar ajuda contextual somente quando necessária.

## Supabase
Consultar docs/SUPABASE_SCHEMA_PLAN.md.
Esse documento não é uma migration e não foi aplicado ao banco.
