# Etapa 2 — couples e couple_members (Supabase externo jffryzeelzxjqbeagecb)

Aplicado; histórico da decisão da etapa 2. Sem Lovable Cloud.

## Atualização de workflow — 2026-11-10
O usuário habilitou o Supabase GitHub Integration com Deploy to production para a branch `main`. Para o projeto, migrations são versionadas em `supabase/migrations/` e aplicadas exclusivamente pela integração oficial. Não usar SQL Editor, CLI push direto ou Lovable Cloud. Só marcar migrations como aplicadas após verificar o resultado do deployment.

Etapa 3: `supabase/migrations/20261110021500_create_couple_invitations.sql` (SHA256 `354faf44613a95cf41a449364aa044fc2847b2cbad6b6a6137ac0a0de46817a3`); deployment pendente de confirmação. Interface ainda não implementada.

## Pré-checagem (somente leitura, antes da migration)
- Confirmar via conector que o banco é `jffryzeelzxjqbeagecb`.
- Confirmar que `public.couples` e `public.couple_members` não existem (o schema atual mostra só `profiles`) e que não há funções com os nomes abaixo.
- Se algo existir, parar e reportar, sem sobrescrever.

## Racional
- Unicidade e limites ficam no banco (índices únicos parciais + trigger com lock de linha), não no cliente.
- Clientes só leem; toda escrita passa por funções SECURITY DEFINER que derivam o usuário de `auth.uid()`. Assim ninguém forja `user_id`, `couple_id`, `role` ou estado.
- Membership tem `ended_at` em vez de DELETE: histórico preservado e usuário livre para novo casal.
- Mesmo padrão da etapa 1: `search_path = ''`, objetos qualificados, REVOKE de PUBLIC/anon, idempotência (`IF NOT EXISTS`).

## Estruturas

### public.couples
| coluna | tipo | regra |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| created_by | uuid not null | FK auth.users(id) ON DELETE RESTRICT |
| status | text not null default 'pending' | CHECK in (pending, active, archived) |
| relationship_started_on | date null | |
| created_at / updated_at | timestamptz not null default now() | |
| activated_at | timestamptz null | |
| archived_at | timestamptz null | |

CHECK `couples_status_timestamps_chk`:
- pending: `activated_at IS NULL AND archived_at IS NULL`
- active: `activated_at IS NOT NULL AND archived_at IS NULL`
- archived: `archived_at IS NOT NULL` (`activated_at` pode ser NULL se arquivado ainda pending)

Índice: `couples(created_by)`.

### public.couple_members
| coluna | tipo | regra |
|---|---|---|
| couple_id | uuid not null | FK couples(id) ON DELETE RESTRICT |
| user_id | uuid not null | FK auth.users(id) ON DELETE RESTRICT |
| role | text not null default 'admin' | CHECK (role = 'admin'): os dois membros têm privilégios iguais |
| joined_at | timestamptz not null default now() | |
| ended_at | timestamptz null | CHECK ended_at IS NULL OR ended_at >= joined_at |
| PK | (couple_id, user_id) | |

Índice:
- `UNIQUE (user_id) WHERE ended_at IS NULL` — no máximo uma relação atual por usuário (garantia concorrente pelo próprio índice). Sem índice extra por `couple_id`: a PK já começa por ele.

Os dois membros são admin, com permissões iguais; `created_by` só identifica o criador.

## Triggers (enforcement)

1. `couple_members_before_insert` (BEFORE INSERT):
   - `SELECT ... FROM public.couples WHERE id = NEW.couple_id FOR UPDATE` — serializa inserções concorrentes no mesmo casal.
   - Recusa se casal `archived`.
   - Conta membros atuais; recusa se já houver 2.
   - Primeiro membro deve ser `admin` e igual a `created_by`; segundo deve ser outro usuário, também `admin`.
   - Força `ended_at = NULL`, `joined_at = now()`.
2. `couple_members_before_update`: só permite `ended_at` de NULL para valor; bloqueia mudança de `couple_id`, `user_id`, `role`, `joined_at`, e reabertura.
3. `couple_members_before_delete` e `couples_before_delete`: sempre recusam (histórico imutável).
4. `couples_before_update`:
   - Bloqueia mudança de `id`, `created_by`, `created_at`.
   - Transições válidas: pending→active, pending→archived, active→archived. Archived não muda mais nada.
   - pending→active exige exatamente 2 membros atuais; define `activated_at`.
   - →archived define `archived_at`.
   - Atualiza `updated_at`.
5. `couples_after_update_archive` (AFTER UPDATE quando vira archived): `UPDATE couple_members SET ended_at = now() WHERE couple_id = NEW.id AND ended_at IS NULL` na mesma transação.

Funções de trigger: plpgsql, `SET search_path = ''`, EXECUTE revogado de PUBLIC/anon/authenticated.

## Funções expostas

- `public.create_couple(p_relationship_started_on date DEFAULT NULL) RETURNS uuid` — SECURITY DEFINER, `search_path = ''`.
  - Exige `auth.uid()` não nulo; advisory lock de transação por usuário.
  - Insere couple (`created_by = auth.uid()`, status pending) e membership admin na mesma transação.
  - Usuário com relação atual recebe erro claro; o índice único é a proteção final.
  - EXECUTE só para `authenticated`.
- `public.can_view_couple(p_couple_id uuid) RETURNS boolean` — SECURITY DEFINER, STABLE, `search_path = ''`; verdadeiro se `auth.uid()` é ou já foi membro do casal. Evita recursão de RLS. EXECUTE só para `authenticated`.

Ativação, convite, aceite e arquivamento por usuário não ganham função exposta agora.

## Privilégios e RLS
- REVOKE ALL de PUBLIC, anon, authenticated nas duas tabelas.
- `GRANT SELECT` para authenticated; nenhum INSERT/UPDATE/DELETE para clientes.
- `GRANT ALL` para service_role (triggers continuam valendo para ela).
- RLS ligada nas duas tabelas, policies `TO authenticated`:
  - `couples_select_member`: `public.can_view_couple(id)`.
  - `couple_members_select_member`: `public.can_view_couple(couple_id)`.
- `profiles` não muda: admin do casal não lê perfil do parceiro. Exposição de nome ao parceiro fica para etapa futura, por função/policy explícita.

## Casos de borda
- Dois `create_couple` simultâneos do mesmo usuário: o índice único parcial rejeita o segundo.
- Duas pessoas entrando ao mesmo tempo no mesmo casal (futuro): `FOR UPDATE` no casal serializa; o terceiro é recusado.
- Usuário em casal pending tentando criar outro: recusado até o pending ser arquivado.
- Casal arquivado: memberships encerradas automaticamente; nenhuma linha muda depois; usuários podem criar novo casal.
- Mesmo par voltando a se unir: novo `couple_id` (PK impede reuso do casal arquivado), o que é desejável.
- Cliente tentando INSERT/UPDATE direto, ou chamando a função com outro user_id: sem grant e sem parâmetro de usuário.
- Ex-membro: vê as duas memberships e o casal histórico, nunca o conteúdo privado de profiles nem membros de outro casal.
- Exclusão de conta em auth.users com casal: bloqueada pelo RESTRICT. Regra de remoção/anonimização precisa ser documentada antes de oferecer exclusão de conta.
- Ativar casal com 1 membro: o trigger recusa.

## Verificações após aplicar (somente leitura + teste controlado)
- Tabelas, índices, triggers, funções e policies presentes; `has_table_privilege` confirma anon sem nada e authenticated só SELECT.
- `prosecdef` e `proconfig` (search_path) corretos; EXECUTE só onde previsto.
- Testes com duas contas no Preview, pela tela, quando houver UI: A cria casal; B não vê; A não cria um segundo. Sem UI nesta etapa, os testes ficam pendentes e documentados.

## Entregáveis
1. Uma migration via ferramenta do Lovable (não editar `supabase/migrations/` à mão).
2. Tipos Supabase regenerados automaticamente.
3. Atualizar `docs/SUPABASE_SCHEMA_PLAN.md` (Estado) e `docs/PROJECT_STATUS.md` com hash e pendências.
4. Sem mudanças de UI, Auth settings ou `profiles`.
