# Plano: Conversa, Chamadas (UI) e Jogos online

## Estado confirmado (leituras desta etapa)
- Banco externo `jffryzeelzxjqbeagecb`: `couple_game_matches` existe e está vazia (0 partidas; nada a migrar). Hoje ela só aceita `game_key = 'connect-four'` e as RPCs `create_connect_four_match` / `play_connect_four_move` são específicas do Lig 4. Está publicada no Realtime.
- Biblioteca (`CoupleGames.tsx`) tem 13 ids: connect-four, checkers, this-or-that, daily-challenge, investigation, investigation-train, chess, battleship, domino, truco, quiz, escape-room, island-survival. Só connect-four, this-or-that (`couple_game_choices`) e daily-challenge (`couple_daily_challenge_progress`) persistem; os demais têm estado só local no componente.
- Lig 4: a mensagem "banco não compatível" aparece quando a leitura falha com `42P01`/`PGRST205`. Como a tabela existe, a causa real ainda não está confirmada (suspeitas: cache de schema, grants ou lista de colunas). A fase 3 começa reproduzindo o erro.
- Conversa: as cores dos balões vêm de `--conversation-bubble-own/other`, mas `styles.css` (~linha 22685) aplica `background: ... !important` de forma ampla. Isso explica o fundo verde em adesivos, presentes e anexos. A rolagem fica em `threadRef`, com `scrollTo(scrollHeight)`.

## Fase 1 — Conversa (só visual e rolagem)
- Lista de mensagens com altura total entre o cabeçalho e o compositor. Sem `overflow:hidden` nem máscaras nos limites, com `padding` de safe area e `overscroll-behavior: contain`.
- Ancorar no fim: um sentinel no fim e `scrollIntoView({block:"end"})` depois que a mídia carrega (ResizeObserver no thread). A última mensagem fica encostada no compositor.
- Novo balão: raio 20px com o canto do lado do remetente menor, hierarquia nome/hora, largura máxima de 78% (64% no desktop), espaçamento agrupado por remetente.
- A cor personalizada vale só para `.conversation-bubble--text`. Adesivo, presente, mídia e anexo ficam com fundo transparente ou card neutro. Remover os `!important` globais.
- Arquivos: `CoupleConversation.tsx`, `src/styles.css`.

## Fase 2 — Chamadas (UI honesta, sem infraestrutura)
- Botões de áudio e vídeo no cabeçalho da conversa abrem uma rota em tela cheia: `/conversa/chamada?tipo=audio|video`.
- A tela tem: botão voltar, avatar e nome da pessoa, e o estado "Chamadas em breve: ainda não conectam".
- No vídeo, há uma prévia opcional da própria câmera via `getUserMedia`, só se a pessoa tocar em "Testar câmera". As tracks são liberadas ao sair. Botões de microfone, câmera e encerrar só controlam a prévia local.
- Nada de discar, nada de mensagem falsa de "chamando" e nada de app externo.
- Fica para o futuro: WebRTC (RTCPeerConnection), sinalização via Supabase Realtime broadcast ou tabela `couple_calls`, TURN/STUN (serviço pago, ex. Twilio/Cloudflare Calls), push para tocar no outro aparelho e permissões nativas no Android (CAMERA, RECORD_AUDIO).
- Arquivos: nova rota `src/routes/...chamada.tsx`, novo `CallScreen.tsx`, `CoupleConversation.tsx`.

## Fase 3 — Infraestrutura genérica de partidas online
Migration aditiva (pelo fluxo GitHub → Supabase, já autorizado):
- `couple_game_matches`: trocar o CHECK por uma lista de game_keys permitidos. Adicionar `mode` ('competitive'|'cooperative'), `state jsonb`, `version int` e `participants_ready uuid[]`. Manter `board`/`turn_number` para o Lig 4. Todas as linhas atuais continuam válidas (hoje não há nenhuma).
- Índice único parcial: uma partida ativa por (couple_id, game_key).
- RPC `create_game_match(p_couple_id, p_game_key)`: membro atual, casal ativo, retorna a partida ativa se já existir.
- RPC `submit_game_action(p_match_id, p_expected_version, p_action jsonb)`: lock FOR UPDATE, checa membro e versão (`stale_version`), checa turno nos jogos competitivos, valida a ação com um validador por jogo em plpgsql, grava `state` e `version+1`.
  - Os jogos de regras complexas (xadrez, truco, dominó) precisam de validação no servidor para impedir trapaça. Como etapa intermediária, há uma alternativa: o servidor garante só turno e versão, e o cliente aplica as regras. Essa é a ambiguidade a decidir (ver abaixo).
- RPC `abandon_game_match`. Sem INSERT/UPDATE direto: as RLS ficam como hoje (SELECT via `can_view_couple`).
- Informação oculta (Batalha Naval, mãos no Truco e no Dominó): o `state` público não pode conter o segredo do oponente. Precisa de uma tabela `couple_game_private_state` (RLS: user_id = auth.uid()) e RPCs que revelam só o necessário.
- Corrigir o erro do Lig 4: reproduzir, ajustar o tratamento de erro e a leitura, e migrar para as RPCs genéricas mantendo as antigas como wrapper.

## Fase 4 — Integração por jogo (incremental, um por PR)
Hook compartilhado `useOnlineMatch(gameKey)`: carrega, assina o Realtime (canal único e cleanup), reenvia com versão e retoma em outro aparelho (pela partida ativa do casal). Cada jogo separa `reducer(state, action)` puro em `src/lib/games/<id>.ts`, usado tanto no modo local quanto no online.

Ordem: chess → checkers → connect-four (refatorar) → quiz → domino → truco → battleship → cooperativos (escape-room, island-survival, investigation, investigation-train, com progresso compartilhado e sem turno, ações idempotentes) → this-or-that e daily-challenge (já online; só unificar o selo "Online").

## Testes
- Unitários (vitest): reducers de cada jogo (jogada legal/ilegal, fim de jogo), helper de versão/turno, cálculo de estilos dos balões (texto pinta, adesivo não).
- Banco (SQL read-only e RPC em transação de teste): fora de turno → erro; versão antiga → `stale_version`; não membro → negado; segundo create devolve a mesma partida.
- Build e typecheck em cada fase.
- Playwright com dois contextos e duas contas reais: A joga, B vê em menos de 2s; B tenta jogar fora da vez e é bloqueado; recarregar retoma a partida; cooperativo soma o progresso. A segunda conta ainda não existe e precisa ser criada pelo usuário.
- Conversa: prints em 390px e 1280px no topo e no fim do histórico.

## Entregável agora vs. futuro
- Agora: fases 1 e 2, a migration da fase 3 e o Lig 4 e o xadrez online.
- Próximas etapas: demais jogos, um por vez; informação oculta; chamadas reais (WebRTC/TURN/push).

## Decisões pendentes
1. Validação de regras: no servidor para todos (mais seguro, mais lento de fazer) ou só turno e versão no servidor, por enquanto, com o cliente confiável entre o casal?
2. Uma partida ativa por jogo, ou várias simultâneas?
3. Na tela de chamada, mostrar a prévia da câmera ou só um placeholder?
