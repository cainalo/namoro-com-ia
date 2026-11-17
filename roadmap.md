# Roadmap do Morados

Atualizado em 16 de novembro de 2026. A auditoria e a direção inicial da transformação estão em [docs/TRANSFORMACAO_MORADOS.md](docs/TRANSFORMACAO_MORADOS.md).

## Transformação do produto

- [x] Auditar módulos, estrutura, estilos, testes e pendências conhecidas.
- [x] Documentar direção de produto e critérios de qualidade.
- [ ] Definir e aprovar a identidade visual autoral do Morados.
- [ ] Construir tokens e documentação do design system.
- [ ] Mapear e organizar a cascata CSS sem alterar o resultado visual por acidente.
- [ ] Adicionar testes de interface e regressão para Feed, Conversa, Memórias, Planos e Casa.
- [x] Implementar pilotos visuais próprios para Feed e Memórias, preservando seus fluxos; validação visual no navegador e Android pendente.
- [x] Implementar o piloto visual próprio da Conversa, preservando o cabeçalho de ícones e as preferências do casal.
- [x] Implementar o piloto visual de Planos como agenda responsiva, mantendo calendário, filtros, privacidade e operações existentes; validação visual em navegador e Android pendente.
- [x] Preparar acesso antecipado do criador a Feed e Conversa em casal pendente; a aplicação da migration no Supabase ainda precisa ser confirmada.
- [ ] Transformar os demais módulos gradualmente, preservando suas funções e dando a cada um uma linguagem própria.
- [ ] Fazer uma revisão completa de cada jogo com ficha de design, teste de usabilidade e validação dos modos.

## Confiabilidade e funcionalidades

- [ ] Verificar a aplicação da migration `20261114000000` no Supabase e validar as RPCs relacionadas.
- [ ] Validar cadastro, pareamento e recuperação de estado com duas contas.
- [ ] Revisar exclusão segura de conta, perfil, publicações e mídia.
- [ ] Testar sincronização online de cada jogo, individualmente, com duas contas e dois aparelhos.
- [ ] Implementar chamadas reais com WebRTC, sinalização, TURN e notificações push; a tela atual ainda não representa uma chamada conectada entre aparelhos.
- [ ] Adicionar testes E2E para os fluxos críticos.
- [ ] Validar acessibilidade, desempenho e comportamento em telas pequenas, tablets e desktop.
- [ ] Testar a versão Android em dispositivo físico antes de declarar uma entrega validada em aparelho.

## Entregas já existentes

- [x] Aplicativo React/TypeScript com Supabase próprio e empacotamento Capacitor Android.
- [x] Navegação principal e módulos Feed, Conversa, Memórias, Planos, Casa, Perfil e Jogos.
- [x] Catálogo com 14 jogos e fluxo de entrada individual.
- [x] APK Android build 300 (versão 1.4.4), com assinatura verificada no workflow.
