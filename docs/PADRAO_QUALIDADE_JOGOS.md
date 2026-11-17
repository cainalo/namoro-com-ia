# Padrão de qualidade para jogos do Morados

Este documento orienta a criação, revisão e manutenção de **todos os jogos** do Morados. A qualidade não é medida apenas por a partida chegar ao fim: regras, decisões, ritmo, apresentação, acessibilidade, confiabilidade e vontade de jogar novamente precisam funcionar em conjunto.

## 1. Design antes da implementação

Cada jogo deve ter uma ficha curta de design (GDD proporcional ao escopo), com:

- **Fantasia e promessa:** o que a pessoa imagina que vai fazer e sentir.
- **Público, contexto e duração:** casal, solo, mesmo aparelho ou online; sessão curta ou longa.
- **Objetivo compreensível:** como começar, o que fazer e como a partida termina.
- **Core loop:** ação do jogador → resposta do sistema → consequência → nova decisão.
- **Decisões significativas:** opções diferentes devem produzir consequências ou estratégias distintas.
- **Tensão e ritmo:** alternância de planejamento, ação, descoberta, pausa e resolução.
- **Rejogabilidade:** variação, estratégia, conteúdo ou interação que justifique outra partida.
- **Critérios de encerramento:** vitória, derrota, empate, abandono, reinício e continuidade.

Evitar mecânicas adicionadas apenas para preencher espaço. Cada regra deve sustentar a fantasia, a decisão, o desafio ou a interação.

## 2. Regras de jogos de tabuleiro

- Escrever regras completas, consistentes e sem ambiguidades; separar preparação, turno, ações, exceções e fim de jogo.
- Definir precedência de regras, ações ilegais, empates, bloqueios, repetição, pontuação e condições-limite.
- Validar movimentos e resultados no motor de regras, não apenas na interface.
- Dar feedback claro sobre jogadas possíveis, obrigatórias, inválidas e consequências.
- Considerar equilíbrio entre jogadores, vantagem inicial, duração, sorte versus habilidade e estratégias dominantes.
- Manter histórico suficiente para revisar jogadas e, quando seguro, desfazer ações locais.
- Comparar a implementação com regras de referência confiáveis quando houver uma variante oficial.

## 3. Jogos digitais e experiência

- Ensinar jogando: instruções curtas, contextualizadas e disponíveis novamente.
- Dar resposta imediata e inequívoca a cada ação: seleção, movimento, acerto, erro, progresso, bloqueio e fim.
- Manter controles previsíveis, alvos de toque confortáveis, foco visível e suporte a teclado quando aplicável.
- Adaptar tabuleiro, HUD e tipografia a telas pequenas; impedir scroll/zoom acidental durante a partida sem bloquear acessibilidade do sistema.
- Não comunicar informação essencial somente por cor ou som.
- Tratar pausa, retomada, carregamento, desconexão e encerramento como estados explícitos, nunca como tela aparentemente congelada.
- Usar animações e áudio para reforçar causalidade e emoção, sem atrasar controles nem esconder informação.
- Dar ao resultado um encerramento próprio, estatísticas úteis, revisão quando fizer sentido e um caminho claro para jogar novamente ou sair.

## 4. Arquitetura e programação

- Separar motor de regras/estado da apresentação e dos componentes de interface.
- Preferir transições explícitas de estado e funções determinísticas para regras, pontuação e validação.
- Validar entradas na fronteira do motor; não confiar em botões desabilitados como única proteção.
- Evitar efeitos colaterais dentro de atualizações de estado, timers órfãos, closures obsoletas e condições de corrida.
- Em multiplayer, validar turno e versão no servidor, tratar conflitos, reconexão, estado final e idempotência.
- Persistir apenas o necessário; definir formato de estado versionável e comportamento de retomada.
- Controlar aleatoriedade por rodada/seed quando ela afetar resultado, permitir testes reproduzíveis e evitar que uma resposta mude depois de escolhida.
- Cobrir casos-limite: tabuleiro cheio, empate, captura múltipla, último movimento, duplo toque, atualização simultânea, abandono e reinício.

## 5. Testes e validação

Cada revisão deve incluir, conforme o tipo de jogo:

1. Testes unitários do motor: regras válidas e inválidas, pontuação, vitória/derrota/empate e casos-limite.
2. Testes de componentes: entrada, feedback, bloqueios, pausa, reinício, resultado e navegação.
3. Testes de integração: estado salvo, convites, duas contas, sincronização, reconexão e conflito online.
4. Testes exploratórios com roteiro e registro de defeitos.
5. Playtest com pessoas que não conhecem as regras: observar sem explicar, medir tempo para começar, dúvidas, duração, frustração, estratégias dominantes e vontade de jogar de novo.
6. Validação visual e de interação em celular real, além de tamanhos de tela simulados.

Automação verde não substitui playtest. Build concluído não significa que o jogo foi testado em aparelho físico. Defeitos conhecidos devem permanecer registrados até serem corrigidos e retestados.

## 6. Checklist de aprovação por jogo

- [ ] A promessa e o objetivo ficam claros antes de começar.
- [ ] A primeira partida ensina o essencial sem sobrecarregar.
- [ ] Cada ação tem feedback visível e coerente.
- [ ] O desafio é justo e as decisões têm consequência.
- [ ] O ritmo não é interrompido por esperas ou telas desnecessárias.
- [ ] Regras e resultados cobrem casos-limite.
- [ ] Vitória, derrota, empate e abandono têm tratamento correto.
- [ ] Reiniciar não mantém estado antigo; sair não perde progresso indevidamente.
- [ ] Solo, presencial e online têm comportamento explicitamente definido.
- [ ] A interface funciona em telas pequenas e é acessível.
- [ ] Testes automatizados e playtests foram realizados; pendências estão documentadas.

## Referências de estudo

- Google for Developers — [Playables design best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design): adaptação de tela, legibilidade, toque, onboarding, pausa e fim de jogo.
- Apple Developer — [GameplayKit](https://developer.apple.com/library/archive/documentation/General/Conceptual/GameplayKit_Guide/): estado, entidades/componentes, aleatoriedade e IA para jogos de tabuleiro.
- Estudo — [Software architecture for digital game mechanics: A systematic literature review](https://www.sciencedirect.com/science/article/pii/S1875952121000185): separação entre interação e mecânica e arquitetura de jogos.
- Estudo — [Ten simple rules for designing analogue science games](https://pmc.ncbi.nlm.nih.gov/articles/PMC8192012/): fluxo, desafio e equilíbrio entre habilidade e sorte.
- Estudo — [Educator's blueprint for analog serious games](https://pmc.ncbi.nlm.nih.gov/articles/PMC10685402/): prototipagem, clareza das regras e playtest observacional.
- Interaction Design Foundation — [Usability principles for games](https://ixdf.org/literature/article/the-game-ux-twist-usability-principles-for-games): feedback, clareza, consistência, prevenção e recuperação de erros.
- Unity — [Video Game UI Basics](https://unity.com/blog/video-game-ui-ux-basics): HUD, controles, acessibilidade e feedback.

Este padrão é um processo contínuo: cada jogo pode exigir critérios adicionais específicos de gênero, regras e público.
