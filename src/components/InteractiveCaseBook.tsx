import { useEffect, useState } from "react";
import { AudioLines, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Clock3, FileText, Fingerprint, KeyRound, Map, Newspaper, ScrollText, ShieldAlert, X } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";

type Artifact = { id: string; title: string; type: string; teaser: string; content: string[]; visual?: "room" | "platform" | "none" };
type BookChoice = { id: string; label: string; detail: string };
type Chapter = {
  eyebrow: string; title: string;
  paragraphs: (state: CaseBookState) => string[];
  artifacts?: Artifact[];
  choice?: { prompt: string; options: BookChoice[] };
};
type CaseBookData = {
  id: string; caseNumber: string; title: string; subtitle: string; location: string; tone: "hotel" | "rail";
  introduction: string; chapters: Chapter[]; closing: (state: CaseBookState) => string[];
};
type CaseBookState = { chapter: number; opened: string[]; decisions: Record<string,string>; finished: boolean };

const CASE_001: CaseBookData = {
  id: "orfeo",
  caseNumber: "001",
  title: "A Hospedagem dos Ausentes",
  subtitle: "O quarto que não constava na planta",
  location: "Hotel Orfeu · Pedra Baixa",
  tone: "hotel",
  introduction: "Durante a demolição de um hotel fechado havia dezenove anos, operários encontram uma parede oca. Atrás dela existe um quarto mobiliado, uma linha telefônica ainda conectada e um hóspede que nunca aparece nos registros oficiais.",
  chapters: [
    {
      eyebrow: "Prólogo · 06h12 · 15 de novembro",
      title: "O telefone atrás da parede",
      paragraphs: () => [
        "O primeiro operário ouviu o telefone tocar às seis e doze da manhã. Não era um toque eletrônico, desses que saem de um aparelho esquecido dentro de uma gaveta. Era o som antigo de campainha metálica, insistente, abafado por tijolos e pelo pó de dezenove anos. Quando desligaram a energia do prédio, o telefone continuou tocando.",
        "O Hotel Orfeu estava fechado desde 2007. A fachada havia perdido as letras douradas, as janelas do terceiro andar tinham sido cobertas por tábuas e a prefeitura autorizara a demolição depois de três inspeções estruturais. Não havia motivo para existir uma linha ativa ali. Mesmo assim, o som vinha do fundo do corredor, atrás de uma parede que não constava em nenhuma planta.",
        "Quando os trabalhadores abriram a alvenaria, encontraram a porta de um quarto. Do lado de dentro, uma lâmpada pendia do teto. Havia uma cama feita, dois copos sobre a mesa, uma mala aberta e um telefone fora do gancho. Na poltrona, um homem estava sentado com as mãos apoiadas nos joelhos, como se tivesse adormecido enquanto esperava alguém voltar.",
        "A perícia não encontrou sinais de luta. O relógio de pulso do homem parara às 03h17. Sobre a mesa, um cartão de boas-vindas trazia o número 17 — embora o hotel tivesse apenas dezesseis quartos registrados. No verso, alguém escrevera: 'A recepção sabe que você chegou'."
      ],
      artifacts: [
        { id: "press-orfeo", title: "Jornal da manhã · O hotel fechado", type: "Manchete de jornal · 2007", teaser: "O Orfeu encerrou as atividades depois de três hóspedes desaparecerem na mesma semana.", content: ["PEDRA BAIXA — O Hotel Orfeu encerrou as atividades após uma sequência de ocorrências ainda sem explicação. Três hóspedes deixaram pertences nos quartos e não foram vistos saindo do prédio. A direção alegou uma falha elétrica e informou que todos haviam sido transferidos para outra unidade.", "A polícia não encontrou registros de transferência. O incêndio mencionado pela administração também não aparece nos relatórios do Corpo de Bombeiros: naquela noite, não houve incêndio, apenas um chamado por ruído na linha telefônica.", "A edição foi publicada em 16 de novembro de 2007. O recorte encontrado no quarto estava dobrado na notícia sobre o fechamento."], visual: "none" },
        { id: "room-photo", title: "Fotografia da descoberta", type: "Registro fotográfico · Cena 01", teaser: "A poltrona, o telefone e o relógio parado às 03h17.", content: ["A fotografia panorâmica registra o quarto antes da entrada da equipe de remoção. A cama está intacta. O telefone repousa no chão, com o fio esticado até a tomada. A janela foi fechada por dentro com quatro parafusos recentes.", "O homem na poltrona usa um terno cinza sem etiqueta. No bolso interno há uma ficha de lavanderia de 2007, mas o tecido não apresenta o desgaste esperado de dezenove anos de abandono.", "Um detalhe chama atenção: a poeira cobre a mesa e a cabeceira, mas não o telefone. Alguém o manuseou pouco antes de a parede ser aberta."], visual: "room" },
        { id: "plan-17", title: "Planta arquitetônica", type: "Documento técnico", teaser: "O desenho original termina no corredor. O quarto 17 não existe.", content: ["A planta aprovada em 1988 mostra dezesseis quartos, dois depósitos e uma escada de serviço. Atrás da parede recém-aberta deveria existir apenas um vão de ventilação.", "Na cópia encontrada na prefeitura, uma linha foi apagada à mão. Sob a borracha, ainda se lê 'acesso de manutenção — subsolo'. O quarto 17 foi construído dentro desse espaço, sem autorização e sem ligação com a circulação comum."], visual: "none" },
      ],
      choice: { prompt: "O que a equipe deve consultar primeiro?", options: [{ id: "archive", label: "O arquivo municipal", detail: "Descobrir quem autorizou as reformas do hotel." }, { id: "scene", label: "A fotografia completa", detail: "Observar o quarto antes que os objetos sejam removidos." }] }
    },
    {
      eyebrow: "Capítulo I · O livro de hóspedes",
      title: "Nomes que nunca fizeram check-out",
      paragraphs: (s) => [
        "A investigadora Elisa Noronha pediu o livro de hóspedes antes de perguntar pela identidade do morto. A escolha pareceu estranha aos funcionários da prefeitura. O documento estava guardado num armário de metal, junto a recibos de lavanderia e formulários de manutenção. As páginas de novembro de 2007 tinham sido arrancadas; as cópias carbonadas, porém, continuavam no fundo da gaveta.",
        "Havia doze registros do quarto 17. Nenhum nome aparecia na lista oficial de hóspedes. As entradas eram sempre feitas às 03h17, com a mesma caligrafia, e as saídas tinham um horário impossível: 03h17 do dia anterior. Era como se cada pessoa chegasse depois de já ter ido embora.",
        "A última assinatura era de Raul Faria, auditor do hotel. O nome constava num boletim de desaparecimento de 2007. A família reconheceu a fotografia do homem encontrado na poltrona, mas o perito pediu cautela: o relógio, a roupa e a aparência não provavam identidade. O cadáver parecia ter passado pouco tempo naquele quarto, embora o registro dissesse o contrário.",
        s.decisions["opening"] === "archive" ? "O arquivo municipal acrescentou uma irregularidade: três reformas foram pagas com verbas destinadas a obras que nunca aconteceram. Todas foram assinadas pelo mesmo administrador, Dimas Avelar." : "Na fotografia ampliada, Elisa percebeu um segundo copo sobre a mesa. A marca circular estava sobre a poeira, não sob ela. O quarto fora preparado para duas pessoas, mas apenas uma cadeira tinha marcas recentes."
      ],
      artifacts: [
        { id: "guest-ledger", title: "Livro de hóspedes · páginas carbonadas", type: "Documento recuperado", teaser: "Doze entradas com horários repetidos e saídas registradas antes da chegada.", content: ["As cópias carbonadas mostram doze nomes, todos escritos com a mesma caneta azul. Em cada ficha, o campo 'documento' foi preenchido com uma sequência de oito algarismos que não corresponde a nenhum cadastro civil.", "O registro de Raul Faria aparece por último. O número de documento é o mesmo usado por um hóspede chamado A. Vilar, registrado seis noites antes. A caligrafia é idêntica, mas os dois nomes pertencem a pessoas diferentes.", "Na margem inferior, alguém anotou: 'Não atender quando tocar duas vezes'. A frase está escrita com tinta vermelha."], visual: "none" },
        { id: "key-17", title: "Chave de latão · etiqueta 17", type: "Objeto periciado", teaser: "Uma chave sem fechadura correspondente no prédio.", content: ["A chave tem o número 17 gravado no aro e uma pequena marca de queimadura na ponta. Não corresponde às portas comuns do hotel.", "No lado interno da etiqueta, há uma sequência de letras: M-A-R-E. O perito observou que a gravação foi feita depois da oxidação; alguém alterou o objeto muito tempo após sua fabricação."], visual: "none" },
        { id: "laundry", title: "Comanda da lavanderia", type: "Registro de serviço", teaser: "O terno do homem foi lavado três dias antes da descoberta.", content: ["A comanda foi emitida por uma lavanderia que fechou em 2011. O código da peça corresponde ao terno cinza encontrado no cadáver.", "O campo de retirada tem a assinatura 'I. Sampaio'. A funcionária com essas iniciais trabalhava no Orfeu em 2007 e declarou à polícia que nunca voltou ao edifício depois do fechamento."], visual: "none" }
      ],
      choice: { prompt: "Que detalhe merece ser seguido agora?", options: [{ id: "key", label: "A chave 17", detail: "Procurar a porta que ela deveria abrir." }, { id: "laundry", label: "A comanda da lavanderia", detail: "Localizar a antiga funcionária que retirou o terno." }] }
    },
    {
      eyebrow: "Capítulo II · Pessoas que ficaram",
      title: "A mulher que nunca saiu da recepção",
      paragraphs: (s) => [
        "Irene Sampaio foi encontrada numa casa térrea perto da estação rodoviária. Tinha setenta e dois anos, uma coleção de rádios desmontados e o hábito de deixar a luz da cozinha acesa durante o dia. Ao ver a fotografia do quarto 17, não perguntou pelo cadáver. Perguntou se o telefone ainda estava fora do gancho.",
        "Em 2007, Irene trabalhava no turno da noite. Disse que o hotel tinha dezesseis quartos para hóspedes e um décimo sétimo para funcionários, mas que a direção jamais permitia chamar aquele espaço pelo número. O homem que dormia ali era apresentado como auditor. Às vezes, no entanto, a recepção recebia ligações dele antes de ele chegar ao prédio.",
        "Ela contou que, na última semana de funcionamento, ouviu uma hóspede pedir ajuda pelo interfone. A mulher dizia estar no quarto 17 e não conseguia abrir a porta. Irene subiu até o corredor, mas encontrou uma parede lisa. No retorno, a recepção já tinha uma ficha de saída assinada pela hóspede. A assinatura era dela própria.",
        s.decisions["interview"] === "irene" ? "Quando Elisa mostrou a chave de latão, Irene começou a chorar. Disse que a guardara por dezenove anos porque a pessoa que devia recebê-la nunca chegou. Não explicou quem era essa pessoa." : "O antigo gerente, Dimas Avelar, negou a existência do quarto. Mas, ao ouvir o relato de Irene, repetiu uma frase que não constava de nenhum relatório: 'A recepção não podia abrir a porta por dentro'."
      ],
      artifacts: [
        { id: "irene-statement", title: "Depoimento de Irene Sampaio", type: "Entrevista gravada", teaser: "A antiga recepcionista descreve uma chamada de um quarto inexistente.", content: ["'Eu ouvi a mulher pedir que abrissem. Ela não gritava. Falava baixo, como se alguém estivesse dormindo perto dela. Disse que a janela tinha sido parafusada e que havia outra pessoa no quarto, mas que a pessoa não respirava.'", "'Quando subi, o corredor estava vazio. Eu toquei a parede. Estava quente. Foi quando o telefone da recepção tocou e a mulher pediu desculpas por ter ligado. A voz era a minha.'", "A gravação apresenta uma pausa de 17 segundos entre as duas respostas. Irene não se recorda de ter feito essa pausa."], visual: "none" },
        { id: "manager-interview", title: "Depoimento de Dimas Avelar", type: "Entrevista policial", teaser: "O antigo gerente conhece detalhes que não foram mencionados pela equipe.", content: ["Dimas afirma que o hotel tinha apenas dezesseis quartos e que Raul Faria deixou a cidade em 2007. Diz não reconhecer a chave nem a lavanderia.", "Ao ser questionado sobre o subsolo, responde que o prédio foi construído sobre um túnel de drenagem. Em seguida, corrige a própria frase: 'Não existe túnel. Existe uma passagem de manutenção'.", "O áudio registra um ruído metálico quando o nome de Irene é mencionado. Dimas pede para encerrar a entrevista."], visual: "none" },
        { id: "switchboard", title: "Central telefônica", type: "Peça técnica", teaser: "A central foi desligada em 2007, mas há chamadas posteriores.", content: ["A central analógica foi removida do hotel durante o fechamento. O equipamento encontrado no quarto 17 não deveria conseguir completar chamadas.", "O técnico constatou que o fio do telefone não terminava na central. Ele descia por um conduite e desaparecia sob o piso. A linha seguia em direção ao subsolo."], visual: "none" }
      ],
      choice: { prompt: "Quem deve ser ouvido antes de descer ao subsolo?", options: [{ id: "irene", label: "Irene Sampaio", detail: "A antiga recepcionista que ouviu a chamada." }, { id: "dimas", label: "Dimas Avelar", detail: "O gerente que nega a existência do quarto." }] }
    },
    {
      eyebrow: "Capítulo III · O corredor inferior",
      title: "A porta do lado de dentro",
      paragraphs: (s) => [
        "A passagem de manutenção começava atrás de um armário de roupa de cama. Não havia maçaneta do lado de fora. A porta só podia ser aberta por quem estivesse no corredor inferior — uma solução que fazia sentido para armazenar equipamentos, mas não para um quarto de hóspedes.",
        "O corredor terminava numa sala de gravação. Dezenas de fitas estavam organizadas por data, não por nome. Em cada caixa havia um número de quarto e uma hora: 03h17. Elisa encontrou a própria voz numa gravação feita antes de chegar a Pedra Baixa. A fita registrava uma pergunta que ela ainda não havia feito: 'Quem ocupou o quarto antes de mim?'",
        "O arquivo mais antigo continha a voz de Raul Faria. Ele dizia que o quarto não servia para esconder pessoas, mas para esconder a prova de que elas tinham estado ali. A cada noite, uma ficha era criada, uma chamada era simulada e uma saída era registrada. Os hóspedes desapareciam dos livros porque nunca haviam entrado oficialmente.",
        "No fim da gravação, Raul fala de uma segunda pessoa: 'Se encontrarem meu corpo, não confiem no rosto. A pessoa que está sentada na poltrona não é quem vocês vieram buscar'."
      ],
      artifacts: [
        { id: "tape-0317", title: "Fita 03h17 · Raul Faria", type: "Transcrição de áudio", teaser: "O auditor explica a função real do quarto 17.", content: ["[00:00] 'O quarto foi construído para registrar ausências. Não para prender alguém, mas para que o hotel pudesse dizer que a pessoa esteve aqui e foi embora.'", "[00:42] 'A lista não mostra quem entrou. Mostra quem precisava desaparecer do papel. O livro é a parte mais perigosa porque parece uma prova.'", "[01:19] 'Se encontrarem meu corpo, não confiem no rosto. A pessoa na poltrona não é quem vocês vieram buscar.'", "[01:51] Ruído de telefone. Uma voz ao fundo pergunta: 'E quem está ouvindo?'. A gravação termina."], visual: "none" },
        { id: "room-photo-detail", title: "Ampliação da poltrona", type: "Fotografia pericial · detalhe", teaser: "Há uma segunda etiqueta costurada sob o forro do paletó.", content: ["A fotografia ampliada revela uma etiqueta de alfaiataria costurada sobre outra etiqueta. A superior identifica Raul Faria; a inferior traz o nome Dimas Avelar.", "O relógio parado às 03h17 não pertence ao homem. O número de série foi raspado e o mecanismo é de um modelo vendido apenas em 2016 — nove anos depois do fechamento oficial do hotel."], visual: "room" },
        { id: "corridor-plan", title: "Esquema do corredor inferior", type: "Desenho técnico", teaser: "Um corredor conecta o quarto a uma antiga galeria de drenagem.", content: ["O corredor inferior tem três portas: o quarto 17, a sala de gravação e uma galeria de drenagem que desemboca a duas quadras do hotel.", "A parede foi fechada por dentro. Quem construiu o quarto queria impedir que alguém saísse pela passagem, mas deixou um fio telefônico conectado à galeria."], visual: "none" }
      ]
    },
    {
      eyebrow: "Capítulo IV · O nome sob o nome",
      title: "A última ficha",
      paragraphs: (s) => [
        "A perícia odontológica confirmou que o homem na poltrona não era Raul Faria. Os registros dentários pertenciam a Dimas Avelar. O antigo gerente havia sido declarado morto em 2012, num acidente de estrada sem corpo identificado. A certidão fora emitida com base numa aliança encontrada perto de um veículo incendiado.",
        "O quarto 17 não fora construído para esconder hóspedes. Fora construído para esconder a própria identidade do gerente. Dimas mantinha registros paralelos de pessoas que precisavam desaparecer por algumas horas, dias ou anos. Algumas fugiam de ameaças; outras eram levadas para ali contra a vontade. A recepção registrava saídas que nunca aconteceram.",
        "Raul descobrira o esquema e preparara as fitas para que alguém pudesse reconstituir a história. Irene o ajudou a retirar duas pessoas do prédio na última noite, mas não conseguiu voltar para buscar a terceira. A mulher do interfone era a irmã de Dimas, mantida no quarto até a morte. A voz que pedia desculpas era uma gravação dela, repetida pela central.",
        s.decisions["opening"] === "archive" ? "A reforma clandestina foi paga com dinheiro público e assinada por Dimas. O arquivo municipal tinha uma cópia do contrato, escondida entre processos de drenagem." : "A fotografia do segundo copo foi decisiva: o copo estava limpo na noite da descoberta, mas a poeira ao redor tinha dezenove anos. Alguém preparou a mesa para uma conversa que nunca ocorreu."
      ],
      artifacts: [
        { id: "identity-report", title: "Laudo de identificação", type: "Relatório pericial", teaser: "O homem encontrado no quarto é Dimas Avelar, não Raul Faria.", content: ["A identificação foi confirmada por arcada dentária, implantes e comparação de material biológico com um parente de primeiro grau. O relógio não pertence ao cadáver.", "A morte ocorreu entre 2012 e 2018. O corpo foi preservado em ambiente de baixa umidade, com ventilação contínua. O quarto foi fechado depois da morte, mas recebeu visitas posteriores."], visual: "none" },
        { id: "last-register", title: "Ficha sem assinatura", type: "Documento final", teaser: "Uma última entrada foi feita na noite anterior à demolição.", content: ["A ficha registra uma hóspede chamada Elisa Noronha. A data corresponde à véspera da chegada da equipe policial. O campo de documento está vazio.", "No campo de observações, alguém escreveu: 'A investigadora já esteve aqui. Ela só ainda não se lembra'. A letra é de Raul Faria."], visual: "none" }
      ]
    },
    {
      eyebrow: "Epílogo · Relatório de encerramento",
      title: "O quarto permanece aberto",
      paragraphs: (s) => [
        "O Hotel Orfeu foi interditado novamente. As fitas foram encaminhadas para perícia, os registros paralelos foram anexados a uma investigação sobre desaparecimentos e o nome de Dimas Avelar foi retirado da lista de mortos em 2012. Irene entregou a chave de latão sem pedir recibo.",
        "Raul Faria nunca foi encontrado. As gravações indicam que deixou a cidade antes do fechamento do hotel, mas não existe registro de embarque, hospedagem ou saída do município. O último áudio termina com passos atravessando água rasa e uma porta que se fecha sem bater.",
        "O laudo final aponta que o quarto 17 foi usado para falsificar a presença e a ausência de pessoas. Não explica, porém, por que a ficha de Elisa foi preenchida antes da abertura da parede, nem quem manteve a linha telefônica ativa por dezenove anos.",
        "Na semana seguinte, a prefeitura recebeu um envelope sem remetente. Dentro havia uma única chave de latão, marcada com o número 18. O Hotel Orfeu tinha dezesseis quartos."
      ]
    }
  ],
  closing: () => ["CASO 001 · A HOSPEDAGEM DOS AUSENTES", "O esquema de registros paralelos foi confirmado. A identidade do homem encontrado no quarto foi estabelecida como Dimas Avelar. O paradeiro de Raul Faria permanece desconhecido.", "A investigação foi encerrada administrativamente, mas a origem da ficha de Elisa Noronha e a linha telefônica que permaneceu ativa não foram esclarecidas."]
};

const CASE_002: CaseBookData = {
  id: "plataforma",
  caseNumber: "002",
  title: "O Último Trem de Santa Íria",
  subtitle: "A plataforma onde os relógios atrasam",
  location: "Estação Central · Santa Íria",
  tone: "rail",
  introduction: "Um trem que deixou de circular há vinte e três anos aparece no painel da Estação Central. Na mesma madrugada, um funcionário desaparece e uma mala lacrada é encontrada dentro de um vagão que não deveria existir.",
  chapters: [
    {
      eyebrow: "Prólogo · 22h08 · Plataforma 4",
      title: "O painel anunciou um trem vazio",
      paragraphs: () => [
        "Às 22h08, o painel da Estação Central exibiu uma linha que não fazia parte da programação havia vinte e três anos: Santa Íria — Plataforma 4 — chegada 22h14. O anúncio sonoro veio logo depois, com a voz antiga da estação, a mesma gravação que ainda chamava passageiros para uma composição retirada de serviço em 2003.",
        "O inspetor Joel Ferreira estava no saguão quando ouviu o nome da linha. Disse à segurança que o sistema precisava de manutenção e caminhou até o corredor técnico. A câmera registrou o uniforme cinza, o rádio no ombro e uma pasta estreita debaixo do braço. Às 22h19, a imagem congelou durante sete segundos. Quando voltou, o corredor estava vazio.",
        "A equipe de limpeza encontrou uma mala preta no banco da plataforma. Não havia etiqueta, cadeado ou marca de companhia ferroviária. A alça estava úmida, embora não chovesse havia quatro dias. Dentro havia uma passagem antiga, um relógio sem ponteiros e uma fotografia da estação com um detalhe que não existia mais: uma quinta plataforma.",
        "O registro de circulação confirmou que nenhum trem entrou na estação naquela noite. Ainda assim, o trilho da plataforma 4 amanheceu coberto por uma fina camada de água salgada."
      ],
      artifacts: [
        { id: "headline-train", title: "Jornal local · A linha que desapareceu", type: "Manchete de jornal · 2003", teaser: "A composição Santa Íria foi retirada depois de um acidente nunca explicado.", content: ["SANTA ÍRIA — A empresa ferroviária confirmou a suspensão da linha noturna após o desaparecimento de um vagão e de sete passageiros. A nota oficial atribuiu o episódio a uma falha de sinalização e informou que a composição havia sido recolhida para perícia.", "Nenhum acidente foi registrado na rodovia paralela, nenhuma equipe encontrou destroços e o maquinista não apareceu para prestar depoimento. A linha foi retirada dos mapas de circulação dois dias depois.", "O jornal recebeu uma carta anônima afirmando que o trem chegou à estação, mas ninguém abriu as portas."], visual: "none" },
        { id: "platform-photo", title: "Fotografia da Plataforma 4", type: "Imagem de segurança reconstruída", teaser: "O banco, a mala e a sombra de um vagão no fim do trilho.", content: ["A reconstrução combina três câmeras. No quadro principal, a mala aparece às 22h11. A sombra no fim do trilho não corresponde a nenhum trem registrado.", "O relógio da parede marca 22h08, mas os arquivos digitais foram gravados às 22h14. A diferença entre o horário exibido e o horário real é de seis minutos."], visual: "platform" },
        { id: "timetable-2003", title: "Quadro de circulação de 2003", type: "Documento histórico", teaser: "A linha Santa Íria consta como cancelada às 22h14.", content: ["O quadro original registra a composição 417, com partida às 22h08 e chegada às 22h14. O cancelamento foi anotado a lápis, sem assinatura.", "Na margem há uma observação: 'não abrir as portas na quinta plataforma'. A estação atual possui quatro plataformas."], visual: "none" }
      ],
      choice: { prompt: "Qual registro deve orientar a primeira leitura?", options: [{ id: "headline", label: "A notícia de 2003", detail: "Retomar o desaparecimento original da composição." }, { id: "photo", label: "A imagem desta madrugada", detail: "Observar o que apareceu na estação agora." }] }
    },
    {
      eyebrow: "Capítulo I · A mala lacrada",
      title: "O que chegou sem passageiro",
      paragraphs: (s) => [
        "A mala foi aberta na presença de dois peritos. Não havia roupa. Havia sete envelopes numerados, um bilhete de embarque ainda não utilizado e um gravador portátil embrulhado em jornal. Cada envelope tinha o nome de uma pessoa que constava no relatório de desaparecidos de 2003 — exceto o sétimo, que trazia o nome de Joel Ferreira.",
        "O bilhete estava impresso em papel térmico novo. Indicava o assento 08, vagão 5, composição 417. A data era a do dia seguinte. O relógio sem ponteiros não tinha mecanismo interno; em seu lugar, havia um pequeno compartimento com uma chave de funcionário.",
        s.decisions["opening"] === "headline" ? "A notícia antiga registrava sete desaparecidos. A mala continha exatamente sete envelopes, mas os nomes não apareciam na mesma ordem do jornal. Alguém reorganizara a lista para que Joel fosse o último." : "Na fotografia ampliada, a sombra do quinto vagão tem janelas iluminadas. Uma delas mostra a silhueta de alguém sentado, olhando diretamente para a câmera."
      ],
      artifacts: [
        { id: "suitcase-inventory", title: "Inventário da mala", type: "Relatório de apreensão", teaser: "Sete envelopes, um bilhete e um gravador sem identificação.", content: ["O tecido interno está seco, mas há sal acumulado nas costuras. O material corresponde ao revestimento de malas ferroviárias fabricadas até 2004.", "Os sete envelopes estão fechados. Cada um contém uma folha com uma única frase, escrita em tinta azul: 'Eu não desci'. O envelope de Joel está vazio, exceto por uma marca de dedo no papel.", "O gravador tem uma fita de noventa minutos. A etiqueta foi removida, mas a caixa apresenta o número 417 gravado no plástico."], visual: "none" },
        { id: "ticket-08", title: "Bilhete · Assento 08", type: "Objeto periciado", teaser: "Um bilhete com data futura para um trem cancelado.", content: ["O papel térmico é novo e foi impresso numa máquina de bilheteria que não está conectada ao sistema atual. O código de validação é idêntico ao padrão utilizado em 2003.", "A passagem não tem nome de passageiro. No campo de destino, lê-se apenas: 'onde a linha termina'.", "No verso, alguém desenhou cinco pequenos quadrados. O último está preenchido com tinta preta."], visual: "none" },
        { id: "voice-tape", title: "Gravação do gravador", type: "Transcrição de áudio", teaser: "Uma voz anuncia a chegada de sete passageiros e pede que não abram as portas.", content: ["[22:08] Voz masculina: 'Composição 417 aproximando-se da quinta plataforma'. [22:10] Ruído de freios. [22:11] Voz feminina: 'Não conte os que desceram. Conte os que ficaram'.", "[22:14] Sete batidas metálicas. [22:17] Voz masculina, mais próxima: 'Joel, você ainda está aí?'.", "A gravação termina com o som de uma porta sendo trancada pelo lado de fora."], visual: "none" }
      ]
    },
    {
      eyebrow: "Capítulo II · O turno de Joel",
      title: "O homem que deixou o próprio crachá",
      paragraphs: (s) => [
        "O cartão JT-04 foi usado às 22h11 para abrir a porta de serviço. O sistema atribuiu o acesso a Joel, mas o crachá dele foi encontrado no bolso do uniforme deixado no armário. A câmera do corredor mostra uma pessoa usando o cartão e caminhando para a plataforma, embora o rosto esteja sempre fora do enquadramento.",
        "Marta Siqueira, chefe da estação, disse que Joel costumava fazer rondas sozinho e que conhecia os códigos antigos. Lila Monteiro, que tocava perto da bilheteria, afirmou ter ouvido alguém chamando os passageiros pelo nome, um por um, mesmo quando o saguão estava vazio.",
        "O mensageiro Enzo Prado entregou uma encomenda às 22h06 e saiu pela porta principal. O recibo comprova a saída. No entanto, o pacote entregue por ele tinha o mesmo peso da mala encontrada na plataforma e foi registrado como 'documentos de manutenção'.",
        s.decisions["interview"] === "marta" ? "Marta pediu para ouvir a gravação do alto-falante. Quando a voz chamou Joel, ela desligou o aparelho e disse que aquela não era a gravação original." : "Lila reconheceu a voz feminina da fita. Disse que era a mesma mulher que cantava na estação quando ela era criança — uma funcionária que desapareceu em 2003."
      ],
      artifacts: [
        { id: "joel-badge", title: "Cartão de acesso JT-04", type: "Objeto periciado", teaser: "O cartão foi usado depois de ter sido deixado no armário.", content: ["O chip registra uma abertura às 22h11 e outra às 22h22. O segundo acesso ocorreu quando o cartão já estava no armário dos funcionários.", "A impressão digital encontrada na superfície não pertence a Joel. O cartão foi usado por alguém com luvas finas e depois limpo com solvente."], visual: "none" },
        { id: "marta-statement", title: "Depoimento de Marta Siqueira", type: "Entrevista policial", teaser: "A chefe da estação reconhece a antiga gravação e tenta interrompê-la.", content: ["'A linha Santa Íria foi encerrada. Eu mesma assinei a retirada do painel. Não existe quinta plataforma. Se vocês encontraram uma fotografia, ela foi manipulada.'", "Quando o áudio da gravação é reproduzido, Marta pede que desliguem o aparelho. A voz feminina da fita diz: 'Marta, ainda falta uma pessoa'.", "A entrevista é interrompida às 23h03. Marta solicita presença de advogado antes de continuar."], visual: "none" },
        { id: "lila-notebook", title: "Caderno de Lila", type: "Objeto pessoal", teaser: "Uma música anotada em 2003 reaparece na fita do trem.", content: ["O caderno contém uma sequência musical de sete notas, copiada de uma melodia que Lila ouviu na estação quando tinha oito anos.", "A mesma sequência toca ao fundo da gravação do trem. A última nota está escrita em vermelho e acompanhada de uma palavra: 'volta'."], visual: "none" }
      ],
      choice: { prompt: "Qual testemunho deve acompanhar a próxima etapa?", options: [{ id: "marta", label: "Marta Siqueira", detail: "A chefe que assinou o cancelamento da linha." }, { id: "lila", label: "Lila Monteiro", detail: "A testemunha que reconheceu a voz da estação." }] }
    },
    {
      eyebrow: "Capítulo III · O quinto acesso",
      title: "A plataforma que não aparece no mapa",
      paragraphs: () => [
        "O subsolo da estação guardava uma galeria de manutenção lacrada com placas de concreto. Atrás dela havia um corredor estreito e um conjunto de trilhos antigos, interrompidos por uma parede de tijolos. O ar cheirava a ferro molhado. As marcas no chão indicavam que um vagão havia passado por ali recentemente.",
        "A equipe encontrou sete malas vazias, cada uma com uma etiqueta de assento. A oitava estava ocupada por um casaco cinza com o nome de Joel bordado no forro. O tecido estava úmido e frio, como se tivesse acabado de sair de um vagão refrigerado.",
        "No fim do corredor, havia uma cabine de sinalização. O painel tinha cinco alavancas, mas apenas quatro trilhos apareciam no mapa. Uma das alavancas estava marcada com a letra S. Sob ela, alguém gravara: 'a plataforma não recebe trens; recebe quem ficou'."
      ],
      artifacts: [
        { id: "subway-photo", title: "Fotografia da galeria", type: "Registro fotográfico · Subsolo", teaser: "Marcas recentes de roda e água salgada no trilho desativado.", content: ["A imagem mostra o corredor de manutenção antes da entrada da equipe. As marcas de roda têm largura compatível com um vagão antigo, não com carrinhos de bagagem.", "A água salgada foi encontrada apenas no trilho central. O restante do piso está seco. Não há tubulação ou infiltração que explique a concentração."], visual: "platform" },
        { id: "signal-panel", title: "Painel de sinalização", type: "Peça técnica", teaser: "Uma quinta alavanca sem trilho correspondente.", content: ["O painel foi fabricado em 1989 e instalado na estação até 2003. A alavanca S foi removida do esquema oficial, mas permanece conectada ao circuito.", "Ao acioná-la, o relógio da plataforma 4 atrasa seis minutos. O sistema de áudio anuncia o trem Santa Íria, mesmo com a energia do saguão desligada."], visual: "none" },
        { id: "empty-luggage", title: "Sete malas vazias", type: "Fotografia pericial", teaser: "Todas têm etiquetas de assentos diferentes do mesmo vagão.", content: ["As malas pertencem a sete modelos distintos, mas as etiquetas foram impressas na mesma máquina e na mesma data: 14 de novembro de 2003.", "O interior de cada mala contém uma folha com o nome de um passageiro desaparecido. Nenhuma tem vestígios de transporte recente."], visual: "none" }
      ]
    },
    {
      eyebrow: "Capítulo IV · A composição 417",
      title: "Os passageiros que não chegaram",
      paragraphs: (s) => [
        "Marta reconheceu que, em 2003, a linha não foi cancelada por uma falha de sinalização. O trem 417 chegou à estação com todos os passageiros a bordo, mas nenhuma porta abriu. A equipe de plataforma recebeu ordem para manter o saguão vazio e não registrar o desembarque. Na manhã seguinte, sete famílias procuraram pessoas que nunca voltaram para casa.",
        "A empresa declarou que a composição havia sido recolhida antes de chegar a Santa Íria. O maquinista assinou o relatório, mas sua assinatura foi reproduzida em outro documento no mesmo minuto em que ele aparecia na câmera, parado diante da quinta alavanca. O maquinista não era Joel. Era o pai de Joel, morto em 2004.",
        s.decisions["interview"] === "lila" ? "Lila entregou o caderno da infância. A melodia que ouvira na estação era uma gravação de chamada de embarque feita pela mãe, uma das sete pessoas desaparecidas. A última nota nunca foi tocada porque a composição não chegou ao destino." : "Marta revelou que assinou o cancelamento para proteger a estação. Não sabia que os passageiros continuavam dentro do trem. Disse que a ordem veio de uma pessoa que ainda trabalha no prédio, embora a folha de pagamento não mostre o nome."
      ],
      artifacts: [
        { id: "incident-report", title: "Relatório de ocorrência · 2003", type: "Documento oficial", teaser: "A composição foi declarada recolhida antes do último registro de chegada.", content: ["O relatório informa que o trem 417 foi retirado de serviço às 21h58. A gravação de rádio registra sua aproximação da plataforma às 22h08 e o painel anuncia chegada às 22h14.", "A assinatura do maquinista aparece em dois locais diferentes no mesmo minuto. Uma delas foi feita com tinta azul; a outra, com tinta preta. A primeira folha foi inserida no processo dezessete dias depois."], visual: "none" },
        { id: "passenger-list", title: "Lista dos sete passageiros", type: "Documento recuperado", teaser: "Os nomes dos desaparecidos coincidem com os envelopes da mala.", content: ["A lista contém sete nomes, idades e assentos. O último passageiro é a mãe de Lila, desaparecida quando a menina tinha oito anos.", "O campo de destino está em branco. Ao lado de cada nome, há uma anotação: 'permanece a bordo'. A última linha, acrescentada recentemente, contém o nome de Joel Ferreira."], visual: "none" }
      ]
    },
    {
      eyebrow: "Epílogo · Relatório de encerramento",
      title: "A estação continua anunciando",
      paragraphs: () => [
        "A investigação confirmou que a quinta plataforma existiu no projeto original e foi removida dos mapas depois do desaparecimento da composição 417. O painel foi desligado e a galeria de manutenção recebeu nova vedação. Marta entregou os documentos de 2003. Lila ficou com o caderno e não voltou à estação.",
        "O paradeiro de Joel Ferreira permanece desconhecido. O uniforme foi encontrado, o crachá foi recuperado e a gravação registra sua voz no interior do trem. Nenhuma imagem mostra o momento em que ele embarca.",
        "A empresa ferroviária reconheceu a falsificação dos relatórios, mas alegou que o trem havia sido desmontado há vinte e três anos. Os restos da composição nunca foram localizados.",
        "Às 22h08 da noite seguinte, o painel da estação acendeu por seis minutos. Nenhum funcionário admitiu ter visto. O registro de áudio, porém, contém sete chamadas de embarque e uma oitava voz, sussurrando o nome de quem estava ouvindo."
      ]
    }
  ],
  closing: () => ["CASO 002 · O ÚLTIMO TREM DE SANTA ÍRIA", "A falsificação dos relatórios de circulação foi confirmada. A existência de uma quinta plataforma e de uma galeria ferroviária foi comprovada. O paradeiro dos sete passageiros e de Joel Ferreira permanece desconhecido.", "A estação foi fechada para perícia. O sistema de áudio registrou uma chamada às 22h08 depois do desligamento elétrico."]
};

function CaseSceneArt({ kind }: { kind: "hotel" | "rail" }) {
  return kind === "hotel" ? (
    <svg className="casebook-scene-art" viewBox="0 0 760 310" role="img" aria-label="Reconstrução vetorial do quarto 17 do Hotel Orfeu">
      <rect width="760" height="310" fill="#302b2d"/><path d="M0 0 H760 V53 H0Z" fill="#4a3d3c"/>
      <path d="M55 38 L360 16 L360 270 L55 294Z" fill="#79645a"/><path d="M360 16 L705 38 L705 294 L360 270Z" fill="#51423e"/>
      <path d="M85 60 L333 44 L333 224 L85 243Z" fill="#4b5860"/><path d="M96 70 L322 55 L322 213 L96 231Z" fill="#9a8b78"/>
      <path d="M110 86 L310 72 L310 195 L110 210Z" fill="#35444b"/><path d="M202 77 V204 M107 145 L316 132" stroke="#d3b98b" strokeWidth="5"/>
      <path d="M400 54 L656 68 L656 221 L400 207Z" fill="#74665b"/><path d="M420 74 L641 87 L641 191 L420 179Z" fill="#282e31"/>
      <rect x="448" y="93" width="155" height="80" fill="#3b4648"/><path d="M455 100 H594 V166 H455Z" fill="#6b5c4f"/>
      <path d="M125 235 L310 221 L370 260 L177 282Z" fill="#6a5149"/><path d="M155 229 L300 218 L337 241 L193 255Z" fill="#d4c5ac"/>
      <path d="M440 214 L562 221 L598 243 L473 238Z" fill="#8b735c"/><rect x="492" y="195" width="20" height="26" fill="#262a2b"/>
      <path d="M506 195 L506 103" stroke="#c3a06c" strokeWidth="4"/><path d="M486 103 Q506 82 526 103Z" fill="#e2c48b"/>
      <path d="M545 175 L590 175 L590 194 L545 194Z" fill="#b5a88e"/><path d="M548 175 Q568 156 589 175" fill="none" stroke="#1f2426" strokeWidth="4"/>
      <path d="M360 16 L360 270" stroke="#231f20" strokeWidth="7"/><path d="M65 294 L360 270 L705 294" fill="none" stroke="#bb9a74" strokeWidth="4"/>
      <circle cx="506" cy="36" r="3" fill="#e0bc73"/><circle cx="531" cy="42" r="2" fill="#e0bc73"/><circle cx="552" cy="45" r="2" fill="#e0bc73"/>
      <text x="78" y="285" fill="#f2d59d" fontSize="13" letterSpacing="3">QUARTO 17 · 03:17</text>
    </svg>
  ) : (
    <svg className="casebook-scene-art" viewBox="0 0 760 310" role="img" aria-label="Reconstrução vetorial da Plataforma 4 da Estação Central">
      <rect width="760" height="310" fill="#252f37"/><path d="M0 0 H760 V100 H0Z" fill="#45525a"/>
      <path d="M0 85 L180 25 L365 85 L540 23 L760 86 V132 H0Z" fill="#56636a"/>
      <path d="M0 145 H760 V310 H0Z" fill="#313d43"/><path d="M0 216 L760 216 L760 310 H0Z" fill="#20292f"/>
      <path d="M30 126 L185 126 L185 215 L30 215Z" fill="#1d272c"/><rect x="55" y="144" width="108" height="40" rx="4" fill="#d1bd8c"/><text x="67" y="170" fill="#252f37" fontSize="18">22:08</text>
      <path d="M252 147 L720 147 L720 223 L252 223Z" fill="#28343a"/><path d="M275 158 L707 158 L707 197 L275 197Z" fill="#49575e"/>
      <path d="M280 203 L712 203" stroke="#c6a36f" strokeWidth="6"/><path d="M280 218 L712 218" stroke="#c6a36f" strokeWidth="4"/>
      <path d="M90 211 L330 211 L395 235 L30 235Z" fill="#697278"/><path d="M112 205 V170 M290 205 V170" stroke="#d6c39b" strokeWidth="5"/>
      <path d="M445 86 L545 86 L595 128 L395 128Z" fill="#1c252a"/><path d="M395 128 H595 V199 H395Z" fill="#28363c"/><path d="M418 143 H572 V185 H418Z" fill="#3f5058"/>
      <rect x="570" y="238" width="72" height="37" rx="5" fill="#9a7650"/><path d="M578 238 L588 221 L630 221 L641 238" fill="#b18d63"/>
      <path d="M0 277 H760" stroke="#d0ae75" strokeWidth="5"/><path d="M0 291 H760" stroke="#d0ae75" strokeWidth="3"/>
      <path d="M175 86 V120 M165 87 H185" stroke="#e1c58b" strokeWidth="4"/><circle cx="175" cy="73" r="17" fill="#e0c38b"/>
      <path d="M605 65 Q632 48 657 65" stroke="#e0c38b" strokeWidth="3" fill="none"/><text x="31" y="290" fill="#ecd39e" fontSize="13" letterSpacing="3">PLATAFORMA 4 · LINHA 417</text>
    </svg>
  );
}

function artifactIcon(type: string) {
  if (type.toLowerCase().includes("jornal") || type.toLowerCase().includes("manchete")) return Newspaper;
  if (type.toLowerCase().includes("foto") || type.toLowerCase().includes("imagem")) return Camera;
  if (type.toLowerCase().includes("áudio") || type.toLowerCase().includes("entrevista")) return AudioLines;
  if (type.toLowerCase().includes("objeto")) return KeyRound;
  if (type.toLowerCase().includes("mapa") || type.toLowerCase().includes("planta")) return Map;
  if (type.toLowerCase().includes("depoimento")) return ScrollText;
  return FileText;
}

function ArtifactPopup({ artifact, onClose, tone }: { artifact: Artifact; onClose: () => void; tone: "hotel" | "rail" }) {
  const Icon = artifactIcon(artifact.type);
  return (
    <div className="casebook-popup-backdrop" role="presentation" onClick={onClose}>
      <article className="casebook-popup-sheet" role="dialog" aria-modal="true" aria-labelledby="casebook-popup-title" onClick={event => event.stopPropagation()}>
        <button type="button" className="casebook-popup-close" onClick={onClose} aria-label="Fechar material"><X/></button>
        <span className="casebook-popup-type"><Icon/> {artifact.type}</span>
        <h2 id="casebook-popup-title">{artifact.title}</h2>
        {artifact.visual && artifact.visual !== "none" && <CaseSceneArt kind={tone}/>}
        <div className="casebook-popup-copy">{artifact.content.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
        <span className="casebook-popup-foot">MORADOS ORIGINALS · ARQUIVO NARRATIVO · MATERIAL FICCIONAL</span>
      </article>
    </div>
  );
}

export function InteractiveCaseBook({ caseBook, solo = false }: { caseBook: CaseBookData; solo?: boolean }) {
  const storageKey = "morados-casebook-" + caseBook.id + "-v1";
  const initial: CaseBookState = { chapter: 0, opened: [], decisions: {}, finished: false };
  const [book, setBook] = useGameState<CaseBookState>(initial, { onlineInitial: initial });
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const chapterIndex = Math.min(book.chapter, caseBook.chapters.length - 1);
  const current = caseBook.chapters[chapterIndex];

  useEffect(() => {
    if (book.finished) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && book.chapter === 0 && book.opened.length === 0 && Object.keys(book.decisions).length === 0) {
        const saved = JSON.parse(raw) as Partial<CaseBookState>;
        if (saved.chapter || saved.opened?.length || saved.decisions) setBook({ ...initial, ...saved });
      }
    } catch { /* progresso novo será mantido em memória */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(book));
  }, [book, storageKey]);

  function choose(option: BookChoice) {
    setBook({ ...book, decisions: { ...book.decisions, [chapterIndex === 0 ? "opening" : "interview"]: option.id } });
  }

  function openArtifact(item: Artifact) {
    setArtifact(item);
    if (!book.opened.includes(item.id)) setBook({ ...book, opened: [...book.opened, item.id] });
  }

  function nextPage() {
    if (chapterIndex >= caseBook.chapters.length - 1) {
      setBook({ ...book, finished: true, chapter: caseBook.chapters.length });
      return;
    }
    setBook({ ...book, chapter: chapterIndex + 1 });
  }

  function previousPage() {
    setBook({ ...book, chapter: Math.max(0, chapterIndex - 1), finished: false });
  }

  function restart() {
    setBook(initial);
    setArtifact(null);
    localStorage.removeItem(storageKey);
  }

  return (
    <section className={"casebook-experience casebook-tone-" + caseBook.tone}>
      <header className="casebook-header">
        <div className="casebook-brand"><BookOpen/><span>ARQUIVO DE INVESTIGAÇÃO</span></div>
        <span>{caseBook.caseNumber} · {solo ? "LEITURA INDIVIDUAL" : "LEITURA COMPARTILHADA"}</span>
      </header>
      {!book.finished ? (
        <div className="casebook-page">
          <div className="casebook-page-art">
            <CaseSceneArt kind={caseBook.tone}/>
            <span className="casebook-page-art-caption">{caseBook.location.toUpperCase()}</span>
            <span className="casebook-page-count">PÁGINA {chapterIndex + 1} / {caseBook.chapters.length}</span>
          </div>
          <main className="casebook-reading">
            <div className="casebook-kicker">{current.eyebrow}</div>
            <h1>{current.title}</h1>
            <div className="casebook-prose">{current.paragraphs(book).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
            {current.artifacts && current.artifacts.length > 0 && (
              <section className="casebook-inserts">
                <div className="casebook-inserts-heading"><span>MATERIAIS INSERIDOS NESTA PÁGINA</span><small>{current.artifacts.filter(item=>book.opened.includes(item.id)).length}/{current.artifacts.length} abertos</small></div>
                <div className="casebook-insert-list">{current.artifacts.map(item=>{
                  const Icon=artifactIcon(item.type);
                  return <button type="button" className={book.opened.includes(item.id)?"is-opened":""} key={item.id} onClick={()=>openArtifact(item)}>
                    <span className="casebook-insert-icon"><Icon/></span><span className="casebook-insert-copy"><strong>{item.title}</strong><small>{item.teaser}</small></span><span className="casebook-insert-open">{book.opened.includes(item.id)?"Lido":"Abrir"} <ChevronRight/></span>
                  </button>;
                })}</div>
              </section>
            )}
            {current.choice && (
              <section className="casebook-reader-choice">
                <span>{current.choice.prompt}</span>
                <div>{current.choice.options.map(option=><button type="button" key={option.id} className={Object.values(book.decisions).includes(option.id)?"is-selected":""} onClick={()=>choose(option)}>
                  <strong>{option.label}</strong><small>{option.detail}</small>{Object.values(book.decisions).includes(option.id)&&<Check/>}
                </button>)}</div>
              </section>
            )}
            <footer className="casebook-controls">
              <button type="button" className="casebook-back" onClick={previousPage} disabled={chapterIndex===0}><ChevronLeft/> Anterior</button>
              <span>{caseBook.caseNumber} · {Object.keys(book.decisions).length} escolhas registradas</span>
              <button type="button" className="casebook-next" onClick={nextPage}>{chapterIndex===caseBook.chapters.length-1?"Ler relatório final":"Continuar história"} <ChevronRight/></button>
            </footer>
          </main>
          <aside className="casebook-side">
            <div className="casebook-side-mark"><Fingerprint/></div>
            <span>DOSSIÊ {caseBook.caseNumber}</span><strong>{caseBook.title}</strong><p>{caseBook.introduction}</p>
            <div className="casebook-side-progress"><div><span>Leitura</span><b>{Math.round(((chapterIndex+1)/caseBook.chapters.length)*100)}%</b></div><i><span style={{width:((chapterIndex+1)/caseBook.chapters.length*100)+"%"}}/></i></div>
            <div className="casebook-side-counts"><span><FileText/><b>{book.opened.length}</b><small>materiais lidos</small></span><span><Clock3/><b>{chapterIndex+1}</b><small>capítulos</small></span></div>
          </aside>
        </div>
      ) : (
        <div className="casebook-closing">
          <div className="casebook-closing-art"><CaseSceneArt kind={caseBook.tone}/></div>
          <span>RELATÓRIO DE ENCERRAMENTO · CASO {caseBook.caseNumber}</span>
          <h1>O que foi descoberto</h1>
          {caseBook.closing(book).map((paragraph,index)=><p key={index}>{paragraph}</p>)}
          <div className="casebook-closing-note"><ShieldAlert/><span>Algumas lacunas permanecem no arquivo. Nem todos os desaparecimentos receberam uma resposta.</span></div>
          <button type="button" onClick={restart}>Ler o dossiê novamente <BookOpen/></button>
        </div>
      )}
      {artifact && <ArtifactPopup artifact={artifact} tone={caseBook.tone} onClose={()=>setArtifact(null)}/>}
    </section>
  );
}

export function CoupleInvestigationBook({ solo = false }: { solo?: boolean }) {
  return <InteractiveCaseBook caseBook={CASE_001} solo={solo}/>;
}
export function CoupleTrainInvestigationBook({ solo = false }: { solo?: boolean }) {
  return <InteractiveCaseBook caseBook={CASE_002} solo={solo}/>;
}
