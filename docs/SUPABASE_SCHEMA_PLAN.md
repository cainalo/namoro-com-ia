# Supabase — plano de esquema inicial

Este documento é uma especificação de implementação. Não aplicar como migração manual. O repositório está conectado ao Lovable e AGENTS.md determina que alterações no esquema sejam executadas pelo Lovable.

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
- role text check in admin, member
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

- O esquema observado em src/integrations/supabase/types.ts não declarava tabelas da aplicação.
- Nenhum SQL ou migration foi aplicado por este documento.
- Antes de aplicar, é necessária inspeção ao vivo do projeto Supabase conectado.
