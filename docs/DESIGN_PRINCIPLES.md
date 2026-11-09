# Diretrizes de produto e design — Namoro

Estas regras são critérios permanentes de revisão, não uma lista de tendências.

## Princípio central

A interface deve parecer um produto real, feito para as rotinas específicas de duas pessoas. Cada tela existe para uma tarefa concreta. Não escrever texto de apresentação para preencher espaço nem transformar cada recurso em um cartão.

## Evitar

- Páginas que poderiam pertencer a qualquer produto com a troca de logo e cor.
- Títulos, subtítulos e parágrafos explicativos em todas as telas.
- Grade repetitiva de cartões, especialmente três cartões equivalentes em sequência.
- Badges decorativas, emojis em títulos, gradientes de texto e fundos roxo-azulados.
- Brilhos, glassmorphism, efeitos de cursor e animação de entrada aplicada a todas as seções.
- Ícones decorativos que não ajudam a reconhecer uma ação.
- Seções de marketing dentro da experiência do aplicativo.
- Copy genérica como "um universo de possibilidades", "transforme sua experiência" ou "tudo em um só lugar".
- Conteúdo fictício apresentado como se fosse atividade real dos usuários.
- Uma página visualmente bonita que não prevê carregamento, falha, estado vazio, ausência de permissão e telas pequenas.

## Direção visual

- Interface de aplicação, não landing page.
- Paleta botânica mais fria: verde profundo, verde mineral e superfícies claras com contraste suficiente; terracota somente como acento pontual.
- Sem gradientes decorativos ou fundos de brilho.
- Manrope com hierarquia por peso, tamanho e espaço, sem títulos serifados gigantes.
- Cantos moderados e superfícies planas. Bordas e sombras somente quando ajudam a separar áreas.
- Escala de espaçamento consistente: 4, 8, 12, 16, 24, 32, 48 e 64 px.
- Navegação curta e estável: Hoje, Conversas, Memórias, Planos e Casa.
- Rótulos diretos. Uma tela pode ter somente o nome da área e o conteúdo.
- Ajuda contextual por botão ? apenas para regras ou ações que não sejam autoexplicativas.
- Preferir listas, linhas, tabelas, cronologias e controles reais a coleções de cards.
- Animações só para feedback e transições que ajudem a orientação; respeitar prefers-reduced-motion.

## Testes de revisão

1. Teste de substituição: a página continuaria fazendo sentido para qualquer outro aplicativo? Se sim, falta especificidade.
2. Teste sem decoração: removendo cor, sombra e ícones, a estrutura ainda comunica prioridades?
3. Teste da segunda tela: componentes, espaçamento, botões e estados mantêm regras coerentes?
4. Teste de estados reais: vazio, carregando, falha, inválido, indisponível, sem permissão, conteúdo longo e mobile.
5. Teste da linguagem: cada texto diz algo concreto? O usuário consegue agir sem ler um parágrafo?
6. Teste de toque: botões têm ação real, estados de foco, pressionado e desabilitado?
7. Teste de densidade: não há grandes espaços vazios usados apenas para simular sofisticação?

## Referências pesquisadas

- InterfaceKit, "What makes a website look AI-generated?", atualizado em 7 set. 2026: https://blog.interfacekit.io/what-makes-a-website-look-ai-generated
- SCALR, "20 Signs a Website Was Made by AI", atualizado em 5 nov. 2026: https://scalr.sg/blog/20-signs-a-website-was-made-by-ai/
- The New Yorker, "The A.I.-Design Aesthetic That's Taking Over the Internet", 24 jun. 2026: https://www.newyorker.com/culture/infinite-scroll/the-ai-design-aesthetic-thats-taking-over-the-internet
- Nielsen Norman Group, "Progressive Disclosure": https://www.nngroup.com/articles/progressive-disclosure/

A presença de assistência por IA no processo não é o problema. O padrão de qualidade é especificidade, consistência e acabamento verificados.
