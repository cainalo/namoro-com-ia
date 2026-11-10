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
- Primeira versão permite carregar as 100 mensagens mais recentes, enviar texto de até 2000 caracteres e atualizar manualmente. A assinatura Realtime de INSERT foi implementada, com indicação de conexão e fallback à atualização manual. Ainda não há anexos, edição/exclusão, recibos de leitura ou notificações.
- A tabela é consultada por adapter tipado temporário em src/lib/couple-messages.ts; atualizar os tipos gerados do Supabase em etapa separada, sem editar o arquivo gerado manualmente.
- Migration ainda aguarda confirmação de aplicação no banco. Não inserir dados fictícios.
- Código inicial: commit 5c287bf82880e3dff29732f225737d17343bd0d7. Realtime: commit 7051c8baccc47dd80cac054d6ed644a10626e7bd. Migration da publicação Realtime: commit eea6e69b7583b69a20393bfb8cdc52b24e52721a.

## Jogos antigos retirados da biblioteca ativa (2026-11-10)
- Criada a migration `20261110134500_create_couple_game_choices.sql` para guardar as escolhas individuais do jogo Isto ou Aquilo.
- RLS: integrantes atuais e antigos consultam o histórico do próprio casal; somente integrantes atuais de casal ativo podem inserir/alterar a própria escolha. Não há exclusão pelo cliente.
- Criado `src/lib/couple-game.ts` como adapter tipado temporário até a regeneração oficial dos tipos Supabase.
- Os protótipos Isto ou Aquilo e Desafio do dia foram temporariamente retirados da biblioteca ativa durante a reorientação dos jogos. Na etapa posterior, foram recolocados numa categoria própria de Jogos de casal, separados dos jogos gerais de competição e cooperação.
- O jogo foi ligado ao atalho “Jogar a dois” na área Hoje. As escolhas agora sincronizam por Supabase Realtime para eventos INSERT e UPDATE, com status de conexão e atualização manual como alternativa.
- As migrations da tabela e da publicação Realtime ainda não tiveram aplicação confirmada por consulta ao histórico remoto. Não inserir respostas fictícias.
- Commits: migration `8b44e6494a26f75b0aec25b43ba6b36448ad0dae`; adapter `cbe1dfef3e161e65f473548addf93ab57d5ef03a`; componente `4db0bfbb9e7ee55fd5fbb5f58505a38965da354a`; integração `7a7ab2335635397b9242a069085c573a1f499d77`; resumo de resultados `e7fae96bb7bb592279f94c2e70220aba5ddd52ea`; estilos `a72dc8bb18c8d5e9ec9b808c29afb07087ac2dba`.

## Protótipo arquivado — Desafio do dia (2026-11-10)
- Criado `src/components/CoupleDailyChallenge.tsx` com vinte missões curtas para conversa, carinho, criatividade e diversão.
- A missão é determinística a partir do identificador do casal e da data no fuso `America/Sao_Paulo`; os dois dispositivos vinculados ao mesmo casal recebem a mesma missão no mesmo dia.
- Criado `src/components/CoupleGames.tsx` para alternar entre Isto ou Aquilo e Desafio do dia; a navegação existente Hoje → Jogar a dois continua sendo o ponto de entrada.
- Progresso implementado: cada integrante registra a própria conclusão do desafio do dia; o status da outra pessoa chega por Supabase Realtime. O desafio só aparece como concluído pelo casal quando os dois registram a conclusão da mesma missão.
- Histórico: consulta os últimos 30 dias e exibe até os dez dias anteriores mais recentes com registros. Os registros são imutáveis pelo cliente nesta versão; não há desfazer nem pontuação.
- Migration `20261110143000_create_couple_daily_challenge_progress.sql`: tabela com chave por casal/data/integrante, RLS para leitura do próprio casal e inserção pelo próprio integrante atual de casal ativo, somente na data de São Paulo. O cliente não recebe UPDATE ou DELETE.
- Migration `20261110143100_enable_realtime_for_couple_daily_challenge_progress.sql`: inclui a tabela na publicação `supabase_realtime`.
- O adapter `src/lib/couple-daily-challenge.ts` consulta o histórico e insere a conclusão; `src/components/CoupleDailyChallenge.tsx` trata estado atual, atualização ao vivo, histórico e falhas de gravação.
- As duas migrations foram versionadas na `main`, mas sua aplicação no Supabase ainda não foi confirmada. Até a confirmação, gravação e Realtime dependem da implantação dessas migrations.
- Na última conferência, o Lovable reportou `latest_commit_sha=52afa0a24a7099645cd54fa5cea72984888df90b` e `status=ready`; a leitura de `CoupleDailyChallenge.tsx` confirmou o histórico e o filtro por ID de missão. A leitura de `styles.css` foi truncada antes dos estilos adicionados; não foi executado build ou teste visual do Preview.
- Commits: componente do desafio com progresso `8145bf648e7890d7ffabff318bcdb30df4e3dc3a` e ajuste de consistência da missão `52afa0a24a7099645cd54fa5cea72984888df90b`; migrations `c14531bb34d3b503197957c83fd49af97594d8a0` e `782edef1711b5241576f2704fe31720f2e58d344`; adapter `fa67467a65309d5f6724f85b67290ca3e98c6d79`; estilos `367cad42eb93f9093809e9d57cbc610227df9e82`.

## Nova biblioteca de jogos — Lig 4 (2026-11-10)
- A biblioteca ativa foi reorganizada em `src/components/CoupleGames.tsx`, com duas categorias independentes: Competir e cooperar (Lig 4) e Jogos de casal (Isto ou aquilo? e Desafio do dia). Os jogos gerais futuros permanecem separados e identificados como em desenvolvimento.
- Criado `src/components/ConnectFourGame.tsx`: tabuleiro 7×6, sete colunas jogáveis, alternância de turnos, vitória horizontal/vertical/diagonal, empate, revanche e histórico das últimas partidas.
- Criado `src/lib/connect-four.ts` como adapter estreito enquanto os tipos gerados do Supabase não são regenerados.
- A partida e as jogadas são processadas por RPCs no banco. A função de jogada bloqueia a partida, valida jogador/turno/coluna, rejeita turnos desatualizados e só então grava o tabuleiro; o Realtime distribui as atualizações aos dois navegadores.
- Migration `20261110150000_create_connect_four_matches.sql`: tabela com RLS de leitura do próprio casal; sem DML direto pelo cliente; RPCs autorizadas apenas a usuários autenticados; no máximo uma partida ativa por casal; inclusão idempotente na publicação Realtime.
- O Lig 4 está implementado no código, mas a aplicação da migration no Supabase ainda não foi confirmada. A interface mostra estado de banco pendente em vez de simular uma partida se a tabela/RPC não estiverem implantadas.
- Na última conferência, o Lovable reportou `latest_commit_sha=72a182efdf84d242bb1c3e5475e22c7f36a2198c` e `status=ready`; leitura do hub, tabuleiro e adapter confirmou a sincronização. A leitura de `styles.css` retornou conteúdo truncado antes do final do arquivo; os estilos completos foram conferidos na `main`, mas o visual não foi testado no Preview.
- Jogos previstos para as próximas etapas: Damas, Xadrez, Batalha Naval, Dominó, Truco e Quiz. Estão identificados como em desenvolvimento, não como disponíveis.
- Não foram executados build, testes automatizados ou testes com duas contas; os checks de CI não foram disponibilizados nesta etapa.
- Commits: migration e correções `ae6ffa4bed585b3267ed4cb121d2e5d688db4948`, `89ac1f36ad20db0d6f5af5be3a3aaa66af9403c9`, `cb6b3fe24db81e0339b030147a8b832ca6e532e6` e `63b2c96850c67812592880a45ed1f08f6b500225`; adapter `23bbe25320975bea210988892a4b9997a2ce15cc` e correção `bb2e45f3fd3300fe4f1177b234f8ea79c2b915a3`; tabuleiro `6b69633f7cb3597d16b7e9a8645f60d3f78b4865`, estado de banco pendente `ed3cedddf74d3f743feb030ba78682003b1d8437` e rótulos de jogadores `f9e4c5436ed85e1ce6618c828cc32971e2aedaaa`; biblioteca `7aa33e7b01a0a5deff500f1cc8fbf99c77345589`; estilos `bbad06ff8fd795f7eaee3e34192843227dde8e5b`.

## Organização da biblioteca — jogos gerais e jogos de casal (2026-11-10)
- A biblioteca agora tem duas categorias visíveis: `Competir e cooperar` e `Jogos de casal`.
- Lig 4 continua na categoria geral de jogos para competir/cooperar.
- Isto ou aquilo? e Desafio do dia voltaram numa categoria própria de jogos de casal, com seleção independente.
- Damas, Xadrez, Batalha Naval, Dominó, Truco e Quiz continuam listados como próximos jogos, sem serem apresentados como disponíveis.
- Não houve alteração de schema nesta etapa. Os jogos de casal continuam dependentes das migrations anteriores de respostas e progresso, cuja aplicação no Supabase ainda não foi confirmada.
- Commits: reorganização do catálogo `ab07ee9291be35e18269b37b2c6a144d456a7e4d`; estilos das categorias `455661e82d33e323f2d9b5f979febb56e8ad5701`.

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
- [x] Implementar a interface para criar o casal, gerar/renovar/revogar link e aceitar convite. A rota de convite ainda depende da regeneração oficial de src/routeTree.gen.ts.
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
- A migration de mensagens 20261110131600_create_couple_messages.sql e a migration 20261110132200_enable_realtime_for_couple_messages.sql foram adicionadas à main. A aplicação de ambas no Supabase ainda não foi confirmada.
- O Lovable reconhece a branch main e reporta o projeto como ready. Não há checks de CI nos commits recentes e os comandos de testes/build não foram executados nesta etapa.

### Ciclos seguintes
1. Conversas e feed.
2. Memórias e biblioteca.
3. Organização e vida emocional.
4. Jogos — Lig 4 em implementação online; próximos: Damas, Xadrez, Batalha Naval, Dominó, Truco e Quiz, priorizando regras completas e partidas sincronizadas.
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


## Etapa seguinte de jogos — núcleo de Damas brasileiras (2026-11-10)
- Definida a variante Damas brasileiras: tabuleiro 8×8, 12 peças por jogador e início pelas brancas.
- Criado `src/lib/checkers.ts` com estado inicial, coordenadas, movimentos regulares, captura para trás por pedras, captura obrigatória, sequência de captura, Lei da Maioria, dama voadora, promoção ao final do lance e detecção de vitória por falta de peças ou jogadas.
- Criados testes unitários em `src/lib/checkers.test.ts` cobrindo posição inicial, captura para trás, maioria, dama voadora, promoção, bloqueio e jogadas ilegais.
- Regras e limites desta etapa documentados em `docs/CHECKERS_RULES.md`.
- Esta entrega é somente o núcleo de regras. Ainda não há tabuleiro visual, partidas online, persistência Supabase ou regras de empate. Damas permanece como jogo em desenvolvimento na biblioteca.
- Os testes foram adicionados, mas ainda não foram executados neste ambiente; não há confirmação de build, lint ou integração visual.

## Damas brasileiras — tabuleiro local (2026-11-10)
- Damas agora aparece como jogo selecionável na categoria **Competir e cooperar**; deixou de constar apenas na lista de jogos futuros.
- Criado `src/components/CheckersGame.tsx`, conectado ao motor `src/lib/checkers.ts`. A interface apresenta o tabuleiro 8×8, seleção de peças, destinos legais destacados, contagem de peças, indicação de turno, reinício e fim de partida.
- A interface permite que duas pessoas alternem os turnos no mesmo aparelho. O motor continua responsável por validar os movimentos, capturas obrigatórias, sequências de captura, Lei da Maioria e promoção.
- O modo é explicitamente identificado como **prévia local**. Ainda não há criação de partidas de Damas no Supabase, sincronização entre dispositivos, convite ou histórico persistente. Não apresentar como jogo online.
- Adicionados estilos responsivos em `src/styles.css`, compatíveis com os temas claro e escuro.
- Não foram executados build, testes automatizados ou teste visual no Preview nesta etapa.
- Commits: componente `9147c52415eab7b6bd4fb2dbc36a3d7aafcb8b9f`, ajuste do componente `3c37895e9704c649f5bfdf5a80195e2da6a0f801`, integração à biblioteca `1b0ab4f09f6e8be3fcb8ac31c2d00c9fa00be879`, estilos `6c6142ac9b01839809ccc67c4bd3bd674a34c338`.


## Evolução geral da experiência — Casa e Conversas (2026-11-10)

### Casa — primeira cena isométrica
- Criado `src/components/CoupleHouse.tsx` com uma primeira cena isométrica em SVG: residência medieval de pedra, telhado escuro, pátio, caminhos, árvores e pontos de iluminação.
- A tela foi conectada à navegação **Casa** em `src/routes/index.tsx`; o estado vazio anterior foi removido para essa seção.
- A cena é estática, com seleção local de três pontos (residência, pátio e jardins) e legenda contextual. Cômodos exploráveis, navegação espacial, zoom, mudanças de estação e persistência ainda não existem.

### Conversas — legibilidade dos balões
- Ajustado `src/styles.css` para que mensagens recebidas usem texto escuro sobre pergaminho claro e mensagens enviadas usem texto claro sobre verde profundo.
- Metadados e horários receberam contraste próprio; a largura dos balões foi refinada para telas pequenas.
- Nenhuma alteração foi feita no envio, no Supabase ou no Realtime.

### Validação
- Os arquivos foram versionados na `main`; a sincronização do último commit deve ser confirmada no projeto Lovable.
- Não foram executados build, lint, testes automatizados ou validação visual. A prévia do Lovable permanece conhecida como desatualizada.
- Commits: cena `5713d3a0e385ab4f69c58744adf7b05f7b9da4e9`, integração à navegação `1ddd876b41b81181a354175bbc24b9e47e946367`, estilos da Casa `6e50c58e0c741aaaad914ff472c2a81bb7fb7b7d`, contraste das Conversas `d2549832941fee502a9239a7644943924ebfbc4a`.


## Continuação em etapas encadeadas — Conversas e Casa (2026-11-10)

### Conversas — ancoragem inteligente
- `src/components/CoupleConversation.tsx` agora posiciona o histórico nas mensagens mais recentes ao carregá-lo.
- A tela acompanha novas mensagens somente quando a pessoa já está próxima do fim da conversa; ao ler mensagens antigas, preserva a posição de rolagem.
- O acompanhamento funciona para atualizações recebidas pelo Realtime e não altera envio, banco ou políticas.
- Commit: `5a0029394152f337dfb8700c6972229cc496c09b`.

### Casa — pontos selecionáveis
- `src/components/CoupleHouse.tsx` agora permite selecionar Residência, Pátio e Jardins diretamente no mapa isométrico.
- A seleção usa estado local React e botões acessíveis por toque/teclado, com `aria-pressed` e descrição contextual atualizada.
- Os pontos são marcadores de localização; ainda não abrem cômodos nem executam ações que não foram implementadas.
- Pátio reposicionado para evitar sobreposição com a legenda em telas pequenas.
- Commits: seleção `8272dc449e63e3820ef1b30657f79e1cd965d3a3`, estilos `b1d8cdaef0c160c24dcd3922d81e3413d93b8526`, estado e alinhamento `d43cc7afdf7b08dda752a8696396428b311ce79e` e `69655ab2384ab2435fe27fdaa990a46ab370cb67`.

### Validação
- O Lovable ainda precisa confirmar sincronização desta sequência.
- Não foram executados build, lint, testes automatizados ou validação visual. A prévia permanece desatualizada.


## Planos — primeiro calendário interativo (2026-11-10)
- Criado `src/components/CouplePlans.tsx` e conectado à seção **Planos** em `src/routes/index.tsx`.
- O calendário permite navegar entre meses, selecionar dias, voltar para Hoje e destaca a data atual. A semana começa na segunda-feira e os rótulos usam pt-BR.
- A seleção é local à tela nesta etapa. Ainda não há criação, edição, sincronização ou persistência de compromissos; nenhum evento fictício é exibido.
- Estilos responsivos adicionados a `src/styles.css`, incluindo foco visível e respeito a `prefers-reduced-motion`.
- Commits: componente `73a8ff850e17f890ead095334bbb24413453b8cb`, integração e semântica `ca5e694aeef3ea8088f6c5f5e29cb7984b8e6928` e `ff65d979637e83cfff0de8022e424071f88725f9`, estilos `4f714fc823e2ab28046a97975526adcd82d25fca`.
- Não foram executados build, lint, testes automatizados ou teste visual; a prévia permanece desatualizada.


### Casa — aproximação do mapa
- Adicionados controles de zoom (aproximar, afastar e restaurar escala) em `src/components/CoupleHouse.tsx`.
- A transformação engloba o SVG e os pontos selecionáveis para manter os marcadores alinhados ao cenário.
- O zoom varia de 100% a 145%; controles têm rótulos acessíveis, estados desabilitados e foco visível. A transição respeita `prefers-reduced-motion`.
- Não há movimentação panorâmica nesta etapa.
- Commits: controles `f9d8edd316adbcf52eb0d6c4e4cac5ff389f5d2c`, estilos `d22505a2aa7e2e62af100e95fd76c255fd312fe5`, correção estrutural `3c4bcddaf01d7843e3985b11a6eebec96c4d6ee7`.
