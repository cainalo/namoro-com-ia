# Damas — regras e escopo da primeira implementação

## Variante escolhida

O aplicativo usará **Damas brasileiras**, em tabuleiro 8×8 com 12 peças por jogador. As casas utilizadas são as escuras. As brancas começam.

## Regras cobertas pelo núcleo de jogo

- A pedra anda uma casa na diagonal para a frente.
- A pedra captura para a frente ou para trás, saltando uma peça adversária.
- A captura é obrigatória.
- Uma sequência de captura deve continuar enquanto houver outra captura possível com a mesma peça.
- Quando existem sequências diferentes, vale a Lei da Maioria: deve ser escolhida uma que capture o maior número de peças.
- A dama anda qualquer distância livre na diagonal, para a frente ou para trás.
- A dama captura à distância e pode pousar em qualquer casa livre depois da peça capturada na mesma diagonal.
- Uma peça capturada não pode ser capturada novamente na mesma sequência.
- A pedra só vira dama quando termina o lance na última fileira. Apenas passar por uma casa de coroação durante uma captura não promove a peça.
- Vence quem deixa o adversário sem peças ou sem jogadas legais.

## Implementação nesta etapa

- src/lib/checkers.ts contém somente lógica TypeScript pura: posição inicial, coordenadas, geração das jogadas legais, obrigatoriedade e sequência de capturas, promoção e término por vitória.
- src/lib/checkers.test.ts cobre a posição inicial, captura para trás, Lei da Maioria, dama voadora, promoção, bloqueio e rejeição de jogada ilegal.
- A lógica não depende de React nem do Supabase. Isso permite testar as regras antes de criar tabuleiro, partidas online e persistência.

## Fora do escopo desta etapa

Ainda não foram implementados a interface visual, o modo online para duas contas, a persistência no Supabase, o histórico, o relógio ou as regras de empate. O jogo continua listado como em desenvolvimento na biblioteca; este módulo não o apresenta como disponível.

As regras de empate e outros finais regulamentares serão tratados em uma etapa própria, antes de publicar Damas como jogo completo.

## Referências

- Confederação Brasileira de Jogo de Damas, **Regras Oficiais de Jogo de Damas**: https://midiasstoragesec.blob.core.windows.net/001/2019/04/cbjd-regras-damas-010113.pdf
- Regulamento Técnico de Damas, Fenae: https://jogosfenaemais2025.fenae.org.br/portal/data/files/D3/91/C9/01/FBFB9910DF8D1699403A91A8/Regulamento-Damas.pdf
