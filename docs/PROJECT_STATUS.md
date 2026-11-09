# Namoro com IA — estado do projeto

## Repositório e sincronização

- Repositório: cainalo/namoro-com-ia
- Branch conectada ao Lovable: main
- Projeto Lovable identificado pelo README: b4d0cd87-ea1b-4dd5-bd67-64c6f2bceb18
- Não trabalhar no repositório parecido cainalo/namoro-ai.

## Stack identificada

- TanStack Start, React 19 e TypeScript.
- Tailwind CSS v4.
- @supabase/supabase-js.
- Lovable AI Gateway, chamado no servidor por src/routes/api/chat.ts.

## Integrações já existentes — preservar

- O chat é renderizado por src/components/AiChat.tsx e envia mensagens para /api/chat.
- A rota src/routes/api/chat.ts usa streamResponse do gateway Lovable. A chave permanece no servidor.
- O cliente Supabase está em src/integrations/supabase/client.ts e o projeto está identificado em supabase/config.toml.
- Os tipos Supabase atualmente não declaram tabelas da aplicação; a estrutura de dados ainda precisa ser criada.
- A aplicação usa um projeto Supabase externo do usuário, não Lovable Cloud.

## Regras obrigatórias do repositório

Ler e seguir AGENTS.md antes de cada ciclo relevante.

- Não editar manualmente supabase/migrations/ nem drizzle/; solicitar alterações de esquema pelo Lovable.
- Não editar arquivos gerados automaticamente.
- Não remover nem mover chamadas de IA para o navegador.
- Não publicar segredos no GitHub.
- Não reescrever histórico publicado, fazer force push, amend ou rebase de commits publicados.
- Manter main em estado compilável para sincronização com o Lovable.

## Decisões de produto já tomadas

- Plataforma privada para duas contas individuais vinculadas como casal.
- Conteúdo compartilhado por padrão, com permissões próprias para conteúdo individual, seletivo, programado, secreto ou temporário.
- Diários pessoais e surpresas não podem ser expostos automaticamente ao outro.
- IA opcional: somente quando uma pessoa a abrir/solicitar; sem ações automáticas.
- Interface em português brasileiro; tema acolhedor, editorial, elegante e divertido.
- Universo virtual ilustrado em 2D isométrico.
- Navegação central: Início, Conversas, Memórias, Organização e Universo.
- Experiência web responsiva primeiro; preparar evolução para PWA e aplicativos nativos.
- Supabase como backend; GitHub como fonte de versão do código.
- Sem dados fictícios apresentados como se fossem memórias, eventos ou informações reais.

## Etapas de desenvolvimento

### Ciclo 1 — Fundação visual (em andamento)
- [x] Substituir a tela vazia por uma tela inicial responsiva.
- [x] Criar navegação principal para cinco áreas centrais.
- [x] Preservar o chat de IA existente.
- [x] Definir tokens visuais claros e escuros.
- [ ] Validar build e comportamento no Lovable preview.

### Ciclo 2 — Identidade, autenticação e vínculo
- [ ] Confirmar as variáveis/conexão do projeto Supabase.
- [ ] Definir schema por meio do Lovable, respeitando as instruções do repositório.
- [ ] Autenticação individual, perfil e convite privado.
- [ ] Vínculo do casal limitado a duas contas.
- [ ] RLS para dados individuais e compartilhados.
- [ ] Testar isolamento com duas contas reais.

### Ciclos seguintes
1. Conversas e feed.
2. Memórias e biblioteca.
3. Organização e vida emocional.
4. Jogos e desafios.
5. Primeira casa isométrica, avatares e mascotes.
6. Entretenimento, viagens, receitas e projetos.
7. Eventos, surpresas, notificações e recursos avançados.
8. Offline, backup independente, segurança, acessibilidade e distribuição.

## Estado de validação

A edição inicial foi preparada para a branch conectada. O preview e os comandos de build/lint ainda precisam ser executados no Lovable ou em ambiente local; não marcar o ciclo como validado até isso ocorrer.
