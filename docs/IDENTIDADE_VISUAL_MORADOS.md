# Identidade visual do Morados — piloto do Feed

**Status:** piloto implementado em branch e submetido para validação  
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

## Validação pendente

- Revisão visual humana no navegador e no Android.
- Conferir filtros em uma largura real de telefone.
- Conferir textos longos, fotos retrato/paisagem, vídeo e áudio.
- Conferir tema claro e escuro.
- Confirmar que as cores auxiliares não prejudicam leitura ou privacidade.
