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
- Alterações de schema devem ser migrations novas e aditivas em supabase/migrations/, versionadas no GitHub e aplicadas pela integração oficial Supabase Deploy to production na main. Não editar migrations já publicadas. Não usar SQL Editor ou outro caminho para aplicar DDL.
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

## Entrega recente — Conversas (2026-11-10)
- Criado o armazenamento privado de mensagens em public.couple_messages, com RLS: membros atuais e antigos consultam o histórico do próprio casal; somente membros atuais de casal ativo podem inserir em nome próprio.
- Implementado o componente CoupleConversation e conectado à navegação existente.
- Primeira versão permite carregar as 100 mensagens mais recentes, enviar texto de até 2000 caracteres e atualizar manualmente. Ainda não há realtime, anexos, edição/exclusão, recibos de leitura ou notificações.
- A tabela é consultada por adapter tipado temporário em src/lib/couple-messages.ts; atualizar os tipos gerados do Supabase em etapa separada, sem editar o arquivo gerado manualmente.
- Migration ainda aguarda confirmação de aplicação no banco. Não inserir dados fictícios.
- Código: commit 5c287bf82880e3dff29732f225737d17343bd0d7.

## Ciclos

### Ciclo 1 — shell visual
- [x] Substituir a tela branca inicial.
- [x] Navegação principal responsiva.
- [x] Chat de IA preservado.
- [x] Refinar o shell para reduzir linguagem de marketing e padrões genéricos.
- [ ] Validar preview, build e lint. Build e testes passaram antes das migrations da etapa 2; lint falhou (ver Validação local).

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
- [x] Especificar fluxo seguro de convites e aceite em docs/INVITATION_FLOW_PLAN.md.
- [x] Migration de convites `20261110021500_create_couple_invitations.sql` aplicada e confirmada pelo usuário via histórico de migrations.
- [ ] Implementar a interface para criar o casal, gerar/renovar/revogar link e aceitar convite.
- [ ] Testar create_couple, concorrência e isolamento de casais com duas contas.
- [x] Implementar vínculo atômico limitado a duas contas: RPC de aceite transacional e trigger de limite de membros estão versionados e a migration de convites foi confirmada como aplicada.
- [ ] Implementar RLS e testar com duas contas. RLS de profiles, couples e couple_members aplicada; testes com duas contas não feitos.
- [ ] Bloquear acesso ao backend fora de sessão quando o endpoint passar a lidar com dados privados.

### Validação local (executada antes das migrations da etapa 2 e da correção de role; o código atual não foi rebuildado depois)
- bun run build: passou.
- bun run test: 1 arquivo, 1 teste passou.
- bun run lint: falhou — 226 erros prettier/prettier e 6 avisos react-refresh/only-export-components.
- Checagem isolada de tipos: não executada.

### Pendências
- [ ] (Não bloqueante) Validar com uma segunda conta o trigger de criação de perfil. Por orientação do usuário, considerar o fluxo funcional para continuar o desenvolvimento; confirmar em teste real quando possível.
- [ ] Testar isolamento de profiles entre duas contas.
- [ ] Testar atualização de perfil no Preview.
- [ ] Testar o fluxo de criação/renovação/revogação/aceite dos convites.
- [ ] Revisar formatação do lint sem editar arquivos gerados automaticamente.
- A validação com duas contas continua pendente, mas não bloqueia o desenvolvimento inicial das conversas. A primeira versão de conversas foi implementada; a migration de mensagens e o isolamento ainda precisam de confirmação.

### Estado operacional (2026-11-10)
- A integração oficial GitHub-Supabase com Deploy to production na main foi habilitada pelo usuário.
- A migration de convites foi confirmada aplicada por consulta ao histórico de migrations.
- O fluxo de convites tem componentes de criação/gerenciamento e uma página de aceite. Atenção: src/routeTree.gen.ts ainda não registra /invite/$token e só pode ser atualizado pelo gerador oficial.
- O workspace Lovable recusou uma mensagem de edição por falta de créditos. Não pedir ao usuário tokens, Secrets ou compra de créditos como requisito; usar o GitHub conectado para tarefas que possam ser feitas com segurança.
- A migration de mensagens 20261110131600_create_couple_messages.sql foi adicionada à main. Sua aplicação no Supabase ainda não foi confirmada.
- O Lovable reconhece o commit de implementação das conversas e reporta o projeto como ready. Não há checks de CI no commit e os comandos de testes/build não foram executados nesta etapa.

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
Consultar docs/SUPABASE_SCHEMA_PLAN.md e docs/INVITATION_FLOW_PLAN.md.
Esse documento não é uma migration; as etapas 1 (profiles) e 2 (couples, couple_members) estão aplicadas, pelas migrations registradas nele.
A autenticação visual usa signUp/signInWithPassword/signOut do SDK Supabase já presente no projeto.
O usuário configurou a URL de redirecionamento e confirmou cadastro, confirmação de e-mail e login no Preview. Logout não foi confirmado. O endpoint /api/chat exige e valida um access token Supabase antes de consumir o gateway.
