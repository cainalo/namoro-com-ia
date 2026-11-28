# Transformação do Morados — auditoria e direção de produto

**Baseline:** 16 de novembro de 2026  
**Commit auditado:** `06f8c1c1eb242871879e04b81d94bd104f850d92`  
**Escopo desta etapa:** diagnóstico e fundação do processo. Nenhuma tela, regra de negócio, dado ou integração foi alterada nesta auditoria.

## 1. Princípio de transformação

O Morados não deve parecer um template de aplicativo nem uma coleção de telas independentes. Deve ser reconhecível como um universo privado para duas pessoas: íntimo, acolhedor, vivo e autoral.

A transformação precisa preservar a utilidade e os fluxos que já funcionam. Cada módulo pode ter uma composição e um ritmo próprios, mas todos devem compartilhar a mesma personalidade de marca.

**Direção proposta — um universo íntimo, vivo e feito a dois:**
- Paleta de base terrosa e natural, com verdes profundos, tons minerais e superfícies quentes; cores vivas entram como acentos intencionais, não como decoração aleatória.
- Ilustrações vetoriais próprias, com formas orgânicas e linguagem consistente. A casa/isometria pode inspirar a ambientação, sem transformar todas as telas em mapas ou cenários.
- Tipografia editorial para momentos expressivos e tipografia funcional para leitura, controles e informação.
- Textura, profundidade, luz e movimento usados com parcimônia e propósito.
- Componentes compartilhados para acessibilidade, estados e comportamento; composições específicas para cada módulo.
- Referências externas servem para aprender princípios, nunca para copiar interfaces ou identidades.

## 2. Mapa atual do produto

O código atual organiza o produto em:
- **Feed:** publicações, mídia, áudio, música e conteúdo compartilhado.
- **Conversa:** mensagens, anexos, áudio, configurações e interface de chamada.
- **Memórias:** registros com visibilidade privada ou compartilhada.
- **Planos:** calendário e eventos.
- **Casa/Universo:** ambiente ilustrado com áreas exploráveis e interior.
- **Jogos:** catálogo com 14 experiências, capas individuais e modos solo, local e online.
- **Perfil e pareamento:** dados pessoais, mídia e vínculo do casal.
- **Assistente:** chat opcional integrado ao aplicativo.

A navegação principal está concentrada na rota inicial, enquanto cada módulo possui seus próprios componentes e partes de estilo.

## 3. Diagnóstico técnico e visual

### 3.1 Sistema visual em camadas

O arquivo `src/styles.css` tem aproximadamente **861 KB e 30.687 linhas**. Há ainda estilos específicos para acesso inicial, jogos, convites, perfil e experiências narrativas.

Os comentários e blocos do CSS mostram sucessivas direções visuais — Natural, Medieval, referências ao Pórtico e Editorial Vibrante — além de uma camada final Natural que declara prevalecer sobre estilos anteriores. Isso demonstra evolução por sobreposição, não um sistema visual único e explícito.

**Risco:** regras concorrentes e seletores redefinidos dificultam prever o resultado de uma alteração. Não é seguro fazer uma limpeza em massa ou trocar o tema inteiro de uma vez.

**Decisão:** primeiro mapear tokens, componentes e dependências visuais; depois migrar módulo por módulo, preservando a ordem e validando o resultado em cada etapa.

### 3.2 Componentes concentrados

Alguns arquivos de interface são grandes:
- `CoupleConversation.tsx`: cerca de 1.769 linhas.
- `CoupleFeed.tsx`: cerca de 1.663 linhas.
- `CouplePlans.tsx`: cerca de 863 linhas.
- `CoupleMemories.tsx`: cerca de 706 linhas.
- `routes/index.tsx`: cerca de 930 linhas.

Tamanho, por si só, não prova um defeito. Porém, esses arquivos concentram interface, estados, chamadas de dados e comportamentos que merecem ser separados gradualmente.

**Decisão:** refatorar por responsabilidade e com testes de caracterização, sem reescrever módulos inteiros apenas para reduzir linhas.

### 3.3 Testes e confiabilidade

O projeto utiliza Vitest e possui testes para autenticação, primeiro acesso, perfil, lógica de jogos, convite online e algumas experiências narrativas.

Na árvore auditada não foram encontrados testes de componente dedicados para Feed, Conversa, Memórias, Planos e Casa, nem uma infraestrutura explícita de testes visuais/E2E baseada em Playwright.

**Risco:** mudanças de aparência e interação em áreas centrais podem regredir sem serem detectadas pelos testes atuais.

**Decisão:** adicionar testes por fluxo e por módulo antes de mudanças extensas; introduzir testes E2E e capturas de referência para os caminhos críticos.

### 3.4 Chamadas WebRTC — implementação e validação pendente

A implementação atual já contém uma tela de chamada com `RTCPeerConnection`, captura de áudio/vídeo, troca de ofertas e respostas SDP por Supabase Realtime, obtenção de servidores ICE por uma Edge Function autenticada e encerramento da chamada. A migration `20261117120000_private_couple_call_signaling.sql` define políticas de leitura/escrita do broadcast para os dois integrantes atuais de um casal ativo. Portanto, a descrição anterior de uma interface apenas local está desatualizada.

Isso **não equivale a declarar o recurso pronto para produção**. Permanecem pendentes:
- confirmar que a migration foi aplicada no projeto Supabase de produção e que as políticas Realtime foram verificadas;
- executar chamadas de áudio e vídeo entre duas contas em aparelhos distintos, incluindo recusa, encerramento, permissões negadas, reconexão e redes restritivas;
- confirmar a configuração real de TURN no ambiente e a conectividade quando STUN direto não basta;
- validar notificações de chamada quando o aplicativo está em segundo plano ou fechado — push ainda consta como pendente no roadmap;
- verificar a experiência publicada e documentar os resultados dos testes.

A Edge Function retorna STUN quando TURN não está configurado; o próprio cliente avisa que algumas redes podem não completar a conexão. O README explica que TURN exige um serviço externo Coturn compatível e segredos configurados no Supabase, sem expor o segredo ao cliente.

**Decisão:** tratar a sinalização e a negociação WebRTC como implementadas no código, mas manter chamadas entre aparelhos, configuração de produção, TURN e notificações como validações/entregas pendentes. Não afirmar conectividade real com base apenas na presença dos componentes ou nos testes unitários do parser de sinais.

### 3.5 Documentação desatualizada

O README ainda descrevia a ideia inicial de uma tela branca com a palavra “NAMORO”, e o roadmap misturava tarefas antigas com estados que precisam ser reavaliados.

**Decisão:** substituir as instruções iniciais por documentação real do produto e manter um roadmap verificável.

## 4. Regras de qualidade visual

Nenhuma tela será aprovada apenas por parecer moderna. Cada mudança deverá responder:

1. Qual problema de uso ou comunicação esta tela resolve?
2. O que deve chamar a atenção primeiro, segundo e terceiro?
3. O que é conteúdo, ação, contexto e decoração?
4. Por que esta composição é adequada a este módulo?
5. Como ela se adapta a telas pequenas, médias e grandes?
6. Como ficam carregamento, vazio, erro, sucesso e conteúdo extenso?
7. O que a diferencia de uma solução genérica?

Evitar:
- colocar tudo em cards;
- repetir a mesma grade, hero e botão em páginas com objetivos diferentes;
- usar gradientes, sombras, blur, brilhos ou animações sem função;
- decorar com ícones genéricos quando uma ilustração ou metáfora própria resolveria melhor;
- esconder falhas de conteúdo com espaços vazios e caixas repetidas;
- aplicar uma identidade de outro projeto como cópia.

## 5. Direção por módulo

| Módulo | Linguagem a explorar | Prioridade de experiência |
|---|---|---|
| Feed | editorial, social e vivo | leitura, autoria, mídia e descoberta |
| Conversa | imersiva e funcional | foco nas mensagens, composição e confiabilidade |
| Memórias | arquivo afetivo / galeria | encontrar, organizar e revisitar momentos |
| Planos | calendário narrativo e temporal | entender datas, compromissos e privacidade |
| Casa | ambiente ilustrado explorável | orientação espacial e sensação de pertencimento |
| Jogos | identidades próprias por gênero | regras, feedback, ritmo, progressão e encerramento |
| Perfil | retrato pessoal | edição simples, identidade e privacidade |

Estas são direções de investigação, não layouts finais.

## 6. Pilotos visuais do Feed e de Memórias

O primeiro experimento visual está documentado em [docs/IDENTIDADE_VISUAL_MORADOS.md](IDENTIDADE_VISUAL_MORADOS.md). Ele estabelece uma abertura editorial própria, filtros em abas e superfícies de publicação mais legíveis. A camada está isolada no Feed para evitar mudar outros módulos por acidente. Está em revisão e ainda precisa de validação visual no navegador e em Android.

O segundo experimento visual aplica uma linguagem própria a **Memórias**: um caderno cronológico, com abertura ilustrada, formulário de escrita e registros ancorados por data em uma linha do tempo. A composição reflete o que o módulo realmente oferece hoje — texto, data e privacidade — sem sugerir uma galeria de fotos ou anexos inexistentes. Busca, filtros, exportação, edição, exclusão e atualização em tempo real foram preservados. A implementação também está isolada e precisa de validação visual no navegador e em Android.

## 7. Sequência de trabalho

### Etapa 0 — Auditoria e fundação
- [x] Mapear estrutura, módulos e stack.
- [x] Identificar sobreposição de estilos e pontos de concentração.
- [x] Registrar pendências funcionais que não podem ser confundidas com polimento visual.
- [x] Definir princípios iniciais e critérios de qualidade.
- [ ] Revisar este diagnóstico com o usuário.

### Etapa 1 — Sistema de identidade
- [ ] Definir personalidade, promessa e atributos da marca.
- [ ] Aprovar paleta semântica, tipografia, formas, ilustração e movimento.
- [ ] Inventariar os componentes que devem ser compartilhados.
- [ ] Criar tokens e documentação do design system.
- [ ] Estabelecer uma tela de referência para validar a direção.

### Etapa 2 — Fundação técnica visual
- [ ] Mapear a cascata e as regras duplicadas do CSS.
- [ ] Separar estilos por responsabilidade sem alterar a ordem efetiva do cascade.
- [ ] Definir estados padronizados: loading, vazio, erro, sucesso e desabilitado.
- [ ] Definir breakpoints, safe areas, foco, contraste e alvos de toque.
- [ ] Criar capturas de referência e testes de regressão.

### Etapa 3 — Transformação dos módulos
- [ ] Auditar e redesenhar Feed.
- [ ] Auditar e redesenhar Conversa.
- [ ] Auditar e redesenhar Memórias.
- [ ] Auditar e redesenhar Planos.
- [ ] Auditar e redesenhar Casa.
- [ ] Auditar e redesenhar Perfil.
- [ ] Validar navegação, privacidade e sincronização depois de cada módulo.

### Etapa 4 — Jogos como experiências completas
- [ ] Criar uma ficha de design para cada jogo: público, fantasia, objetivo, ciclo, regras, feedback, dificuldade e encerramento.
- [ ] Validar controles e estados em telas pequenas.
- [ ] Garantir telas próprias de vitória, derrota, pausa e retomada quando fizer sentido.
- [ ] Testar partidas solo, locais e online por jogo; não presumir que compartilhar uma tela equivale a sincronização online.

### Etapa 5 — Engenharia e lançamento
- [ ] Dividir componentes grandes por responsabilidade, orientado por testes.
- [ ] Ampliar testes unitários, de componente e E2E.
- [ ] Verificar RLS, permissões e operações de mídia no Supabase.
- [ ] Validar fluxos com duas contas e dois aparelhos.
- [ ] Testar em navegador e Android real, incluindo o Samsung Galaxy A14/SM-A146M usado na validação anterior.
- [ ] Acompanhar desempenho, acessibilidade e falhas após cada versão.

## 8. Critérios para aceitar uma entrega

Uma entrega só será considerada concluída quando:
- o objetivo e o escopo estiverem explícitos;
- não houver regressão nos fluxos preservados;
- os testes relevantes passarem;
- carregamento, vazio, erro e sucesso estiverem tratados;
- a interface tiver sido conferida em dimensões móveis e desktop;
- contraste, foco, alvos de toque e movimento reduzido forem considerados;
- funcionalidades online forem verificadas com duas contas, quando aplicável;
- o APK for compilado e tiver a assinatura verificada quando houver mudança no aplicativo Android.

**Regra de segurança do processo:** mudanças pequenas, isoladas e reversíveis. Não reescrever o app inteiro, não substituir funcionalidades por protótipos estáticos e não alterar banco de dados sem migration revisada e verificação de aplicação.


## Acesso antecipado do criador

O primeiro integrante confirmado não deve esperar a confirmação ou o primeiro acesso da outra pessoa para usar o espaço. A migration `20261116190000_allow_creator_access_before_partner_activation.sql` prepara um casal em estado `pending` com apenas o criador como membro atual.

Enquanto o casal aguarda:
- O criador pode consultar o Feed, publicar e enviar/consultar mensagens.
- Anexos continuam no bucket privado e associados ao `couple_id` do espaço.
- A outra conta não recebe membership nem acesso antecipado ao conteúdo.
- Quando a conta recíproca confirma o e-mail e entra, `complete_couple_pairing` adiciona o segundo integrante e ativa o casal, preservando publicações e mensagens existentes.

A alteração de código considera `pending` um estado utilizável apenas para Feed e Conversa. Outros módulos mantêm suas próprias regras até serem revisados. A migration precisa ser aplicada no projeto Supabase antes de esta mudança funcionar em produção; publicar o código ou o APK não aplica migrations por si só.
