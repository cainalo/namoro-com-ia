# Supabase — plano de esquema inicial

Este documento é uma especificação de implementação. Não aplicar como migração manual. O repositório está conectado ao Lovable e AGENTS.md determina que alterações no esquema sejam executadas pelo Lovable.

## Autenticação antes das tabelas

O cliente Supabase e a tela de entrada usam o Supabase Auth com e-mail e senha. Antes de testar cadastro:
- Confirmar se a confirmação de e-mail está habilitada.
- Definir Site URL e Redirect URLs para os domínios reais do Lovable Preview e da futura hospedagem.
- Nunca desabilitar confirmação de e-mail em produção apenas para contornar uma falha de redirecionamento.
- Não confundir a existência de usuários em auth.users com perfis da aplicação; profiles será criado depois por trigger ou função segura.

## Antes de criar tabelas

1. Confirmar que o projeto Supabase externo conectado ao Lovable é o pretendido.
2. Consultar auth.users, extensões, tabelas, buckets, políticas RLS e funções existentes.
3. Não apagar nem recriar objetos existentes sem comparação.
4. Fazer a mudança inicial de forma aditiva e idempotente sempre que possível.
5. Após aplicar, regenerar os tipos Supabase pelo fluxo oficial da ferramenta.

## Fundação de identidade

### profiles
- id uuid primary key references auth.users(id) on delete cascade
- display_name text
- avatar_path text null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

O perfil é individual. Cada pessoa pode ler o próprio perfil e os campos explicitamente públicos para o parceiro. Não usar uma coluna JSON única para permissões de todas as funcionalidades.

### couples
- id uuid primary key default gen_random_uuid()
- created_by uuid not null references auth.users(id)
- status text not null check in pending, active, archived
- relationship_started_on date null
- created_at timestamptz not null default now()
- archived_at timestamptz null

Não incluir conteúdo pessoal nem presumir que administrador pode ler diários privados.

### couple_members
- couple_id uuid references couples(id) on delete restrict
- user_id uuid references auth.users(id) on delete restrict
- role text check (role = 'admin'): os dois membros são admin, com privilégios iguais
- joined_at timestamptz
- primary key (couple_id, user_id)

A regra de no máximo duas pessoas e de uma única relação ativa por usuário precisa ser garantida por função transacional, trigger ou outra estratégia concorrente segura. Não depender de validação no cliente.

### couple_invitations
- id uuid primary key
- couple_id uuid not null references couples(id)
- inviter_user_id uuid not null references auth.users(id)
- token_hash text not null unique
- status text check in pending, accepted, revoked, expired
- expires_at timestamptz not null
- accepted_by uuid null references auth.users(id)
- accepted_at timestamptz null

O token bruto deve ser exibido apenas uma vez e não armazenado. Aceite deve validar prazo, estado, utilizador e capacidade do casal numa única transação.

## Modelo de visibilidade de conteúdo

Cada tabela de conteúdo deverá definir explicitamente:
- owner_id uuid not null
- couple_id uuid null
- visibility: private, shared, selected, scheduled, secret ou temporary
- available_at timestamptz null
- expires_at timestamptz null

O significado de cada estado deve ser implementado em uma função de autorização central e testada:
- private: somente criador.
- shared: membros atuais do casal ativo.
- selected: criador e destinatários explicitamente autorizados.
- scheduled: invisível até available_at; depois segue destinatários definidos.
- secret: criador somente até reveal_at; depois destinatários definidos.
- temporary: respeita expires_at e não deve continuar acessível por URL pública ou cache.

A administração do casal não concede acesso a conteúdo privado.

## Segurança e desempenho

- RLS habilitada em todas as tabelas expostas pelo Data API.
- As políticas devem especificar o papel, por exemplo TO authenticated.
- Usar (select auth.uid()) nas políticas quando adequado, para evitar avaliação repetida por linha.
- Indexar colunas usadas por políticas, em especial user_id e couple_id.
- Nunca confiar em user_id, couple_id, role ou visibility enviados pelo cliente sem validar a relação com auth.uid().
- SECURITY DEFINER somente quando necessário. Fixar search_path, qualificar objetos com schema, revogar EXECUTE de PUBLIC e anon quando apropriado e conceder somente aos papéis necessários.
- Sem políticas amplas USING (true) para conteúdo privado.
- Convites, vínculos e desvinculação implementados no servidor em transações atômicas.
- Não expor service role key no navegador.
- Logs de auditoria não devem armazenar texto de mensagens, conteúdo de diários ou tokens.
- Buckets privados. As operações de arquivos devem usar a API do Storage; não alterar diretamente storage.objects.
- Policies de storage.objects devem consultar a permissão do objeto proprietário; não tornar o bucket público por conveniência.
- Realtime habilitado somente para tabelas que precisam de sincronização e com políticas RLS correspondentes.

## Ordem de implantação

1. profiles.
2. couples e couple_members.
3. funções transacionais de convite, aceite, vínculo e desvinculação.
4. couple_invitations.
5. funções de autorização e testes de RLS.
6. preferences e devices depois da fundação.
7. tabelas de mensagens e memórias somente após provar isolamento entre duas contas.

## Testes obrigatórios com duas contas

- Usuário A não consegue ler perfil privado ou diário de B.
- B não consegue ler um segredo de A antes de reveal_at.
- Ambos conseguem ler registros shared do casal ativo.
- Usuário fora do casal não consegue consultar nada pelo ID previsível.
- Não é possível vincular uma terceira conta.
- Duplo clique ou concorrência no convite não cria dois vínculos.
- Um membro não consegue forjar couple_id, owner_id ou papel administrativo.
- Após desvinculação confirmada pelos dois, o casal fica archived e o conteúdo compartilhado vira somente leitura.
- Conteúdos individuais permanecem com seus criadores.
- Remoção de conta e recuperação seguem regra documentada, sem cascade destrutivo inadvertido.

## Referências Supabase

- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Database functions: https://supabase.com/docs/guides/database/functions
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals

## Estado

- Etapa 1 (profiles) aplicada no Supabase externo jffryzeelzxjqbeagecb. Etapas 2 em diante não aplicadas.
  - Migration: supabase/migrations/20261109234320_16e8a6fb-466e-49d4-bda3-7f087ee51be8.sql
  - SHA256: 932ca0891763b547c8ec5187a917fa73fa3c2b550b96341c5256de622fc5639b
  - Commit com migration e tipos regenerados: 8575c81c63a89a8302050bdd2e4e461e5f6b26f2
- Aplicado: public.profiles com FK id → auth.users(id) ON DELETE CASCADE; RLS ligada; policies TO authenticated de SELECT e UPDATE somente do próprio id; sem policy de INSERT/DELETE; anon sem privilégios; authenticated com SELECT e UPDATE apenas em display_name e avatar_path; trigger AFTER INSERT em auth.users criando o perfil (SECURITY DEFINER, search_path vazio, EXECUTE revogado de PUBLIC/anon/authenticated); trigger de updated_at; backfill idempotente só de ids.
- Verificação após aplicação (somente leitura): 1 auth user, 1 profile, 0 usuários sem perfil.
- Não testado: trigger com um novo cadastro, isolamento entre duas contas, atualização de perfil pelo cliente.
- Etapa 2 (couples, couple_members) aplicada no mesmo projeto. Convites, aceite e desvinculação não implementados.
  - Migration: supabase/migrations/20261110014046_86a99b94-7a96-4b84-af68-89c7d5bcc439.sql
  - SHA256: d6349f7c35812bd1dcca383f62b99341d3b85fc1e190e85b864ca372d8451e63
  - Aplicado: FKs ON DELETE RESTRICT; CHECKs de status/timestamps e ended_at >= joined_at; PK (couple_id, user_id); único parcial de uma relação atual por usuário; role restrito a 'admin' (default 'admin'); triggers de inserção (FOR UPDATE no casal, máx. 2, criador admin primeiro, segundo outro usuário também admin), imutabilidade de membership, bloqueio de DELETE, transições pending→active (exige 2 membros), pending/active→archived, archived imutável, encerramento automático das memberships ao arquivar; create_couple (SECURITY DEFINER, auth.uid(), advisory lock) e can_view_couple (membro atual ou antigo); RLS com apenas SELECT TO authenticated via can_view_couple; anon sem privilégios; authenticated só SELECT; funções de trigger sem EXECUTE para clientes.
  - Verificação após aplicação (somente leitura): estruturas, grants, policies, search_path e EXECUTE conferidos; 0 casais e 0 memberships.
  - Correção (dois admins): supabase/migrations/20261110014254_2a6b3199-0603-411b-a6f6-eb467176fac6.sql, SHA256 79c3bd8d1574297090c4a585ae2bdb2e47ec51b795fa3fc253bfabdd4a32a3c6. CHECK role = 'admin', default 'admin', índice couple_members_one_current_admin_uidx removido, couple_members_before_insert exige segundo membro admin. Verificado com 0 casais e 0 memberships, sem funções ou policies referenciando 'member'.
  - Linter: create_couple e can_view_couple executáveis por authenticated, intencional.
  - Não testado: create_couple pelo app, concorrência, isolamento com duas contas, transições de status.
