# Etapa 3 — convites e aceite do casal

**Estado:** especificação preparada; ainda não aplicada. O schema deve ser alterado pelo Lovable no Supabase externo `jffryzeelzxjqbeagecb`, conforme `AGENTS.md`. Não usar Lovable Cloud nem criar migrations manualmente.

## Objetivo

Permitir que a primeira pessoa crie um casal pendente, gere um link de convite de uso único e compartilhe com a segunda pessoa. O casal só fica `active` depois que a segunda conta autenticada aceita o convite. Os dois integrantes continuam com `role = 'admin'` e permissões iguais.

A validade padrão do convite será de **7 dias**. Gerar um novo link revoga o anterior ainda pendente.

## Pré-condições da migration

Antes de aplicar:

1. Confirmar por leitura que o projeto conectado continua sendo o Supabase externo `jffryzeelzxjqbeagecb`.
2. Inspecionar a localização de `pgcrypto` em `pg_extension`; o Supabase costuma instalar extensões no schema `extensions`, mas a migration deve usar o schema realmente observado. Não presumir que `digest` ou `gen_random_bytes` estejam em `public`.
3. Conferir que não existem objetos homônimos, dados de convites ou dependências novas.
4. Revalidar os privilégios, policies e triggers das etapas 1 e 2 sem alterá-los.

### Correção necessária no trigger existente

A função `public.couple_members_before_insert()` atualmente recusa apenas casais `archived`. Antes do aceite, corrigir para exigir `status = 'pending'` em qualquer inserção de membership. O fluxo de convite só pode adicionar a segunda pessoa em um casal pendente. A trava `FOR UPDATE`, o limite de duas pessoas, o papel `admin` e o índice parcial de um vínculo atual por usuário permanecem.

Essa correção evita que uma futura operação privilegiada ou uma chamada interna adicione um terceiro membro a um casal ativo que, por alguma razão administrativa, tenha ficado com apenas um vínculo atual.

## Tabela `public.couple_invitations`

Campos propostos:

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `couple_id` | uuid | NOT NULL, FK `couples(id)` ON DELETE RESTRICT |
| `inviter_user_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE RESTRICT |
| `token_hash` | text | NOT NULL, UNIQUE; nunca guardar o token bruto |
| `status` | text | NOT NULL, default `pending`; CHECK: pending, accepted, revoked, expired |
| `created_at` | timestamptz | NOT NULL, default now() |
| `expires_at` | timestamptz | NOT NULL |
| `accepted_by` | uuid | FK `auth.users(id)`, nullable |
| `accepted_at` | timestamptz | nullable |
| `revoked_at` | timestamptz | nullable |

Restrições:
- `accepted` exige `accepted_by` e `accepted_at`; demais estados não podem ter esses campos preenchidos.
- `revoked` exige `revoked_at`; os demais estados não podem tê-lo.
- Índice único parcial em `couple_id WHERE status = 'pending'`: apenas um convite pendente por casal.
- Índice em `expires_at` somente se as consultas de limpeza/expiração justificarem.
- Convites são registros de auditoria. Não apagar registros aceitos, revogados ou expirados.

RLS habilitada. `anon` e `authenticated` não recebem SELECT/INSERT/UPDATE/DELETE na tabela. A interface usa somente RPCs autorizadas; nunca consulta `token_hash` diretamente.

## Token e link

- Gerar 32 bytes aleatórios criptograficamente seguros (256 bits) e codificar em hexadecimal (64 caracteres).
- Calcular SHA-256 do token bruto e armazenar somente o hash hexadecimal em `token_hash`.
- Retornar o token bruto **uma única vez**, apenas na resposta da RPC de criação destinada ao próprio usuário autenticado.
- Não incluir o token em logs, analytics, mensagens de erro, telemetria ou dados de depuração.
- Expiração padrão: `now() + interval '7 days'`.
- O link usa a rota `/invite/:token`. Depois do aceite, navegar com substituição de histórico para remover o token da barra de endereço.
- Configurar `Referrer-Policy: no-referrer` (preferencialmente cabeçalho HTTP e também meta tag) para reduzir o vazamento do caminho em requisições externas. A rota não deve carregar scripts de analytics de terceiros.

O uso de SHA-256 aqui é adequado porque o token tem alta entropia aleatória; não é uma senha humana. A validação continua sendo feita no banco, comparando o hash recebido com o hash armazenado.

## Funções transacionais

Todas as funções expostas derivam a identidade de `(select auth.uid())`, usam `SECURITY DEFINER` somente quando necessário, fixam `search_path = ''`, qualificam todos os objetos e revogam EXECUTE de `PUBLIC` e `anon`. Conceder EXECUTE a `authenticated` apenas nas funções necessárias. Nenhuma função recebe `user_id`, `role` ou `inviter_user_id` do cliente.

### `create_couple_invitation(p_couple_id uuid)`

- Exigir sessão autenticada.
- Travar a linha de `public.couples` com `FOR UPDATE`.
- Confirmar que o chamador é membro atual, que o casal está `pending` e que há exatamente um membro atual (o criador).
- Marcar convites pendentes vencidos como `expired`.
- Revogar o convite pendente anterior, se houver (renovação do link).
- Gerar token/hash, inserir convite com validade de sete dias e retornar `invitation_id`, token bruto e `expires_at`.
- Não aceitar casal ativo/arquivado, nem casal com dois membros.

### `revoke_couple_invitation(p_couple_id uuid)`

- Exigir sessão autenticada e membership atual no casal pendente.
- Travar primeiro a linha do casal e depois a do convite, mantendo a mesma ordem de locks da criação e do aceite.
- Alterar somente convite pendente para `revoked`, definindo `revoked_at`.
- Não revelar token nem permitir revogar convites de outro casal.

### `accept_couple_invitation(p_token text)`

Uma única transação; sem etapa intermediária no cliente:

1. Exigir usuário autenticado e token hexadecimal com exatamente 64 caracteres.
2. Calcular SHA-256 do token; fazer uma leitura inicial sem lock para obter o `couple_id`.
3. Travar primeiro a linha do casal e depois a linha do convite (`FOR UPDATE`). Revalidar token, estado e expiração após adquirir os locks.
4. Confirmar convite `pending` e não vencido; casal `pending`; convidante ainda é membro atual; existe exatamente uma membership atual.
5. Recusar o próprio convidante/conta criadora como destinatário.
6. Confirmar que a conta destinatária não tem outro vínculo atual. O índice único parcial existente em `couple_members(user_id) WHERE ended_at IS NULL` é a proteção final contra chamadas concorrentes.
7. Inserir o destinatário em `couple_members` com role `admin`. O trigger de membership valida o limite e a condição de segundo integrante.
8. Atualizar o casal de `pending` para `active`; o trigger existente exige exatamente dois vínculos atuais e define `activated_at`.
9. Marcar o convite como `accepted`, preenchendo `accepted_by` e `accepted_at`.
10. Retornar o `couple_id`.

A ordem dos locks deve ser consistente (`couples` antes de `couple_invitations`) em criação, renovação, revogação e aceite, evitando deadlocks entre operações concorrentes. Se qualquer etapa falhar, a transação inteira deve sofrer rollback: não pode sobrar membership sem ativação nem convite aceito sem vínculo.

Convite expirado pode ser marcado `expired` durante uma operação que conclui com sucesso (não atualizar e depois lançar exceção na mesma transação, pois o rollback desfaria a expiração).

## Rotas e experiência

### Criador

1. Em Casa/Hoje, quando não existe casal, mostrar a ação real **Criar nosso espaço**.
2. Chamar `create_couple()`; não criar registros fictícios nem considerar o casal ativo.
3. Depois de criar o casal pendente, gerar convite pela RPC.
4. Exibir o link com ações **Copiar link**, **Compartilhar** (Web Share API quando disponível) e **Revogar convite**.
5. Exibir a validade; renovar gera outro token e invalida o anterior. Nunca tentar recuperar o token antigo do banco.

### Convidado

1. Abrir `/invite/:token`. A página não revela perfil, e-mail, conteúdo privado ou dados internos do casal.
2. Sem sessão: apresentar login/cadastro no próprio endereço de convite.
3. No cadastro, usar `emailRedirectTo: window.location.href` (ou URL equivalente validada) para que a confirmação de e-mail volte à rota do convite, e não à raiz.
4. No Supabase Auth → URL Configuration, incluir a rota de convite do domínio de Preview e, depois, a rota correspondente de produção. Para o Preview atual, permitir o padrão de caminho `https://id-preview--b4d0cd87-ea1b-4dd5-bd67-64c6f2bceb18.lovable.app/invite/*`; confirmar a correspondência no painel antes do primeiro teste.
5. Com sessão autenticada, mostrar confirmação explícita **Aceitar convite**. Só o clique chama `accept_couple_invitation`.
6. Em sucesso, navegar para `/` substituindo o histórico e carregar o casal ativo.
7. Em caso inválido, vencido, revogado, já utilizado ou casal indisponível, mostrar mensagem simples e permitir voltar ao início. Não revelar se um token parcialmente informado corresponde a uma conta.

A página de convite precisa ficar fora do `AuthGate` aplicado dentro de `src/routes/index.tsx`, mas pode reutilizar o componente de autenticação com uma propriedade de retorno configurável. Não mover o AuthGate para o root sem necessidade. O arquivo de rota deve seguir TanStack file-based routing; `routeTree.gen.ts` é regenerado automaticamente e nunca editado manualmente.

## Casos de concorrência e abuso

- Duas pessoas aceitando o mesmo link: o lock do casal/convite serializa; somente a primeira operação confirma.
- Uma conta tenta aceitar dois convites ao mesmo tempo: índice único parcial em membership impede dois vínculos atuais; a segunda transação faz rollback.
- A pessoa criadora tenta aceitar o próprio link: recusado.
- O convidante já não é membro atual ou o casal foi arquivado: recusado.
- Convite revogado/expirado/aceito: não pode ser reutilizado.
- Novo convite: revoga o anterior antes de inserir outro.
- Terceiro membro: trigger e limite único impedem; nenhuma validação depende do cliente.
- Chamadas RPC sem sessão: recusadas.
- Token inválido: resposta genérica, sem dados do casal.
- Exclusão de conta segue bloqueada pelas FKs RESTRICT enquanto houver histórico; política de remoção/anonimização precisa ser decidida em etapa própria.

## Testes obrigatórios antes de declarar pronto

Com duas contas reais, além de testes SQL controlados:

1. A cria casal: status pending, uma membership admin.
2. A gera convite: token aparece uma vez; banco contém somente hash; expiração é sete dias.
3. B abre link deslogado, cria conta, confirma e retorna à mesma rota.
4. B aceita: status active, duas memberships admin e duas contas vinculadas.
5. A não consegue aceitar o próprio convite.
6. Link vencido, revogado e já aceito falha.
7. Link renovado invalida o anterior.
8. Usuário já vinculado a outro casal não consegue aceitar.
9. Duas chamadas simultâneas não duplicam memberships.
10. Terceira pessoa não consegue entrar.
11. Chamadas diretas à tabela falham; RLS/grants e EXECUTE estão corretos.
12. Nenhuma conta consegue consultar perfis privados ou conteúdo individual do parceiro por causa do vínculo.

## Referências técnicas

- Supabase Database Functions (SECURITY DEFINER, search_path e privilégios): https://supabase.com/docs/guides/database/functions
- Supabase PostgreSQL Extensions (schema onde a extensão foi instalada): https://supabase.com/docs/guides/database/extensions
- Supabase Auth Redirect URLs (allowlist e redirects de confirmação): https://supabase.com/docs/guides/auth/redirect-urls
- Supabase RLS (grants e policies precisam ser configurados conjuntamente): https://supabase.com/docs/guides/database/postgres/row-level-security

## Estado da implementação

- Etapas 1 e 2 aplicadas no Supabase externo.
- Tabela e funções de convite ainda não aplicadas.
- Interface de criação/compartilhamento/aceite ainda não implementada.
- Pendente: acesso do Lovable para enviar e aplicar a migration; o último envio foi recusado por falta de créditos do workspace.
- Não declarar testes de duas contas nem fluxos funcionais até sua execução real.
