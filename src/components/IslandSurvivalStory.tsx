import { useEffect, useMemo, useState } from "react";
import { Anchor, ArrowRight, BookOpen, Check, Compass, Droplets, FileText, HeartPulse, Package, Radio, Sparkles, Trees, Wrench, X } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";
import "./StoryGames.css";

type ResourceId = "food" | "water" | "wood" | "cloth" | "metal" | "medicine" | "rope" | "battery";
type ResourceBag = Record<ResourceId, number>;
type Choice = { id: string; label: string; detail: string; consequence: string; next: string; effect: string; decisionKey: string };
type Artifact = { id: string; label: string; type: string; teaser: string; body: string[] };
type Puzzle = { id: string; title: string; prompt: string; options: { id: string; label: string; detail: string }[]; answer: string; success: string; failure: string };
type StoryNode = {
  id: string; day: number; chapter: string; title: string; scene: string;
  body: (state: SurvivalBookState) => string[];
  artifacts?: Artifact[]; choices?: Choice[]; next?: string; puzzle?: Puzzle; ending?: string;
};
type SurvivalBookState = {
  node: string;
  resources: ResourceBag;
  inventory: string[];
  decisions: Record<string, string>;
  flags: string[];
  puzzleAnswers: Record<string, string>;
  day: number;
  health: number;
  trust: number;
  finished: boolean;
  ending: string;
};

const STORAGE_KEY = "morados-island-storybook-v3";
const initial: SurvivalBookState = {
  node: "day1-beach",
  resources: { food: 4, water: 5, wood: 1, cloth: 1, metal: 0, medicine: 0, rope: 0, battery: 0 },
  inventory: ["transmissor quebrado", "chave de latão de Noah"],
  decisions: {}, flags: [], puzzleAnswers: {}, day: 1, health: 5, trust: 0, finished: false, ending: "",
};
const resources: { id: ResourceId; label: string; Icon: typeof Package }[] = [
  { id: "food", label: "Comida", Icon: Package }, { id: "water", label: "Água", Icon: Droplets },
  { id: "wood", label: "Madeira", Icon: Trees }, { id: "cloth", label: "Tecido", Icon: Package },
  { id: "metal", label: "Metal", Icon: Wrench }, { id: "medicine", label: "Remédios", Icon: HeartPulse },
  { id: "rope", label: "Corda", Icon: Anchor }, { id: "battery", label: "Bateria", Icon: Radio },
];

const scene: Record<string, StoryNode> = {
  "day1-beach": {
    id: "day1-beach", day: 1, chapter: "Capítulo I · A terra que não constava no mapa", title: "A praia dos objetos sem dono", scene: "shore",
    body: () => [
      "Quando Lia abriu os olhos, a primeira coisa que viu foi uma gaivota caminhando sobre o relógio de pulso de Noah. O relógio continuava funcionando. Os ponteiros marcavam 16h42. O céu, porém, tinha a cor de uma coisa que apodreceu por dentro.",
      "O Ventania estava partido em dois. A parte dianteira desaparecera entre os recifes; a cabine repousava na areia, inclinada, com as janelas estilhaçadas. Noah respirava. Havia sangue seco junto à orelha, mas ele respondeu quando Lia chamou seu nome. O rádio de emergência ainda estava preso ao cinto dele, embora a antena tivesse sido arrancada.",
      "A ilha parecia desabitada. Mesmo assim, havia pegadas recentes entre as pedras — pequenas demais para serem de Noah e profundas demais para pertencerem a uma ave. Ao lado delas, alguém deixara três conchas dispostas em linha reta. Nenhuma onda alcançava aquele ponto."
    ],
    artifacts: [
      { id: "watch", label: "Relógio de Noah", type: "Objeto recolhido", teaser: "16h42. O mecanismo não parou com o naufrágio.", body: ["O vidro está trincado, mas os ponteiros avançam normalmente. A pulseira tem uma mancha escura que não parece ferrugem.", "No verso, gravado à mão, há uma frase quase apagada: 'Volte antes da segunda maré'. Noah afirma que o relógio pertenceu ao avô. Ele nunca havia mencionado a inscrição."] },
      { id: "shells", label: "As três conchas", type: "Registro fotográfico", teaser: "Uma composição deliberada na areia molhada.", body: ["As conchas foram colocadas com a abertura voltada para o interior da ilha. A distância entre elas é quase idêntica.", "Não há pegadas em volta. A maré não alcançou o local e o vento soprava na direção oposta. Parece um sinal, não um acaso."] },
    ],
    choices: [
      { id: "cove", label: "Seguir as pegadas até a enseada", detail: "Lia segue as pegadas até uma enseada escondida. O trajeto é estreito e a maré está subindo, mas há sinais de água doce entre as pedras.", consequence: "Vocês podem encontrar água potável e folhas medicinais, mas deixam os destroços para trás. Ferramentas e peças do transmissor podem afundar antes que consigam voltar.", next: "day1-cove", effect: "cove", decisionKey: "route" },
      { id: "wreck", label: "Voltar aos destroços do Ventania", detail: "Noah retorna ao Ventania para retirar a caixa de ferramentas, cabos e peças metálicas. A estrutura está instável e cada minuto aumenta o risco de um novo desabamento.", consequence: "Vocês recuperam materiais úteis para construir e consertar equipamentos, mas não encontram uma fonte de água. A enseada pode continuar sendo um mistério por mais tempo.", next: "day1-wreck", effect: "wreck", decisionKey: "route" },
    ],
  },
  "day1-cove": {
    id: "day1-cove", day: 1, chapter: "Capítulo I · A terra que não constava no mapa", title: "A água que corria para dentro", scene: "spring",
    body: () => [
      "A passagem terminava numa fenda entre duas paredes de pedra. A água escorria por ela, mas não descia até o mar: desaparecia por baixo da rocha, como se a ilha a estivesse bebendo. Lia provou uma gota. Era doce, fria e tinha um leve gosto mineral.",
      "Noah encontrou folhas amarradas num galho, separadas por tamanho. Não eram plantas dispostas por um animal. Alguém havia preparado um pequeno feixe para secar. No chão, uma lata de conserva servia de recipiente. Dentro dela havia água suficiente para duas pessoas.",
      "A descoberta deveria tranquilizá-los. Em vez disso, Noah ficou olhando para a lata. A ferrugem cobria quase toda a superfície, menos uma faixa limpa em volta da borda — como se tivesse sido lavada naquela manhã."
    ],
    artifacts: [{ id: "tin-cove", label: "Lata junto à nascente", type: "Objeto recolhido", teaser: "Uma lata antiga, lavada há poucas horas.", body: ["A marca impressa indica fabricação há pelo menos quinze anos. Não há rótulo legível, apenas o desenho de uma andorinha.", "A ferrugem foi removida da borda com um pano ou com a mão. A lata não estava ali havia muito tempo."] }],
    next: "day1-night",
  },
  "day1-wreck": {
    id: "day1-wreck", day: 1, chapter: "Capítulo I · A terra que não constava no mapa", title: "O interior do casco", scene: "wreck",
    body: () => [
      "O casco rangia como uma porta enorme. Noah entrou primeiro, apoiando a mão boa nas nervuras de madeira. A água chegava aos joelhos e carregava pequenos pedaços de papel. A caixa de ferramentas estava presa sob uma bancada, mas a maleta de latão — a que guardava o transmissor auxiliar — havia sumido.",
      "Lia encontrou um pedaço de tecido preso a um prego. Era azul-escuro, igual ao forro do casaco que Noah usava quando embarcaram. Ele olhou para o próprio casaco: o forro estava intacto. O tecido era mais antigo, desbotado e cheirava a fumaça.",
      "Atrás da bancada, havia uma placa de metal aparafusada no casco. O número de série não pertencia ao Ventania. Sob a tinta recente, aparecia a gravação de outro nome: Aurora."
    ],
    artifacts: [
      { id: "serial-plate", label: "Placa de identificação", type: "Fotografia pericial", teaser: "O casco traz um número que não pertence ao barco.", body: ["A placa foi coberta por uma camada de tinta azul. Sob ela, o nome AURORA e um número de registro parcialmente legível.", "O Ventania foi comprado de segunda mão, mas Noah jura que o antigo proprietário nunca mencionou outra embarcação."] },
      { id: "blue-cloth", label: "Retalho azul", type: "Vestígio material", teaser: "Tecido velho preso à madeira recém-partida.", body: ["As fibras estão ressecadas e impregnadas de sal. O corte é reto, feito por lâmina ou tesoura.", "O tecido não se desprendeu do casaco de Noah. É uma peça diferente, possivelmente de um uniforme antigo."] },
    ],
    next: "day1-night",
  },
  "day1-night": {
    id: "day1-night", day: 1, chapter: "Capítulo I · A terra que não constava no mapa", title: "A primeira noite não termina", scene: "night",
    body: (s) => [
      s.decisions.route === "cove" ? "A água da enseada encheu os dois recipientes. Lia separou as folhas que reconheceu como medicinais, enquanto Noah tentava reparar o transmissor com a chave de latão. A ilha oferecia o necessário para uma noite. O que inquietava os dois era a lata lavada, abandonada ali para que alguém a encontrasse." : "As ferramentas foram salvas, mas a maleta auxiliar desapareceu. Noah guardou a placa de identificação no bolso e não respondeu quando Lia perguntou por que o nome Aurora lhe parecia familiar. O casco já não podia ser explorado sem risco. Ainda assim, havia algo que ele queria procurar.",
      "Montaram um abrigo junto à linha das árvores. Antes de anoitecer, ouviram um som vindo do interior da mata: três batidas, uma pausa, depois duas. O rádio respondeu com um estalo, embora estivesse desligado. Noah jurou ter visto uma luz acender entre as árvores.",
      "Às 23h17, uma voz saiu do alto-falante partido. Não era uma transmissão distante. Parecia estar do outro lado da praia, muito perto do acampamento. A voz disse apenas: 'Vocês chegaram tarde'. Depois, alguém respirou junto ao microfone."
    ],
    artifacts: [
      { id: "radio-voice", label: "Transcrição do rádio · 23h17", type: "Áudio transcrito", teaser: "Uma voz curta, sem identificação de frequência.", body: ["[23:17:04] Ruído de estática. Três estalos secos. [23:17:11] Voz feminina, baixa: 'Vocês chegaram tarde'. [23:17:16] Respiração próxima ao microfone. [23:17:21] Fim abrupto.", "O arquivo foi gravado na memória interna do transmissor, mas o rádio estava sem bateria. O registro não deveria existir."] },
    ],
    choices: [
      { id: "noah-watch", label: "Noah fica de vigia", detail: "Noah fica acordado perto do transmissor quebrado. Ele conhece os códigos de emergência e talvez reconheça a voz que saiu do aparelho, mas ainda está ferido e exausto.", consequence: "A vigia pode revelar por que a voz chamou Noah pelo nome e deixa marcas de botas próximas ao abrigo. Lia, porém, terá de descansar sem companhia.", next: "day2-dawn", effect: "watch-noah", decisionKey: "watch" },
      { id: "lia-watch", label: "Lia fica de vigia", detail: "Lia assume a vigia porque reconhece rastros, plantas e mudanças no vento. Noah tenta dormir e recuperar as forças antes de avançarem.", consequence: "A vigia pode revelar um sinal escondido na areia e uma rota segura para o interior. Enquanto isso, Noah não acompanha a transmissão que parece conhecer o passado dele.", next: "day2-dawn", effect: "watch-lia", decisionKey: "watch" },
    ],
  },
  "day2-dawn": {
    id: "day2-dawn", day: 2, chapter: "Capítulo II · O que a mata guardou", title: "A manhã tem passos", scene: "forest",
    body: (s) => [
      s.decisions.watch === "noah" ? "Noah não dormiu. Perto das quatro, a voz voltou, desta vez pronunciando o nome dele. Não havia direção no som; parecia atravessar o chão e subir pelas raízes. Quando o dia clareou, ele encontrou marcas de botas junto ao abrigo — uma pessoa havia circulado o acampamento sem se aproximar da entrada." : "Lia ouviu o chamado e não respondeu. Esperou até que a mata ficasse silenciosa. Ao amanhecer, encontrou uma linha fina de cinzas sobre a areia, formando uma seta para o interior da ilha. Nenhuma fogueira fora acesa ali.",
      s.resources.water <= 1 ? "O primeiro amanhecer trouxe também uma conta difícil: os recipientes estavam quase vazios. Noah passou a separar cada gole, enquanto Lia calculava quantos dias conseguiriam avançar sem encontrar outra fonte de água." : "A água recuperada na enseada ainda bastava para alguns dias. Lia marcou os recipientes com pequenas linhas para que nenhum dos dois confundisse o que restava com o que já havia sido consumido.",
      "O mapa náutico de bordo mostrava apenas mar aberto naquela região. A ilha não tinha nome, escala ou coordenadas. No entanto, entre as árvores havia um caminho de pedras cortadas, coberto por musgo. A vegetação crescera ao redor dele, mas não sobre ele.",
      "Noah reconheceu o padrão das pedras. Era uma antiga trilha de manutenção, usada para conduzir técnicos até alguma instalação. A pergunta deixou de ser se havia alguém na ilha. Agora era por que aquela pessoa não queria ser encontrada."
    ],
    artifacts: [{ id: "ash-map", label: "Seta de cinzas", type: "Fotografia de campo", teaser: "A marca aponta para uma trilha que não aparece no mapa.", body: ["As cinzas estão frias, mas secas. A chuva da madrugada não as dispersou porque alguém as protegeu com uma folha larga.", "A seta termina diante de três pedras claras. A posição coincide com a trilha de manutenção encontrada por Noah."] }],
    choices: [
      { id: "follow-stones", label: "Seguir a trilha de pedras", detail: "Seguir as pedras cortadas leva à antiga trilha de manutenção. O caminho pode terminar numa construção protegida, mas exige atravessar uma ponte deteriorada.", consequence: "Vocês se aproximam de documentos e mecanismos deixados na ilha. O percurso é mais físico e pode consumir tempo antes da próxima tempestade.", next: "day2-stones", effect: "stones", decisionKey: "approach" },
      { id: "follow-voice", label: "Seguir a direção do sinal", detail: "Lia e Noah seguem a interferência do rádio pela mata. A origem do sinal pode revelar quem está falando, embora o caminho abandone a trilha mais segura.", consequence: "Vocês podem recuperar uma bateria e uma gravação antiga, aproximando-se da verdade sobre as chegadas anteriores. Em troca, deixam a instalação de manutenção sem ser explorada por enquanto.", next: "day2-signal", effect: "signal", decisionKey: "approach" },
    ],
  },
  "day2-stones": {
    id: "day2-stones", day: 2, chapter: "Capítulo II · O que a mata guardou", title: "A trilha interrompida", scene: "forest",
    body: () => [
      "A trilha terminava diante de uma pequena ponte de madeira. Do outro lado, havia uma construção baixa coberta por raízes. A porta estava trancada com três discos de metal, cada um marcado por símbolos: uma onda, uma estrela e uma espiral.",
      "No batente, alguém escreveu números com carvão: 2 · 1 · 3. Noah tentou girar os discos nessa ordem. O mecanismo se moveu, mas a fechadura não abriu. Lia percebeu que os símbolos apareciam também numa sequência de riscos na pedra, como se a ordem fosse outra.",
      "Do interior veio um ruído de fita rebobinando. A porta não estava vazia. Alguém, ou alguma coisa, estava esperando que eles entendessem a mensagem."
    ],
    puzzle: {
      id: "stone-lock", title: "A fechadura dos três sinais",
      prompt: "Os riscos na pedra mostram a sequência: onda, espiral, estrela. Escolham a ordem correta para os discos.",
      options: [
        { id: "wave-star-spiral", label: "Onda · Estrela · Espiral", detail: "2 · 1 · 3" },
        { id: "wave-spiral-star", label: "Onda · Espiral · Estrela", detail: "1 · 3 · 2" },
        { id: "spiral-wave-star", label: "Espiral · Onda · Estrela", detail: "3 · 2 · 1" },
      ],
      answer: "wave-spiral-star",
      success: "Os discos encaixam. A trava se abre com um clique que parece vir de muito fundo.",
      failure: "A fechadura não abre. Ao tentar de novo, Lia percebe que os riscos representam os símbolos, não os números escritos no batente.",
    },
    artifacts: [{ id: "stone-rubbing", label: "Decalque dos símbolos", type: "Anotação de Lia", teaser: "Três marcas repetidas na pedra do batente.", body: ["O desenho apresenta uma onda na primeira linha, uma espiral na segunda e uma estrela na terceira. Ao lado, há riscos de contagem — um, três, dois.", "O carvão com os números 2 · 1 · 3 parece ter sido escrito por outra pessoa, em outra ocasião. Talvez alguém tenha tentado enganar quem chegasse depois."] }],
    next: "day3-storm",
  },
  "day2-signal": {
    id: "day2-signal", day: 2, chapter: "Capítulo II · O que a mata guardou", title: "A frequência sob as raízes", scene: "radio",
    body: () => [
      "A bússola apontava para norte, mas o rádio chiava sempre que Lia olhava para o oeste. Noah desmontou o aparelho e encontrou um fio de cobre escondido no compartimento da bateria. O fio não fazia parte do circuito original; alguém o soldara depois.",
      "Seguindo a interferência, chegaram a uma árvore oca. Dentro dela havia uma pequena caixa de madeira, protegida por cera. O objeto tinha o peso de um gravador portátil e um botão vermelho que ainda oferecia resistência ao toque.",
      "A gravação continha uma contagem. Não era uma mensagem de socorro: era a lista de horários em que alguém deveria acender uma luz. A última anotação tinha a data de seis anos atrás."
    ],
    artifacts: [{ id: "tree-recorder", label: "Gravador na árvore", type: "Objeto recolhido", teaser: "Uma lista de horários com seis anos de idade.", body: ["A fita registra sete horários, sempre às 23h17. Em cada um, uma voz diferente lê uma palavra: 'porta', 'água', 'nome', 'volta', 'norte', 'ninguém', 'chegou'.", "A última faixa foi gravada há seis anos. Ao fundo, ouve-se o mesmo ruído que acompanhou a voz no rádio do Ventania."] }],
    next: "day3-storm",
  },
  "day3-storm": {
    id: "day3-storm", day: 3, chapter: "Capítulo III · A casa atrás da chuva", title: "O temporal muda a ilha", scene: "storm",
    body: (s) => [
      "A tempestade chegou antes do meio-dia. A chuva caiu tão inclinada que parecia vir do chão. A ponte de madeira desapareceu sob a água e o abrigo começou a ceder. No meio do estrondo, Lia ouviu uma pancada vinda de dentro da construção — três golpes, uma pausa, dois golpes.",
      "Noah queria voltar para o abrigo e esperar. Lia viu uma luz no alto da encosta e, logo depois, uma figura atravessando a chuva com dificuldade. Não era uma sombra: era uma pessoa, carregando alguma coisa contra o peito.",
      s.decisions.route === "wreck" ? "Noah reconheceu a silhueta antes de Lia. Disse o nome Aurora, quase sem voz. A placa do casco e a figura pareciam pertencer à mesma lembrança que ele vinha tentando esconder." : "A figura caiu perto das pedras. Quando se aproximaram, encontraram apenas um casaco encharcado, sem ninguém dentro. No bolso havia uma fotografia recente dos dois, tirada na praia antes que acordassem.",
    ],
    artifacts: [
      { id: "wet-photo", label: "Fotografia molhada", type: "Imagem encontrada", teaser: "Lia e Noah aparecem na praia — fotografados de longe.", body: ["A fotografia foi feita de um ponto elevado, possivelmente da encosta. As roupas dos dois correspondem às que usavam antes do naufrágio.", "No verso, a data é de ontem. O papel foi revelado em laboratório; não é uma impressão digital. A borda tem uma marca de carimbo: ESTAÇÃO AURORA."] },
      { id: "empty-coat", label: "Casaco sem corpo", type: "Vestígio material", teaser: "A peça foi deixada na chuva como se alguém a tivesse abandonado.", body: ["O casaco é pesado, de lã escura, com sinais de uso antigo. Os bolsos estão vazios, exceto por um pedaço de papel dobrado em quatro.", "No papel há duas linhas: 'Não confiem no primeiro resgate' e 'A casa não está vazia'. A caligrafia parece feminina."] },
    ],
    choices: [
      { id: "save-photo", label: "Salvar a fotografia e procurar abrigo", detail: "Lia protege a fotografia encontrada na encosta e procura abrigo antes que a chuva destrua o papel. A imagem pode mostrar quem acompanhou o naufrágio.", consequence: "Vocês preservam uma prova capaz de mudar a interpretação do naufrágio e descobrir a estação Aurora. O ferimento de Noah, porém, permanece sem tratamento adequado.", next: "day3-photo", effect: "photo", decisionKey: "storm" },
      { id: "save-medicine", label: "Procurar o kit médico na encosta", detail: "Noah precisa de curativos e antisséptico antes de enfrentar outra caminhada. Lia procura o kit médico entre as pedras, mesmo com a encosta ficando escorregadia.", consequence: "Vocês recuperam remédios e estabilizam Noah, reduzindo o risco de perder forças mais adiante. A fotografia deixada na chuva pode ficar ilegível ou desaparecer.", next: "day3-medicine", effect: "medicine", decisionKey: "storm" },
    ],
  },
  "day3-photo": {
    id: "day3-photo", day: 3, chapter: "Capítulo III · A casa atrás da chuva", title: "A imagem que chegou antes de vocês", scene: "shelter",
    body: () => [
      "Lia escondeu a fotografia dentro da camisa. A figura que a havia deixado não parecia querer feri-los; queria que soubessem que estavam sendo observados. A diferença não trouxe alívio.",
      "Noah encontrou uma pequena marca no canto da imagem: uma série de quatro números. Quando os comparou ao código do transmissor, o rosto dele perdeu a cor. Era o número de registro do Aurora, o barco que havia desaparecido seis anos antes.",
      "O nome gravado sob a tinta do casco não era uma coincidência. O Ventania fora construído sobre peças de uma embarcação que nunca retornou."
    ],
    next: "day4-station",
  },
  "day3-medicine": {
    id: "day3-medicine", day: 3, chapter: "Capítulo III · A casa atrás da chuva", title: "A caixa de primeiros socorros", scene: "shelter",
    body: () => [
      "O kit estava preso sob uma viga caída. Havia gaze, antisséptico e duas ampolas dentro de uma bolsa térmica. A data de validade era recente. A etiqueta com o nome do fabricante, porém, estava arrancada.",
      "Lia tratou o corte de Noah. Ele deixou que ela trabalhasse sem reclamar, mas segurava a chave de latão com tanta força que a borda marcou a palma da mão. Quando Lia perguntou o que havia no Aurora, ele respondeu: 'Uma pessoa que eu devia ter procurado'.",
      "A chuva diminuiu. No silêncio que veio depois, um sino tocou uma vez no interior da mata. Nenhum dos dois viu torre, igreja ou qualquer construção alta."
    ],
    next: "day4-station",
  },
  "day4-station": {
    id: "day4-station", day: 4, chapter: "Capítulo IV · A estação", title: "A sala que não aparece na planta", scene: "station",
    body: (s) => [
      "A construção escondida sob as raízes era uma estação meteorológica. O teto havia cedido, mas a sala principal permanecia seca. Mapas cobriam as paredes. Em todos, a ilha tinha nomes diferentes e contornos ligeiramente alterados, como se alguém tentasse apagar sua posição exata.",
      s.resources.food === 0 || s.resources.water === 0 ? "A busca custava mais do que tempo. A comida já não dava para uma refeição inteira e a água restante mal cobria o fundo de um cantil. Noah caminhava devagar, escondendo o tremor nas mãos para que Lia não interrompesse a investigação." : "Ainda havia mantimentos, mas cada pacote aberto diminuía a margem de segurança. Lia anotou o que restava no mapa, ao lado das coordenadas que ninguém parecia querer registrar.",
      "No centro havia uma mesa, duas cadeiras e um gravador de rolo. Uma das cadeiras estava virada para a parede. A outra tinha marcas recentes nos braços, feitas por unhas ou por uma ferramenta estreita.",
      s.decisions.watch === "noah" ? "Noah reconheceu a caligrafia num dos mapas. Era a mesma de uma carta que recebera seis anos atrás, depois do desaparecimento do Aurora. Ele havia guardado a carta sem contar a Lia." : "Lia encontrou seu próprio nome numa lista de passageiros de seis anos atrás. O documento não dizia que ela estivera na ilha; dizia que alguém havia registrado a presença dela antes de sua primeira viagem ao Ventania.",
    ],
    artifacts: [
      { id: "weather-log", label: "Diário da estação", type: "Documento oficial", teaser: "Páginas de observação climática com datas impossíveis.", body: ["O diário começa há quinze anos e termina seis anos atrás. Em várias páginas, a mesma frase aparece no rodapé: 'Não abrir a porta depois da terceira maré'.", "As coordenadas foram alteradas à mão. O responsável assinava apenas com a letra A. Na última página, há uma anotação: 'O resgate foi avisado. O resgate não deve chegar'."] },
      { id: "passenger-list", label: "Lista de passageiros", type: "Documento recuperado", teaser: "Os nomes de Lia e Noah aparecem antes de se conhecerem.", body: ["A lista foi datilografada seis anos antes da viagem do Ventania. Entre os nomes, aparecem Lia Azevedo e Noah Ferraz, com datas de nascimento corretas.", "O documento tem uma observação: 'duas pessoas, mesma rota, primeira tentativa'. Não há assinatura de autoridade ou empresa responsável."] },
    ],
    choices: [
      { id: "repair-radio", label: "Tentar reconstruir o transmissor", detail: "Noah quer reconstruir o transmissor com fio de cobre, bateria e peças metálicas. Se o circuito funcionar, a mensagem pode alcançar o continente — ou alguém que já esteja na ilha.", consequence: "Um rádio funcional aumenta a chance de pedir resgate e permite ouvir respostas com mais clareza. O tempo gasto na bancada deixa o compartimento inferior sem ser investigado.", next: "day5-radio", effect: "repair", decisionKey: "station" },
      { id: "search-lower-room", label: "Descer ao compartimento inferior", detail: "Lia prefere descer ao compartimento inundado antes que a maré cubra a escada. O espaço pode guardar registros sobre os antigos ocupantes da ilha.", consequence: "Vocês podem encontrar gravações e lembranças de chegadas anteriores, inclusive uma fita com o nome de Lia. Mas o transmissor continuará quebrado até que encontrem outra oportunidade de repará-lo.", next: "day5-lower-room", effect: "lower-room", decisionKey: "station" },
    ],
  },
  "day5-radio": {
    id: "day5-radio", day: 5, chapter: "Capítulo V · A voz do outro lado", title: "A resposta não veio do continente", scene: "radio",
    body: () => [
      "Noah usou a bateria do gravador, o fio de cobre da árvore e os contatos de uma lanterna para montar um circuito. O transmissor acendeu. Por alguns segundos, só houve estática. Depois, uma voz respondeu com uma clareza impossível: 'Noah, você finalmente voltou'.",
      "A voz era de uma mulher. Noah sentou-se no chão. Lia nunca o vira tão assustado. Quando ele perguntou quem falava, a mulher respondeu: 'A pessoa que você deixou esperando na primeira noite'.",
      "A transmissão terminou com um som de água batendo contra metal. No mesmo instante, as luzes da estação acenderam, uma a uma, embora não houvesse energia no prédio."
    ],
    artifacts: [{ id: "radio-transcript-five", label: "Transcrição da chamada", type: "Áudio transcrito", teaser: "A voz conhece o nome de Noah e um acontecimento que ele nunca contou.", body: ["[20:03:11] Voz feminina: 'Noah, você finalmente voltou'. [20:03:17] Noah: 'Quem está falando?' [20:03:21] Voz: 'A pessoa que você deixou esperando na primeira noite'.", "[20:03:38] Ruído de água e metal. [20:03:42] Voz: 'Não tragam o barco para a enseada'. [20:03:47] Fim da gravação.", "Noah afirma não reconhecer a voz. A reação dele contradiz a resposta."] }],
    next: "day6-revelation",
  },
  "day5-lower-room": {
    id: "day5-lower-room", day: 5, chapter: "Capítulo V · A voz do outro lado", title: "O compartimento inundado", scene: "cave",
    body: () => [
      "A escada descia até uma sala parcialmente tomada pela água. Havia prateleiras com caixas lacradas, roupas dobradas e dezenas de fitas etiquetadas com nomes. Algumas eram recentes. Outras estavam cobertas por uma película de sal.",
      "Lia encontrou uma fita com seu sobrenome. A etiqueta trazia uma data de seis anos antes do primeiro encontro com Noah. Quando a colocou no gravador, ouviu a própria voz, mais jovem, dizendo: 'Eu não vou esquecer o que aconteceu aqui'.",
      "Ela parou a fita. Não se lembrava da gravação. Não se lembrava de ter estado na ilha. Mas reconheceu o medo na própria voz."
    ],
    artifacts: [{ id: "lia-tape", label: "Fita com o nome de Lia", type: "Gravação recuperada", teaser: "Uma voz idêntica à dela, gravada seis anos antes.", body: ["A fita contém 43 segundos. A voz é compatível com a de Lia, mas a gravação antecede a viagem em que ela conheceu Noah.", "No fim, alguém pergunta: 'Você vai lembrar da segunda vez?' A resposta é um silêncio longo, seguido por um único toque de sino."] }],
    next: "day6-revelation",
  },
  "day6-revelation": {
    id: "day6-revelation", day: 6, chapter: "Capítulo VI · O inventário das lembranças", title: "O nome que foi apagado", scene: "archive",
    body: (s) => [
      "A última caixa não tinha etiqueta. Dentro havia duas fotografias, uma certidão de óbito e um caderno escrito por alguém chamado Maia Valença. A certidão declarava que Maia morrera seis anos antes, durante o desaparecimento do Aurora. A fotografia mais recente mostrava a mesma mulher viva, diante da estação, segurando uma placa com a data de ontem.",
      "Noah finalmente contou. Seis anos antes, ele e Maia haviam recebido um sinal de socorro durante uma travessia. Ele escolheu seguir a rota comercial; o barco de Maia desapareceu. Depois, recebeu uma carta com as coordenadas da ilha e nunca respondeu. A chave de latão era dela — não do avô.",
      "Lia abriu o caderno. A primeira página continha a frase: 'Se chegaram até aqui, a memória não é a única coisa que foi repetida'. As páginas seguintes descreviam outras chegadas, outros barcos e pessoas que juravam nunca ter estado ali. O último registro tinha dois nomes: Lia e Noah."
    ],
    artifacts: [
      { id: "maia-journal", label: "Caderno de Maia", type: "Diário pessoal", teaser: "Registros de várias chegadas à ilha, sempre com os mesmos nomes.", body: ["Maia descreve uma estação que altera registros, coordenadas e lembranças. Ela acredita que a ilha não repete os dias, mas repete decisões: cada pessoa retorna ao lugar onde escolheu não responder a um pedido de socorro.", "Na última página, a letra muda. A frase é curta: 'Não tentem salvar a pessoa que eu fui. Procurem a que ainda está aqui'."] },
      { id: "death-certificate", label: "Certidão de óbito", type: "Documento civil", teaser: "Maia foi declarada morta, mas há uma foto recente.", body: ["O documento registra o desaparecimento do Aurora e um óbito presumido. A assinatura da autoridade é real; o número do processo, porém, pertence a outro município.", "A fotografia recente mostra Maia com o mesmo casaco descrito na transcrição do rádio. O carimbo no verso é da Estação Aurora."] },
    ],
    choices: [
      { id: "search-maia", label: "Procurar Maia dentro da estação", detail: "Lia quer encontrar Maia, a mulher que aparece nos documentos e parece conhecer cada chegada à ilha. Seguir seus rastros pode explicar a história do Aurora e o medo de Noah.", consequence: "Vocês podem ouvir a versão de Maia e descobrir o que a ilha espera dos sobreviventes. A busca não garante que o continente saiba onde vocês estão.", next: "day7-maia", effect: "maia", decisionKey: "final" },
      { id: "send-rescue", label: "Transmitir as coordenadas ao continente", detail: "Noah e Lia tentam transmitir as coordenadas para o continente antes que a maré cubra os equipamentos. É a decisão mais direta para buscar ajuda externa.", consequence: "Um resgate pode chegar, mas a transmissão também pode atrair a embarcação errada. Vocês talvez nunca descubram por que Maia os esperava nem o que aconteceu com o Aurora.", next: "day7-rescue", effect: "rescue", decisionKey: "final" },
    ],
  },
  "day7-maia": {
    id: "day7-maia", day: 7, chapter: "Capítulo VII · A última maré", title: "A mulher que esperava", scene: "shore",
    body: (s) => [
      "Maia estava sentada no limite da água, de costas para a ilha. Não parecia surpresa ao vê-los. O tempo tinha deixado marcas no rosto dela, mas não seis anos de marcas. Parecia ter envelhecido apenas algumas semanas.",
      "Ela disse que a ilha não era uma prisão construída por alguém. Era uma falha nas rotas, uma dobra de correntes e sinais que fazia as embarcações retornarem ao mesmo ponto quando alguém ignorava um pedido de socorro. Não exigia sacrifício. Exigia que alguém, pela primeira vez, respondesse.",
      s.decisions.route === "wreck" ? "Noah colocou a placa do Aurora na areia. Maia a reconheceu e chorou sem fazer barulho. A placa tinha sido arrancada do barco antes do desaparecimento — por ele, na noite em que escolheu partir." : "Lia mostrou a fotografia. Maia confirmou que a tirara na primeira noite, mas não explicou como o papel chegara às mãos deles antes de a fotografia ser revelada. Disse apenas que algumas provas precisam chegar antes da pergunta.",
      "Quando o sino tocou, não veio da mata. Veio debaixo da água."
    ],
    next: "ending",
  },
  "day7-rescue": {
    id: "day7-rescue", day: 7, chapter: "Capítulo VII · A última maré", title: "O sinal para o mundo", scene: "radio",
    body: () => [
      "Lia transmitiu as coordenadas em intervalos regulares. Noah manteve o circuito aberto e repetiu a mensagem até a garganta ficar seca. No quarto minuto, alguém respondeu com o código internacional de resgate.",
      s.flags.includes("radio-repaired") ? "A resposta chegou limpa, com o código internacional de resgate. A confirmação deveria ter encerrado o medo. Em vez disso, o rádio captou uma segunda transmissão, na mesma frequência, com a voz de Maia: 'Não deixem que tragam o barco para a enseada'." : "A bateria quase não sustentou a transmissão. A mensagem saiu em fragmentos, sem confirmação do continente. Antes que o circuito apagasse, uma voz feminina atravessou a estática: 'Não deixem que tragam o barco para a enseada'.",
      "Ao longe, uma luz avançou pela névoa. Não era uma embarcação de resgate. Era o Aurora, inteiro, com as luzes acesas e a mesma placa enferrujada que encontraram no casco do Ventania."
    ],
    next: "ending",
  },
  "ending": {
    id: "ending", day: 7, chapter: "Epílogo · O que o mar devolve", title: "A ilha ainda tem uma página", scene: "night",
    body: (s) => [
      s.decisions.final === "maia" ? "Maia caminhou com eles até a praia. Não havia barco à espera, nem helicóptero, nem luz de busca. Quando a maré recuou, a estação desapareceu atrás de uma parede de névoa. O caderno permaneceu com Lia. Na última folha, uma nova linha surgiu sob os nomes dos dois: 'Desta vez, responderam'." : s.flags.includes("radio-repaired") ? "O resgate chegou ao amanhecer. A equipe encontrou Lia, Noah e os destroços do Ventania, mas nenhuma estação, nenhum gravador e nenhum vestígio do Aurora. A fotografia molhada estava em branco. O rádio, contudo, continuou recebendo uma transmissão às 23h17." : "O sinal não alcançou o continente. Ao amanhecer, Lia e Noah seguiram a trilha de pedras em direção à costa baixa, guiados por uma luz que aparecia e desaparecia entre a névoa. A fotografia molhada estava em branco. O transmissor continuou emitindo três pulsos curtos às 23h17.",
      s.flags.includes("solved-stone-lock") ? "A fechadura da trilha ficou para trás, aberta. No verso dos discos, havia nomes gravados por dentro do metal. O último era o de Noah, seguido por uma data que ainda não chegou." : "A porta da estação foi encontrada fechada. A inscrição sobre a terceira maré havia desaparecido, como se nunca tivesse sido escrita.",
      s.health <= 2 ? "Noah chegou ao fim da travessia exausto, com a febre aumentando e as mãos incapazes de fechar completamente. O cuidado improvisado e as provisões recuperadas foram o que os manteve juntos até o último amanhecer." : "A água medida, os alimentos divididos e os materiais recuperados deram a eles tempo suficiente para atravessar a última maré.",
      "Lia guardou a chave de latão. Noah deixou de dizer que o mar havia levado tudo. Algumas coisas tinham sido deixadas ali de propósito; outras, devolvidas tarde demais. E, em algum lugar além da costa, uma voz começou a contar os nomes de quem ainda não tinha chegado."
    ],
    ending: "A expedição terminou. A história não respondeu a todas as perguntas — algumas respostas ficaram escondidas entre as marés."
  },
};

const narrativeExpansions: Record<string, string[]> = {
  "day1-beach": [
    "Lia tentou reconstruir a sequência do acidente, mas as lembranças vinham em fragmentos: o convés inclinado, o grito de Noah, uma luz branca atrás da chuva. Havia um intervalo inteiro que sua memória não conseguia atravessar. O relógio, parado em 16h42, parecia marcar justamente esse vazio.",
  ],
  "day1-cove": [
    "A nascente não aparecia no mapa de bordo nem em qualquer carta náutica que Noah consultara. Lia encheu os recipientes devagar, observando a água desaparecer sob a pedra. O som continuava mesmo depois que fecharam as tampas, como se a correnteza corresse dentro da própria rocha.",
  ],
  "day1-wreck": [
    "A cada movimento, o casco se inclinava alguns centímetros. Noah conhecia o barco o bastante para saber que não haveria uma segunda entrada segura. Antes de sair, tocou a placa com o polegar e recolheu a mão depressa, como quem reconhece uma lembrança que jurou esquecer.",
  ],
  "day1-night": [
    "A fogueira iluminava apenas um círculo pequeno. Além dele, a mata parecia recuar e avançar com a maré, embora as árvores não se movessem. Lia percebeu que Noah segurava a chave de latão durante o sono; quando tentou tirá-la de sua mão, ele despertou chamando por alguém que não estava ali.",
  ],
  "day2-dawn": [
    "A luz da manhã não dissolveu a sensação de estar sendo observado. Os pássaros cantavam apenas perto da praia; no interior, o silêncio era tão completo que os passos pareciam pertencer a outra pessoa caminhando alguns metros atrás deles. Lia decidiu não comentar o que ouvira durante a madrugada.",
  ],
  "day2-stones": [
    "A madeira da ponte estava úmida, mas não apodrecida. Alguém substituíra recentemente duas tábuas e deixara as ferramentas alinhadas junto ao corrimão. A manutenção era recente demais para uma instalação abandonada e cuidadosa demais para um abrigo improvisado.",
  ],
  "day2-signal": [
    "Noah rebobinou a fita duas vezes. Entre as palavras, havia um segundo som: uma respiração interrompida sempre no mesmo ponto. Lia anotou os horários no verso do mapa, mas percebeu que eles coincidiam com as horas em que o relógio de Noah parecia atrasar.",
  ],
  "day3-storm": [
    "A chuva apagava rastros antes que pudessem examiná-los. Lia prendeu o casaco encontrado ao próprio corpo para não perdê-lo no vento; o tecido estava gelado, mas o bolso interno conservava calor. Havia alguém por perto havia pouco tempo — e essa pessoa sabia exatamente onde eles estariam.",
  ],
  "day3-photo": [
    "Lia comparou a linha do horizonte da fotografia com a praia diante deles. A imagem fora feita de um ponto impossível: uma encosta que não existia no relevo atual. Se a foto fosse recente, a ilha havia mudado; se fosse antiga, alguém havia preparado o encontro muito antes do naufrágio.",
  ],
  "day3-medicine": [
    "O tratamento reduziu a febre, mas não o tremor nas mãos de Noah. Ele finalmente admitiu que já ouvira o nome Aurora antes daquela viagem. Não sabia dizer de onde vinha a lembrança, apenas que sempre a associava a uma promessa feita no escuro e quebrada ao amanhecer.",
  ],
  "day4-station": [
    "A sala conservava marcas de ocupação: uma cadeira afastada da mesa, uma caneca com um círculo recente no pó e um mapa aberto na página das correntes. A estação não parecia guardar apenas registros meteorológicos. Parecia acompanhar as chegadas e escolher quais lembranças cada visitante levaria consigo.",
  ],
  "day5-radio": [
    "O transmissor aquecia sob os dedos de Noah. A voz não vinha de uma frequência distante; surgia limpa demais, sem ruído de mar ou interferência atmosférica. Lia anotou cada palavra enquanto observava o rosto dele. O medo não era de quem ouvira uma desconhecida: era de quem reconhecera alguém.",
  ],
  "day5-lower-room": [
    "As etiquetas não seguiam ordem alfabética nem cronológica. Algumas caixas traziam nomes riscados e reescritos; outras tinham duas datas separadas por décadas. Lia encontrou uma fita sem identificação e a deixou onde estava. Pela primeira vez, teve receio de descobrir uma lembrança que ainda não vivera.",
  ],
  "day6-revelation": [
    "O caderno não descrevia um único naufrágio, mas uma sucessão de decisões parecidas. Em cada registro, alguém ouvira um pedido de ajuda, hesitara e seguira adiante. A ilha guardava os vestígios dessas escolhas como se esperasse que uma delas fosse finalmente interrompida.",
  ],
  "day7-maia": [
    "Maia não pediu desculpas por ter esperado. Disse que, durante anos, ouviu barcos passarem sem responder e aprendeu a reconhecer o som de quem escolhe não voltar. Quando Noah se aproximou, ela não o abraçou. Apenas perguntou se ele ainda se lembrava da primeira chamada.",
  ],
  "day7-rescue": [
    "O sinal de retorno deveria ser motivo de alívio, mas Lia percebeu que a mensagem repetia uma frase que só aparecia nos registros da estação. O continente respondera — ou alguém aprendera a imitar perfeitamente a resposta. Noah manteve a mão no botão de transmissão, sem saber se devia desligar.",
  ],
  "ending": [
    "No último amanhecer, Lia entendeu que sobreviver não significava sair da ilha com todas as respostas. Significava reconhecer a voz do outro lado e decidir não repetir o silêncio. O mar voltou a parecer apenas mar, mas nenhum dos dois conseguiu olhar para o horizonte sem procurar uma luz.",
  ],
};

function loadProgress(): SurvivalBookState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<SurvivalBookState>;
    return { ...initial, ...parsed, resources: { ...initial.resources, ...parsed.resources }, decisions: parsed.decisions ?? {}, flags: parsed.flags ?? [], inventory: parsed.inventory ?? [], puzzleAnswers: parsed.puzzleAnswers ?? {} };
  } catch { return initial; }
}

function applyEffect(state: SurvivalBookState, effect: string): SurvivalBookState {
  const next: SurvivalBookState = { ...state, resources: { ...state.resources }, inventory: [...state.inventory], flags: [...state.flags], decisions: { ...state.decisions } };
  const add = (key: ResourceId, amount: number) => { next.resources[key] = Math.max(0, Math.min(20, next.resources[key] + amount)); };
  if (effect === "cove") { add("water", 2); add("medicine", 1); next.inventory.push("folhas medicinais"); }
  if (effect === "wreck") { add("wood", 2); add("metal", 1); add("cloth", 1); next.inventory.push("placa do Aurora"); }
  if (effect === "watch-noah") { next.trust += 1; next.flags.push("heard-name-at-night"); }
  if (effect === "watch-lia") { next.trust += 1; next.flags.push("found-ash-arrow"); }
  if (effect === "stones") { next.flags.push("stone-trail"); }
  if (effect === "signal") { add("battery", 1); next.inventory.push("gravador da árvore"); }
  if (effect === "photo") { next.inventory.push("fotografia da praia"); next.flags.push("kept-photo"); }
  if (effect === "medicine") { add("medicine", 2); next.health = Math.min(5, next.health + 1); next.flags.push("treated-noah"); }
  if (effect === "repair") { add("battery", 1); add("metal", 1); next.flags.push("radio-repaired"); }
  if (effect === "lower-room") { next.inventory.push("fita de Lia"); next.flags.push("heard-lia-tape"); }
  if (effect === "maia") { next.trust += 2; next.decisions.final = "maia"; }
  if (effect === "rescue") { next.decisions.final = "rescue"; }
  return next;
}

function transitionToNode(state: SurvivalBookState, target: string): SurvivalBookState {
  const next: SurvivalBookState = {
    ...state,
    resources: { ...state.resources },
    inventory: [...state.inventory],
    decisions: { ...state.decisions },
    flags: [...state.flags],
    puzzleAnswers: { ...state.puzzleAnswers },
  };
  const targetDay = scene[target]?.day ?? state.day;
  for (let day = state.day + 1; day <= targetDay; day += 1) {
    if (next.resources.water > 0) next.resources.water -= 1;
    else {
      next.health = Math.max(0, next.health - 1);
      if (!next.flags.includes("water-shortage")) next.flags.push("water-shortage");
    }
    if (day % 2 === 0) {
      if (next.resources.food > 0) next.resources.food -= 1;
      else {
        next.health = Math.max(0, next.health - 1);
        if (!next.flags.includes("food-shortage")) next.flags.push("food-shortage");
      }
    }
  }
  next.node = target;
  next.day = targetDay;
  return next;
}

function choose(state: SurvivalBookState, choice: Choice): SurvivalBookState {
  const next = applyEffect(state, choice.effect);
  next.decisions[choice.decisionKey] = choice.id;
  return transitionToNode(next, choice.next);
}

function completePuzzle(state: SurvivalBookState, puzzleId: string, answer: string, puzzle: Puzzle): SurvivalBookState {
  const next: SurvivalBookState = { ...state, puzzleAnswers: { ...state.puzzleAnswers, [puzzleId]: answer }, flags: [...state.flags], inventory: [...state.inventory], resources: { ...state.resources } };
  if (answer === puzzle.answer) {
    if (!next.flags.includes("solved-" + puzzleId)) next.flags.push("solved-" + puzzleId);
    if (puzzleId === "stone-lock") { next.inventory.push("chave da estação"); next.resources.metal = Math.min(20, next.resources.metal + 1); }
  } else if (puzzleId === "stone-lock" && !next.flags.includes("failed-stone-lock")) {
    next.flags.push("failed-stone-lock");
  }
  return next;
}

function SceneArt({ name }: { name: string }) {
  const palette: Record<string, { sky: string; land: string; accent: string; water: string }> = {
    shore: { sky: "#b8c8ac", land: "#d5b98d", accent: "#426c5a", water: "#357d89" },
    spring: { sky: "#9bbd9d", land: "#66836a", accent: "#d1d5ac", water: "#62b4b8" },
    wreck: { sky: "#6d8b91", land: "#95654d", accent: "#e2bd87", water: "#286b7c" },
    night: { sky: "#203d4b", land: "#324c46", accent: "#efb15e", water: "#264f60" },
    forest: { sky: "#839f7c", land: "#46674f", accent: "#b8c88e", water: "#497f83" },
    storm: { sky: "#344b5b", land: "#604f4b", accent: "#f1c36e", water: "#24596c" },
    shelter: { sky: "#77968a", land: "#426451", accent: "#cf9d62", water: "#3b7780" },
    station: { sky: "#6e8378", land: "#3c5548", accent: "#c08b57", water: "#456a72" },
    radio: { sky: "#28495a", land: "#3d6655", accent: "#e6bf6a", water: "#246173" },
    cave: { sky: "#394b50", land: "#65665b", accent: "#d5b582", water: "#4d8990" },
    archive: { sky: "#544e49", land: "#665b4d", accent: "#d4ad6e", water: "#385e65" },
  };
  const p = palette[name] ?? palette.shore;
  return (
    <svg className="island-story-art" viewBox="0 0 720 250" role="img" aria-label="Ilustração vetorial da cena do capítulo">
      <rect width="720" height="250" fill={p.sky}/>
      <circle cx="590" cy="48" r="27" fill="#f1d58f" opacity=".9"/>
      <path d="M0 154 Q110 128 230 157 T470 151 T720 149 V250 H0Z" fill={p.water}/>
      <path d="M0 190 Q130 166 270 190 T520 190 T720 183 V250 H0Z" fill={p.land}/>
      <path d="M0 212 Q130 199 260 214 T520 211 T720 208 V250 H0Z" fill={p.accent}/>
      {(name === "wreck" || name === "shore") && <g><path d="M330 160 L565 158 L526 195 Q421 212 351 188Z" fill="#855342"/><path d="M419 77 L419 160 L346 151Z" fill="#eee2c8"/><path d="M429 97 L505 152 L429 152Z" fill="#d99055"/><path d="M415 73 L415 166" stroke="#594c43" strokeWidth="7"/></g>}
      {(name === "forest" || name === "spring" || name === "station") && <g fill={p.accent}><circle cx="100" cy="120" r="51"/><circle cx="164" cy="107" r="44"/><circle cx="640" cy="120" r="58"/><path d="M98 144 L98 225 M640 143 L640 220" stroke="#8b6649" strokeWidth="13"/></g>}
      {(name === "night" || name === "storm" || name === "cave" || name === "archive") && <g><path d="M210 194 L360 69 L510 194Z" fill={p.accent}/><path d="M255 191 L360 102 L464 191Z" fill="#e6d5b3"/><path d="M360 69 L360 198" stroke="#755842" strokeWidth="10"/><path d="M0 56 Q170 25 320 56 T720 47" stroke="#eee1bd" strokeWidth="3" fill="none" opacity=".45"/></g>}
      {(name === "radio" || name === "station") && <g><rect x="318" y="126" width="96" height="75" rx="10" fill="#bf874d" stroke="#644d3f" strokeWidth="6"/><rect x="333" y="141" width="65" height="28" rx="4" fill="#31535d"/><path d="M366 126 L366 74 M366 82 Q322 31 284 62 M366 82 Q408 31 448 62" stroke="#f2d185" strokeWidth="5" fill="none" strokeLinecap="round"/></g>}
      {name === "shelter" && <g><path d="M245 195 L360 75 L475 195Z" fill="#c78d4f"/><path d="M281 191 L360 111 L441 191Z" fill="#e6cda1"/><path d="M360 75 L360 199" stroke="#73553c" strokeWidth="9"/></g>}
    </svg>
  );
}

function ArtifactReader({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  return (
    <div className="island-artifact-backdrop" role="presentation" onClick={onClose}>
      <article className="island-artifact-sheet" role="dialog" aria-modal="true" aria-label={artifact.label} onClick={event => event.stopPropagation()}>
        <button type="button" className="island-artifact-close" onClick={onClose} aria-label="Fechar material"><X/></button>
        <span className="island-artifact-type"><FileText/> {artifact.type}</span>
        <h2>{artifact.label}</h2>
        {artifact.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <div className="island-artifact-footnote">ILHA DO ÚLTIMO SINAL · ARQUIVO DA EXPEDIÇÃO</div>
      </article>
    </div>
  );
}


function SurvivalJournalModal({
  node, puzzleAnswer, onArtifact, onChoice, onPuzzle, onClose,
}: {
  node: StoryNode;
  puzzleAnswer?: string;
  onArtifact: (artifact: Artifact) => void;
  onChoice: (choice: Choice) => void;
  onPuzzle: (answer: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="island-journal-backdrop" role="presentation" onClick={onClose}>
      <article className="island-journal-sheet" role="dialog" aria-modal="true" aria-labelledby="island-journal-title" onClick={event => event.stopPropagation()}>
        <header className="island-journal-modal-header">
          <div><span>ILHA DO ÚLTIMO SINAL · DIA {node.day}</span><h2 id="island-journal-title">Caderno de bordo</h2><p>Objetos recuperados, decisões e desafios desta passagem</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar caderno"><X/></button>
        </header>
        {node.artifacts?.length ? (
          <section className="island-journal-section">
            <div className="island-journal-section-title"><FileText/><span>OBJETOS E REGISTROS</span><small>{node.artifacts.length} encontrados</small></div>
            <div className="island-journal-object-list">{node.artifacts.map(item => (
              <button type="button" key={item.id} onClick={() => onArtifact(item)}>
                <span className="island-journal-object-icon"><FileText/></span>
                <span><strong>{item.label}</strong><small>{item.type} · {item.teaser}</small></span>
                <ArrowRight/>
              </button>
            ))}</div>
          </section>
        ) : null}
        {node.puzzle ? (
          <section className="island-journal-section">
            <div className="island-journal-section-title"><Sparkles/><span>DESAFIO DENTRO DA HISTÓRIA</span><small>Opcional</small></div>
            <div className="island-journal-challenge">
              <h3>{node.puzzle.title}</h3><p>{node.puzzle.prompt}</p>
              <div className="island-journal-puzzle-options">{node.puzzle.options.map(option => (
                <button type="button" key={option.id} disabled={Boolean(puzzleAnswer)} className={puzzleAnswer === option.id ? (option.id === node.puzzle?.answer ? "is-correct" : "is-selected") : ""} onClick={() => onPuzzle(option.id)}>
                  <strong>{option.label}</strong><small>{option.detail}</small>{puzzleAnswer === option.id && <Check/>}
                </button>
              ))}</div>
              {puzzleAnswer && <p className="island-journal-result">{puzzleAnswer === node.puzzle.answer ? node.puzzle.success : node.puzzle.failure}</p>}
            </div>
          </section>
        ) : null}
        {node.choices?.length ? (
          <section className="island-journal-section">
            <div className="island-journal-section-title"><Compass/><span>DECISÃO DESTA CENA</span><small>Escolham um caminho</small></div>
            <p className="island-journal-decision-intro">As duas rotas continuam a história de maneiras diferentes. Leiam o que cada uma oferece e o que vocês podem deixar para trás.</p>
            <div className="island-journal-decision-list">{node.choices.map(choice => (
              <button type="button" key={choice.id} onClick={() => onChoice(choice)}>
                <span className="island-journal-decision-label">{choice.label}</span>
                <span className="island-journal-decision-detail">{choice.detail}</span>
                <span className="island-journal-consequence"><strong>O que pode mudar</strong>{choice.consequence}</span>
                <span className="island-journal-decision-cta">Seguir este caminho <ArrowRight/></span>
              </button>
            ))}</div>
          </section>
        ) : null}
        <footer className="island-journal-modal-footer">AS DECISÕES FICAM REGISTRADAS NA MEMÓRIA DA EXPEDIÇÃO</footer>
      </article>
    </div>
  );
}

export function IslandSurvivalStory({ solo = false }: { solo?: boolean }) {
  const [storedGame, setGame, sync] = useGameState<SurvivalBookState>(loadProgress, { onlineInitial: initial });
  const game: SurvivalBookState = storedGame?.node && storedGame.resources && Array.isArray(storedGame.inventory)
    ? {
        ...initial,
        ...storedGame,
        resources: { ...initial.resources, ...storedGame.resources },
        decisions: storedGame.decisions ?? {},
        flags: storedGame.flags ?? [],
        inventory: storedGame.inventory ?? [],
        puzzleAnswers: storedGame.puzzleAnswers ?? {},
      }
    : initial;
  const [openedArtifact, setOpenedArtifact] = useState<Artifact | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const current = scene[game.node] ?? scene["day1-beach"];
  const body = useMemo(() => [...current.body(game), ...(narrativeExpansions[current.id] ?? [])], [current, game]);
  const availableResources = resources.filter(item => game.resources[item.id] > 0);
  const puzzleAnswer = current.puzzle ? game.puzzleAnswers[current.puzzle.id] : undefined;

  useEffect(() => {
    if (sync.online && (!storedGame?.node || !storedGame.resources || !Array.isArray(storedGame.inventory))) {
      setGame(initial);
      return;
    }
    if (!sync.online) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, setGame, storedGame, sync.online]);

  function takeChoice(choice: Choice) {
    const next = choose(game, choice);
    setGame(next);
    setJournalOpen(false);
  }

  function answerPuzzle(answer: string) {
    if (!current.puzzle) return;
    setGame(completePuzzle(game, current.puzzle.id, answer, current.puzzle));
  }

  function turnPage() {
    if (current.ending) {
      setGame({ ...game, finished: true, ending: current.ending });
      return;
    }
    if (current.next) {
      setGame(transitionToNode(game, current.next));
    }
  }

  function restart() {
    if (!sync.online) localStorage.removeItem(STORAGE_KEY);
    setGame(initial);
    setOpenedArtifact(null);
    setJournalOpen(false);
  }

  return (
    <section className="island-storybook-game">
      <header className="island-storybook-header">
        <div className="island-storybook-brand"><BookOpen/><span>ILHA DO ÚLTIMO SINAL</span></div>
        <span className="island-storybook-mode">{solo ? "LEITURA INDIVIDUAL" : "HISTÓRIA COMPARTILHADA"}</span>
      </header>
      {!game.finished ? (
        <div className="island-storybook-page">
          <div className="island-storybook-art-wrap"><SceneArt name={current.scene}/></div>
          <div className="island-storybook-reading">
            <div className="island-storybook-mobile-inventory" aria-label="Recursos restantes">
              {resources.map(item => <span key={item.id} title={item.label}><item.Icon/><b>{game.resources[item.id]}</b></span>)}
            </div>
            <div className="island-storybook-page-meta"><span>{current.chapter}</span><strong>DIA {current.day} · PÁGINA {Object.keys(game.decisions).length + Object.keys(game.puzzleAnswers).length + 1} / 7</strong></div>
            <h1>{current.title}</h1>
            <div className="island-storybook-prose">{body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>

            {(current.artifacts?.length || current.choices?.length || current.puzzle) ? (
              <button type="button" className="island-storybook-journal-trigger" onClick={() => setJournalOpen(true)}>
                <BookOpen/><span>Abrir caderno de bordo</span>
                <small>{(current.artifacts?.length ?? 0) + (current.choices?.length ?? 0) + (current.puzzle ? 1 : 0)} itens nesta cena</small>
                <ArrowRight/>
              </button>
            ) : null}
            {!current.choices && (
              <footer className="island-storybook-footer">
                <span>{current.next ? "A próxima página continua a expedição" : "Fim do capítulo"}</span>
                <button type="button" onClick={turnPage}>{current.ending ? "Ler o epílogo" : "Virar a página"} <ArrowRight/></button>
              </footer>
            )}
          </div>
          <aside className="island-storybook-side">
            <div className="island-storybook-day"><span>DIA</span><strong>{current.day}</strong><small>de 7</small></div>
            <div className="island-storybook-inventory"><span>O QUE SOBROU</span>{availableResources.slice(0,5).map(item => <div key={item.id}><item.Icon/><span>{item.label}</span><b>{game.resources[item.id]}</b></div>)}</div>
            <div className="island-storybook-keepsakes"><span>OBJETOS GUARDADOS</span>{game.inventory.slice(-4).map(item => <small key={item}>{item}</small>)}</div>
            <div className="island-storybook-health"><HeartPulse/><span>Condição de Noah</span><b>{game.health}/5</b></div>
          </aside>
        </div>
      ) : (
        <div className="island-storybook-ending">
          <SceneArt name="night"/>
          <span>EPÍLOGO · DIA 7</span><h1>O mar ainda guarda nomes</h1>
          <p>{game.ending}</p><p>Vocês chegaram ao fim desta travessia. As escolhas feitas, os objetos recolhidos e os caminhos recusados continuam registrados na memória da expedição.</p>
          <button type="button" onClick={restart}>Recomeçar a história <ArrowRight/></button>
        </div>
      )}
      {journalOpen && <SurvivalJournalModal
        node={current}
        puzzleAnswer={puzzleAnswer}
        onArtifact={item => { setJournalOpen(false); setOpenedArtifact(item); }}
        onChoice={takeChoice}
        onPuzzle={answerPuzzle}
        onClose={() => setJournalOpen(false)}
      />}
      {openedArtifact && <ArtifactReader artifact={openedArtifact} onClose={() => setOpenedArtifact(null)}/>}
    </section>
  );
}
