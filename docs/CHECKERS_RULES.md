# Damas brasileiras — regras e escopo implementado

## Variante

O Morados usa **Damas brasileiras**, em tabuleiro 8×8, com 12 pedras por lado. Apenas as casas escuras são utilizadas e as peças claras começam.

## Movimento e captura

- A pedra anda uma casa na diagonal para a frente.
- A pedra captura para a frente e para trás, saltando uma peça adversária.
- A captura é obrigatória. Se houver mais de uma alternativa, aplica-se a Lei da Maioria: deve ser escolhida uma sequência que capture o maior número de peças.
- Uma sequência continua enquanto a mesma peça puder realizar outra captura. Uma peça capturada não pode ser capturada novamente na mesma sequência.
- A dama anda qualquer distância livre na diagonal, para a frente ou para trás. Ao capturar, pode pousar em qualquer casa livre depois da peça capturada na mesma diagonal.
- A mesma casa vazia pode ser atravessada mais de uma vez durante uma sequência.
- A pedra só vira dama quando termina o lance na última fileira. Passar pela fileira de coroação durante uma captura não promove a peça; ela continua como pedra até o fim do lance.
- Vence quem captura todas as peças adversárias ou deixa o outro lado sem jogada legal.

## Empates implementados

O estado do jogo registra os critérios de empate para que funcionem da mesma forma no modo individual, no mesmo aparelho e na sincronização online.

1. **Repetição tripla:** a mesma disposição das peças, com o mesmo lado a jogar, aparece pela terceira vez. O aplicativo declara o empate automaticamente; isso automatiza a reivindicação prevista no regulamento competitivo.
2. **Vinte lances de cada lado só com damas:** são contados 40 meios-lances consecutivos sem capturas nem movimentos de pedras. Uma captura ou o movimento de uma pedra zera essa contagem.
3. **Finais regulamentares de poucas peças:** a contagem se aplica a 2 damas contra 2 damas; 2 damas contra 1 dama; 2 damas contra 1 dama e 1 pedra; 1 dama contra 1 dama; 1 dama contra 1 dama e 1 pedra; e aos finais de 3 damas, 2 damas e 1 pedra, ou 1 dama e 2 pedras contra uma dama solitária na grande diagonal. O empate é declarado depois de até cinco lances de cada lado (10 meios-lances). Capturas e movimentos de pedras não zeram essa contagem.

A variante de tabuleiro 10×10, relógio de competição, queda de tempo e demais procedimentos de arbitragem não fazem parte deste jogo.

## Interface e modalidades

- A interface reutiliza um único tabuleiro e motor de regras nos modos individual, presencial e online.
- No modo individual, Morados responde automaticamente após a jogada da pessoa.
- No modo presencial, as duas pessoas alternam as jogadas no mesmo aparelho.
- No modo online, o estado completo — incluindo contadores de empate e posições já ocorridas — é sincronizado pelo host de partidas existente. Não foi criada uma tabela ou migration específica para Damas.
- O resultado de vitória, derrota ou empate aparece em uma tela integral, com contagem de jogadas, explicação do encerramento, reinício e retorno ao catálogo.
- O desfazer permanece disponível nos modos locais e fica desativado no online, para não contrariar o estado compartilhado.

## Estrutura e testes

- `src/lib/checkers.ts`: motor puro de regras, geração de jogadas, capturas em cadeia, promoção, vitória, repetição e critérios de empate.
- `src/lib/checkers.test.ts`: testes de posição inicial, captura para trás, Lei da Maioria, dama voadora, promoção, bloqueio, jogada ilegal e critérios de empate.
- `src/components/CheckersGame.tsx`: interface do tabuleiro, seleção de caminhos de captura, contagem de peças e modos individual/presencial.
- `src/components/CheckersGame.test.tsx`: testes de resultado em tela integral, identificação da derrota no modo individual, bloqueio de interação fora da vez e reinício.
- `src/components/OnlineGameHost.tsx`: resultado online, incluindo motivo do empate, variante e total de jogadas.

## Referência normativa

A implementação segue as **Regras Oficiais de Jogo de Damas** da Confederação Brasileira de Damas para o tabuleiro de 64 casas, em especial as disposições sobre movimento e captura, Lei da Maioria, repetição, contagem de lances de damas e finais de poucas peças.

- Confederação Brasileira de Damas, *Regras Oficiais de Jogo de Damas* (Anexo I, tabuleiro de 64 casas): https://midiasstoragesec.blob.core.windows.net/001/2019/04/cbjd-regras-damas-010113.pdf
- Regulamento Técnico de Damas, Jogos Fenae: https://jogosfenaemais2025.fenae.org.br/portal/data/files/D3/91/C9/01/FBFB9910DF8D1699403A91A8/Regulamento-Damas.pdf
