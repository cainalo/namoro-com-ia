# Identidade visual do Morados — pilotos do Feed e de Memórias

**Status:** pilotos visuais do Feed e de Memórias implementados; revisão visual em navegador e Android ainda pendente  
**Módulo piloto:** Feed / mural do casal  
**Escopo:** camada visual escopada; nenhuma regra de negócio, tabela, permissão ou fluxo de publicação foi alterado.

## Ideia central

O Morados deve parecer um espaço privado construído por duas pessoas, não um painel social genérico. A linguagem começa pelo conceito de um **mural afetivo editorial**: conteúdo real em primeiro plano, detalhes materiais discretos e ilustração própria como assinatura do espaço.

A identidade deve ser calorosa sem cair em decoração romântica previsível. Evitar corações repetidos, gradientes automáticos, excesso de cartões, selos em toda parte e elementos que apenas ocupam espaço.

## Princípios de composição

- **Conteúdo primeiro:** a publicação, a fotografia ou a história precisa dominar a atenção.
- **Ritmo editorial:** títulos com presença, metadados discretos e separação clara entre momentos.
- **Acento, não bloco de cor:** a cor de cada publicação identifica sua personalidade em uma pequena faixa lateral e em detalhes, não como fundo saturado para todo o texto.
- **Ilustração com função:** a arte do cabeçalho é uma composição vetorial original de dois caminhos que se aproximam; não depende de imagem externa.
- **Assimetria controlada:** a abertura combina texto e arte em proporções diferentes, sem transformar o cabeçalho em um card.
- **Mobile primeiro:** texto, filtros e publicação continuam legíveis em larguras estreitas; a arte reduz de escala sem disputar espaço com o título.

## Tokens do piloto

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| Ink | `#2D382F` | `#EEE9DC` | Texto principal |
| Muted | `#6E7467` | `#BCB8A9` | Metadados e texto auxiliar |
| Paper | `#F5F0E6` | `#262A23` | Fundo de apoio |
| Surface | `#FCF9F2` | `#2C3028` | Publicações |
| Rule | `#E1D8C9` | `#45483C` | Separadores e contornos |
| Forest | `#4D624A` | `#A6B58A` | Ação e ênfase |
| Clay | `#B96D50` | `#D38B6E` | Assinatura e seleção |
| Ochre | `#C69A59` | `#D6B477` | Detalhes e ilustração |

A paleta fica namespaced em `--morados-feed-*` para não alterar acidentalmente Memórias, Conversa, Planos, Casa ou Jogos antes que cada módulo tenha sido auditado.

## Tipografia

- **Fraunces:** títulos editoriais e frases de destaque.
- **IBM Plex Sans:** leitura, metadados, filtros e controles.
- Títulos devem ter escala e entrelinha próprias, sem aplicar fonte display em textos longos.
- Evitar caixa alta extensa e tracking exagerado.

## Componentes revisitados

- Cabeçalho do mural: introduz o propósito do Feed e cria uma assinatura visual própria.
- Filtros: abas com indicador inferior; a seleção não depende de pílulas preenchidas.
- Publicações: superfícies de papel, acento lateral estável por publicação, texto escuro e ações discretas.
- Estados vazios/carregamento: mesma linguagem de superfície, sem simular conteúdo que não existe.
- Interlúdios (lembranças e sugestão de jogo): aparência secundária para não competir com publicações.

## Regras para expansão

1. Não copiar automaticamente o cabeçalho nem o layout do Feed para outros módulos.
2. Reutilizar os tokens de marca quando forem adequados, mas definir hierarquia, densidade e composição próprias para Conversa, Memórias, Planos, Casa, Perfil e Jogos.
3. Toda mudança deve considerar estado vazio, carregamento, erro, sucesso, foco, contraste, safe areas e telas pequenas.
4. As cores por publicação precisam permanecer estáveis por ID e nunca ser a única forma de transmitir informação.
5. A arte vetorial deve permanecer decorativa para tecnologia assistiva; seu significado não pode ser indispensável para compreender as ações.
6. Não remover ou substituir conteúdo real, mídia, recursos de privacidade, áudio ou operações de publicação para alcançar uma mudança visual.

## Piloto de Memórias — caderno cronológico

Memórias não é uma galeria de mídia no estado atual do produto: o módulo guarda registros escritos com data e visibilidade privada ou compartilhada. A interface não deve prometer anexos, álbuns ou organização de fotos que ainda não existem.

A composição usa a metáfora de um **caderno cronológico**:
- A abertura apresenta o arquivo e sua quantidade de registros, com uma ilustração vetorial original de um livro aberto.
- O formulário se comporta visualmente como uma página de escrita, sem alterar os campos, limites ou regras de privacidade.
- A coleção passa a ser lida como uma linha do tempo, com datas como âncoras e uma linha contínua discreta, em vez de cartões repetidos.
- Busca, filtros de privacidade, exportação, atualização, edição, exclusão e sincronização em tempo real continuam disponíveis.
- O módulo reutiliza a paleta semântica do Morados, mas tem hierarquia e composição próprias; não replica o cabeçalho nem o layout do Feed.

A implementação está isolada em `src/styles/morados-memories.css`, aplicada somente dentro de `.memories-screen`. A ilustração e o cabeçalho estão em `MoradosMemoriesHeader.tsx`, com teste dedicado. Nenhuma tabela, migration, permissão, operação Supabase ou regra de negócio foi alterada.

## Validação pendente

- Revisão visual humana no navegador e no Android para os dois pilotos.
- Conferir filtros em uma largura real de telefone.
- Conferir textos longos, fotos retrato/paisagem, vídeo e áudio.
- Conferir tema claro e escuro.
- Confirmar que as cores auxiliares não prejudicam leitura ou privacidade.


## Piloto de Conversa — correspondência cotidiana

Conversa adota uma linguagem própria de correspondência, sem copiar a composição do mural ou do caderno de Memórias. O cabeçalho permanece deliberadamente minimalista, com controles somente em ícones; a área de mensagens dá prioridade à leitura e ao ritmo entre as falas.

- Os balões recebem acabamento mais refinado e uma hierarquia temporal discreta, sem substituir as cores, o raio ou as preferências escolhidas pelo casal.
- O campo de escrita e os controles de anexos usam as superfícies de papel, contornos e acentos da marca; o comportamento de gravação, envio e foco permanece intacto.
- O estado vazio apresenta uma ilustração vetorial original de duas mensagens e explica que o espaço aceita mensagens, fotos e áudios.
- As opções de papel de parede, cores, fontes, privacidade, notificações, busca, favoritos, edição, exclusão, arquivos e sincronização são preservadas.
- A composição continua imersiva e mobile-first. Os botões superiores permanecem apenas ícones, conforme a decisão anterior de manter a barra superior limpa.

A implementação visual está isolada em `src/styles/morados-conversation.css`, aplicada apenas quando a conversa está em modo imersivo. O estado vazio foi extraído para `MoradosConversationWelcome.tsx` e tem testes próprios. Não foram alteradas tabelas, migrations, políticas, chamadas, RPCs ou fluxos de mensagens.


## Piloto de Planos — agenda de convivência

Planos recebe uma composição de agenda, diferente do mural, do caderno de Memórias e da correspondência da Conversa. O foco está em localizar uma data, entender o que acontece nela e registrar um novo compromisso sem percorrer uma sequência longa de cartões.

- A abertura usa uma ilustração vetorial original de calendário e apresenta a contagem real de compromissos do mês que está visível.
- Em telas largas, o calendário e a lista do dia selecionado ficam lado a lado; em telas estreitas, a composição passa para uma única coluna.
- Os compromissos são apresentados como lista editorial com horário, título, local, privacidade e ações do próprio autor — sem transformar cada linha em um cartão independente.
- O formulário permanece completo, com título, descrição, local, dia inteiro, horários, data, privacidade, edição e exclusão.
- Os filtros Todos, Compartilhados e Privados continuam aplicados apenas aos compromissos da data selecionada.
- Navegação por teclado no calendário, foco, estados de carregamento, erro, estrutura do banco pendente e sincronização em tempo real são preservados.
- O novo CSS fica isolado em \`src/styles/morados-plans.css\`; nenhuma regra de banco, permissão, consulta, RPC ou sincronização foi alterada.

A revisão visual em navegador e Android continua pendente. É necessário conferir meses com diferentes quantidades de semanas, datas sem compromissos, muitos eventos em um único dia, textos longos, tema claro/escuro e largura real de telefone.


## Piloto de Casa — terreno e salão natural

Casa passa a usar uma composição de exploração espacial mais clara e legível, sem transformar o módulo em uma landing page nem sugerir funções que ainda não existem.

- O cabeçalho identifica o espaço e informa as três áreas atualmente disponíveis.
- A ilustração do terreno mantém a perspectiva isométrica e os três pontos selecionáveis, agora com paleta de vegetação, pedra e telhado em terracota.
- Os controles de iluminação e aproximação continuam no mapa, com superfícies claras e estados selecionados mais nítidos.
- A informação da área escolhida permanece junto ao mapa e a ação de entrar continua restrita à residência.
- O salão de entrada recebe uma paleta mais quente de pedra e madeira; lareira, vitral, tapeçaria e escadaria continuam selecionáveis.
- A descrição do elemento escolhido passa a ocupar uma faixa de leitura própria, sem ficar sobreposta à ilustração.
- A folha `src/styles/morados-house.css` fica isolada em `.house-screen`. A alteração não adiciona cômodos, decoração editável, moedas ou conteúdo fictício.

O teste `CoupleHouse.test.tsx` cobre seleção dos locais, entrada no salão, seleção dos quatro elementos por meio do fluxo de interface, retorno ao terreno, iluminação e aproximação. A revisão visual em navegador e Android real permanece necessária antes de considerar o piloto aprovado.
