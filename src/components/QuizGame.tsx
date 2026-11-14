import { useEffect, useState } from "react";
import { Brain, Clock3, RotateCcw, Trophy } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";

type QuizQuestion={id:string;category:string;question:string;options:[string,string,string,string];answer:number;explanation:string};
export const questionBank:QuizQuestion[]=[
{id:"solar",category:"Ciência",question:"Qual planeta tem o dia mais longo em relação ao seu próprio ano?",options:["Mercúrio","Vênus","Marte","Netuno"],answer:1,explanation:"Vênus leva cerca de 243 dias terrestres para completar uma rotação, mas cerca de 225 dias para orbitar o Sol."},
{id:"oceano",category:"Natureza",question:"Qual é o maior oceano da Terra?",options:["Atlântico","Índico","Pacífico","Ártico"],answer:2,explanation:"O Oceano Pacífico ocupa aproximadamente um terço da superfície do planeta."},
{id:"brasil",category:"Geografia",question:"Qual estado brasileiro tem a maior extensão territorial?",options:["Pará","Amazonas","Mato Grosso","Minas Gerais"],answer:1,explanation:"O Amazonas é o maior estado brasileiro em área territorial."},
{id:"livro",category:"Cultura",question:"Quem escreveu 'Dom Casmurro'?",options:["José de Alencar","Machado de Assis","Lima Barreto","Eça de Queirós"],answer:1,explanation:"Machado de Assis publicou Dom Casmurro em 1899."},
{id:"elemento",category:"Ciência",question:"Qual é o símbolo químico do ferro?",options:["Fe","F","Ir","Fr"],answer:0,explanation:"Fe vem do latim ferrum."},
{id:"rio",category:"Geografia",question:"Qual destes rios atravessa a cidade de Manaus?",options:["São Francisco","Paraná","Negro","Tietê"],answer:2,explanation:"O Rio Negro encontra o Solimões perto de Manaus, formando o encontro das águas."},
{id:"animal",category:"Natureza",question:"Qual mamífero é capaz de voo ativo?",options:["Esquilo-voador","Morcego","Lêmure","Morcego-do-mar"],answer:1,explanation:"Morcegos são os únicos mamíferos com voo ativo sustentado."},
{id:"pintura",category:"Cultura",question:"Quem pintou a obra 'Noite Estrelada'?",options:["Claude Monet","Vincent van Gogh","Salvador Dalí","Paul Cézanne"],answer:1,explanation:"Van Gogh pintou a obra em 1889, durante sua estadia em Saint-Rémy."},
{id:"matematica",category:"Ciência",question:"Quanto é a soma dos ângulos internos de um triângulo plano?",options:["90°","180°","270°","360°"],answer:1,explanation:"Em geometria euclidiana, os três ângulos internos somam 180 graus."},
{id:"continente",category:"Geografia",question:"Qual é o menor continente em área?",options:["Europa","Antártida","Oceania","América do Sul"],answer:2,explanation:"A Oceania é o menor continente em área, dependendo da convenção geográfica usada."},
{id:"abelha",category:"Natureza",question:"Qual é o principal papel das abelhas na reprodução de muitas plantas?",options:["Dispersar sementes","Polinizar flores","Produzir oxigênio","Controlar a chuva"],answer:1,explanation:"Ao visitar flores, as abelhas transportam pólen e contribuem para a polinização."},
{id:"cinema",category:"Cultura",question:"Em qual país nasceu o cinema dos irmãos Lumière?",options:["Itália","Estados Unidos","França","Alemanha"],answer:2,explanation:"Auguste e Louis Lumière eram franceses e fizeram suas primeiras exibições públicas em Paris."},
{id:"luz",category:"Ciência",question:"Qual destas cores tem o maior comprimento de onda na luz visível?",options:["Violeta","Azul","Verde","Vermelho"],answer:3,explanation:"A luz vermelha tem comprimento de onda maior do que a violeta na faixa visível."},
{id:"capital",category:"Geografia",question:"Qual é a capital da Nova Zelândia?",options:["Auckland","Wellington","Christchurch","Hamilton"],answer:1,explanation:"Wellington é a capital da Nova Zelândia desde 1865."},
{id:"polvo",category:"Natureza",question:"Quantos corações tem um polvo?",options:["Um","Dois","Três","Quatro"],answer:2,explanation:"Dois corações bombeiam sangue para as brânquias e um para o restante do corpo."},
{id:"musica",category:"Cultura",question:"Qual família de instrumentos inclui o violino?",options:["Metais","Madeiras","Cordas","Percussão"],answer:2,explanation:"O violino pertence à família das cordas friccionadas."},
{id:"atomo",category:"Ciência",question:"Qual partícula possui carga elétrica negativa?",options:["Próton","Nêutron","Elétron","Fóton"],answer:2,explanation:"O elétron tem carga negativa; o próton é positivo e o nêutron não possui carga elétrica."},
{id:"meridiano",category:"Geografia",question:"Qual linha divide a Terra em hemisférios Norte e Sul?",options:["Trópico de Câncer","Linha do Equador","Meridiano de Greenwich","Círculo Polar Ártico"],answer:1,explanation:"A Linha do Equador está a 0° de latitude."},
{id:"flamingo",category:"Natureza",question:"A cor rosada dos flamingos está relacionada principalmente a quê?",options:["Reflexo da água","Pigmentos da alimentação","Temperatura do corpo","Idade da ave"],answer:1,explanation:"Carotenoides presentes em algas e pequenos crustáceos contribuem para a coloração."},
{id:"teatro",category:"Cultura",question:"Qual dramaturgo escreveu 'Romeu e Julieta'?",options:["Molière","William Shakespeare","Sófocles","Henrik Ibsen"],answer:1,explanation:"Romeu e Julieta é uma tragédia de William Shakespeare."},
{id:"corrente",category:"Ciência",question:"Qual unidade mede a intensidade da corrente elétrica no Sistema Internacional?",options:["Volt","Ampere","Ohm","Watt"],answer:1,explanation:"O ampere (A) é a unidade básica de intensidade da corrente elétrica."},
{id:"mitocondria",category:"Ciência",question:"Qual estrutura celular é conhecida por participar intensamente da produção de ATP?",options:["Ribossomo","Mitocôndria","Lisossomo","Complexo de Golgi"],answer:1,explanation:"A mitocôndria realiza etapas da respiração celular que produzem grande parte do ATP usado pela célula."},
{id:"mercurio",category:"Ciência",question:"Qual destes elementos é líquido em condições ambientes comuns?",options:["Alumínio","Mercúrio","Cobre","Enxofre"],answer:1,explanation:"O mercúrio é um metal que permanece líquido em temperatura ambiente."},
{id:"ebulicao",category:"Ciência",question:"Ao nível do mar, a água pura entra em ebulição aproximadamente a…",options:["0 °C","50 °C","100 °C","150 °C"],answer:2,explanation:"A pressão atmosférica padrão, a água pura ferve por volta de 100 °C."},
{id:"atmosfera",category:"Ciência",question:"Qual gás representa a maior parte da atmosfera terrestre seca?",options:["Oxigênio","Nitrogênio","Dióxido de carbono","Argônio"],answer:1,explanation:"O nitrogênio corresponde a cerca de 78% da atmosfera terrestre seca."},
{id:"oxigenio",category:"Ciência",question:"Qual é o número atômico do oxigênio?",options:["6","7","8","16"],answer:2,explanation:"O número atômico indica a quantidade de prótons; o oxigênio possui oito."},
{id:"luz-vacuo",category:"Ciência",question:"Em qual ambiente a luz se propaga mais rapidamente?",options:["Água","Vidro","Ar","Vácuo"],answer:3,explanation:"No vácuo, a luz atinge sua velocidade máxima, aproximadamente 300 mil quilômetros por segundo."},
{id:"lente",category:"Ciência",question:"Qual formato de lente é convergente quando está no ar?",options:["Côncava","Convexa","Plana paralela","Cilíndrica opaca"],answer:1,explanation:"Uma lente convexa, mais espessa no centro, converge raios paralelos próximos ao eixo."},
{id:"hemacias",category:"Ciência",question:"Qual componente do sangue transporta a maior parte do oxigênio pelo corpo?",options:["Plaquetas","Hemácias","Plasma","Leucócitos"],answer:1,explanation:"A hemoglobina presente nas hemácias liga-se ao oxigênio e permite seu transporte."},
{id:"pele",category:"Ciência",question:"Qual é o maior órgão do corpo humano em área?",options:["Fígado","Pulmão","Pele","Intestino delgado"],answer:2,explanation:"A pele reveste toda a superfície externa do corpo e é seu maior órgão."},
{id:"ph-neutro",category:"Ciência",question:"Em água pura a 25 °C, qual valor de pH é considerado neutro?",options:["0","5","7","14"],answer:2,explanation:"A 25 °C, a água pura apresenta pH igual a 7, condição de neutralidade."},
{id:"forca",category:"Ciência",question:"Qual unidade do Sistema Internacional é usada para medir força?",options:["Joule","Newton","Pascal","Watt"],answer:1,explanation:"A força é medida em newtons (N), nome dado em homenagem a Isaac Newton."},
{id:"som-vacuo",category:"Ciência",question:"Por que o som não se propaga no vácuo?",options:["Porque precisa de um meio material","Porque não possui frequência","Porque só existe à noite","Porque é sempre absorvido pela luz"],answer:0,explanation:"O som é uma onda mecânica e precisa de partículas de um meio para transmitir vibrações."},
{id:"isotopos",category:"Ciência",question:"Dois isótopos do mesmo elemento químico têm…",options:["O mesmo número de prótons e diferentes nêutrons","Diferentes prótons e os mesmos elétrons sempre","O mesmo número de massa obrigatoriamente","Diferentes números atômicos"],answer:0,explanation:"Isótopos pertencem ao mesmo elemento porque têm o mesmo número de prótons, mas diferem na quantidade de nêutrons."},
{id:"energia-solar",category:"Ciência",question:"Qual dispositivo converte diretamente a luz do Sol em energia elétrica?",options:["Turbina hidráulica","Painel fotovoltaico","Motor a combustão","Caldeira a vapor"],answer:1,explanation:"Células fotovoltaicas transformam energia luminosa em energia elétrica pelo efeito fotovoltaico."},
{id:"girafa",category:"Natureza",question:"Quantas vértebras cervicais normalmente possui uma girafa?",options:["Cinco","Sete","Nove","Doze"],answer:1,explanation:"Como a maioria dos mamíferos, a girafa normalmente possui sete vértebras cervicais, embora sejam muito alongadas."},
{id:"panda",category:"Natureza",question:"Qual alimento compõe a maior parte da dieta do panda-gigante?",options:["Peixes","Bambu","Insetos","Frutas cítricas"],answer:1,explanation:"Apesar de pertencer à ordem dos carnívoros, o panda-gigante se alimenta principalmente de bambu."},
{id:"insetos",category:"Natureza",question:"Quantas pernas tem um inseto adulto típico?",options:["Quatro","Seis","Oito","Dez"],answer:1,explanation:"Os insetos são artrópodes com três pares de pernas, totalizando seis."},
{id:"coral",category:"Natureza",question:"Os corais construtores de recifes são classificados como…",options:["Plantas marinhas","Animais cnidários","Rochas vivas","Algas terrestres"],answer:1,explanation:"Os corais são animais do grupo dos cnidários e vivem associados a algas microscópicas em muitas espécies."},
{id:"baleia",category:"Natureza",question:"Como as baleias respiram?",options:["Por brânquias","Pela pele","Por pulmões e pelo espiráculo","Por nadadeiras modificadas"],answer:2,explanation:"Baleias são mamíferos: respiram ar atmosférico por pulmões e usam o espiráculo na superfície."},
{id:"borboleta",category:"Natureza",question:"Qual sequência descreve a metamorfose completa de uma borboleta?",options:["Ovo, larva, pupa e adulto","Ovo, ninfa e adulto","Larva, ovo e adulto","Pupa, ninfa e adulto"],answer:0,explanation:"Borboletas passam pelas fases de ovo, lagarta (larva), crisálida (pupa) e adulto."},
{id:"guepardo",category:"Natureza",question:"Qual animal é conhecido como o mais veloz em terra em curtas corridas?",options:["Leão","Guepardo","Lobo-cinzento","Antílope-sable"],answer:1,explanation:"O guepardo é especializado em arrancadas muito rápidas e é considerado o animal terrestre mais veloz."},
{id:"azul",category:"Natureza",question:"Qual é o maior animal conhecido que vive atualmente?",options:["Tubarão-baleia","Elefante-africano","Baleia-azul","Lula-gigante"],answer:2,explanation:"A baleia-azul é o maior animal conhecido, podendo ultrapassar 30 metros de comprimento."},
{id:"koala",category:"Natureza",question:"Qual alimento é mais associado à dieta dos coalas?",options:["Folhas de eucalipto","Brotos de bambu","Frutos de palmeira","Algas marinhas"],answer:0,explanation:"Os coalas alimentam-se principalmente de folhas de determinadas espécies de eucalipto."},
{id:"anfibio",category:"Natureza",question:"Qual característica é típica dos anfíbios?",options:["Penas impermeáveis","Pele permeável e ciclo de vida frequentemente ligado à água","Escamas secas e pelos","Respiração exclusiva por brânquias na fase adulta"],answer:1,explanation:"Muitos anfíbios têm pele permeável e passam por fases aquáticas e terrestres durante o desenvolvimento."},
{id:"mangue",category:"Natureza",question:"Em qual ambiente costeiro os manguezais se desenvolvem?",options:["Em áreas de transição entre rios e mar","Em desertos de altitude","Em geleiras continentais","Em campos alpinos"],answer:0,explanation:"Manguezais ocupam zonas costeiras sujeitas à influência das marés e à mistura de água doce e salgada."},
{id:"salmao",category:"Natureza",question:"O que muitas espécies de salmão fazem para se reproduzir?",options:["Voam para o interior das florestas","Migram rio acima até áreas de desova","Enterram ovos em desertos","Constroem ninhos em árvores"],answer:1,explanation:"Muitos salmões migram do mar para rios de água doce para se reproduzir; a rota varia conforme a espécie."},
{id:"coniferas",category:"Natureza",question:"Qual estrutura é característica de muitas coníferas?",options:["Flores grandes e frutos carnosos","Estróbilos ou cones","Raízes aéreas obrigatórias","Folhas em forma de pétala"],answer:1,explanation:"Coníferas como pinheiros produzem estruturas reprodutivas chamadas cones ou estróbilos."},
{id:"cacto",category:"Natureza",question:"Em muitos cactos, qual parte armazena água?",options:["As flores","O caule","As espinhas","A semente"],answer:1,explanation:"O caule suculento de muitos cactos armazena água e realiza fotossíntese."},
{id:"polinizacao",category:"Natureza",question:"Qual processo permite que o pólen chegue à parte reprodutiva feminina de uma flor?",options:["Polinização","Germinação","Respiração","Fermentação"],answer:0,explanation:"A polinização é a transferência de pólen para a região receptora da flor, permitindo a fecundação em plantas com flores."},
{id:"canberra",category:"Geografia",question:"Qual é a capital da Austrália?",options:["Sydney","Melbourne","Canberra","Perth"],answer:2,explanation:"Canberra é a capital federal da Austrália; Sydney e Melbourne são cidades maiores e mais conhecidas."},
{id:"egito",category:"Geografia",question:"Qual rio é historicamente fundamental para o Egito?",options:["Danúbio","Nilo","Reno","Ganges"],answer:1,explanation:"O rio Nilo atravessa o Egito e sua planície aluvial sustentou antigas comunidades agrícolas."},
{id:"andes",category:"Geografia",question:"Em qual continente está localizada a Cordilheira dos Andes?",options:["África","Europa","América do Sul","Ásia"],answer:2,explanation:"Os Andes percorrem a borda ocidental da América do Sul."},
{id:"canada",category:"Geografia",question:"Qual é a capital do Canadá?",options:["Toronto","Vancouver","Ottawa","Montreal"],answer:2,explanation:"Ottawa, na província de Ontário, é a capital federal canadense."},
{id:"japao",category:"Geografia",question:"O Japão é geograficamente classificado como…",options:["Um arquipélago no leste da Ásia","Uma península no Mediterrâneo","Um país sem litoral na Europa","Uma ilha no oceano Atlântico"],answer:0,explanation:"O Japão é um arquipélago formado por milhares de ilhas no leste da Ásia."},
{id:"nilo-delta",category:"Geografia",question:"Em qual mar o rio Nilo deságua?",options:["Mar Negro","Mar Mediterrâneo","Mar Vermelho","Mar Cáspio"],answer:1,explanation:"O Nilo forma um grande delta ao desaguar no mar Mediterrâneo, no norte do Egito."},
{id:"vaticano",category:"Geografia",question:"Qual país é geralmente reconhecido como o menor do mundo em área territorial?",options:["Mônaco","San Marino","Cidade do Vaticano","Liechtenstein"],answer:2,explanation:"A Cidade do Vaticano é um Estado soberano independente com área inferior à de qualquer outro país."},
{id:"noruega",category:"Geografia",question:"Qual cidade é a capital da Noruega?",options:["Estocolmo","Oslo","Copenhague","Helsinque"],answer:1,explanation:"Oslo é a capital e a maior cidade da Noruega."},
{id:"islandia",category:"Geografia",question:"Qual é a capital da Islândia?",options:["Reykjavík","Oslo","Tórshavn","Nuuk"],answer:0,explanation:"Reykjavík é a capital da Islândia e sua principal área urbana."},
{id:"baikal",category:"Geografia",question:"Qual lago é conhecido como o mais profundo do mundo?",options:["Vitória","Baikal","Titicaca","Superior"],answer:1,explanation:"O lago Baikal, na Sibéria, é o lago mais profundo conhecido e contém grande volume de água doce."},
{id:"mediterraneo",category:"Geografia",question:"O mar Mediterrâneo está situado entre quais grandes regiões?",options:["Europa, África e Ásia","América do Norte e América do Sul","Ásia e Oceania","África e Antártida"],answer:0,explanation:"O Mediterrâneo separa o sul da Europa do norte da África e se conecta ao oeste da Ásia."},
{id:"uruguai",category:"Geografia",question:"Qual é a capital do Uruguai?",options:["Assunção","Montevidéu","Santiago","La Paz"],answer:1,explanation:"Montevidéu é a capital e principal cidade do Uruguai."},
{id:"madagascar",category:"Geografia",question:"Em qual oceano fica a ilha de Madagascar?",options:["Atlântico","Pacífico","Índico","Ártico"],answer:2,explanation:"Madagascar fica no oceano Índico, a leste da costa da África."},
{id:"finlandia",category:"Geografia",question:"Qual é a capital da Finlândia?",options:["Tallinn","Helsinque","Riga","Vilnius"],answer:1,explanation:"Helsinque é a capital da Finlândia, situada no golfo da Finlândia."},
{id:"everest",category:"Geografia",question:"O monte Everest faz parte de qual cadeia de montanhas?",options:["Andes","Alpes","Himalaia","Montanhas Rochosas"],answer:2,explanation:"O Everest está no Himalaia, na fronteira entre Nepal e China."},
{id:"portugal",category:"Geografia",question:"Portugal está localizado em qual península europeia?",options:["Península Balcânica","Península Ibérica","Península Itálica","Península Escandinava"],answer:1,explanation:"Portugal ocupa a parte ocidental da Península Ibérica, ao lado da Espanha."},
{id:"guimaraes",category:"Cultura",question:"Quem escreveu o romance brasileiro 'Grande Sertão: Veredas'?",options:["Graciliano Ramos","João Guimarães Rosa","Jorge Amado","José Lins do Rego"],answer:1,explanation:"João Guimarães Rosa publicou Grande Sertão: Veredas em 1956."},
{id:"david",category:"Cultura",question:"Quem esculpiu a famosa estátua 'Davi' exposta em Florença?",options:["Donatello","Michelangelo","Bernini","Auguste Rodin"],answer:1,explanation:"Michelangelo esculpiu seu Davi entre 1501 e 1504, no Renascimento italiano."},
{id:"guernica",category:"Cultura",question:"Qual artista espanhol pintou o quadro 'Guernica'?",options:["Salvador Dalí","Joan Miró","Pablo Picasso","Francisco Goya"],answer:2,explanation:"Pablo Picasso pintou Guernica em 1937, em resposta ao bombardeio da cidade basca."},
{id:"odisseia",category:"Cultura",question:"A autoria tradicional da epopeia grega 'Odisseia' é atribuída a…",options:["Sófocles","Homero","Virgílio","Platão"],answer:1,explanation:"A tradição grega atribui a Odisseia e a Ilíada ao poeta Homero."},
{id:"cortico",category:"Cultura",question:"Quem escreveu o romance naturalista brasileiro 'O Cortiço'?",options:["Aluísio Azevedo","Machado de Assis","Raul Pompeia","José de Alencar"],answer:0,explanation:"Aluísio Azevedo publicou O Cortiço em 1890, obra importante do Naturalismo brasileiro."},
{id:"abaporu",category:"Cultura",question:"Qual artista brasileira pintou 'Abaporu'?",options:["Anita Malfatti","Tarsila do Amaral","Djanira","Lygia Clark"],answer:1,explanation:"Tarsila do Amaral pintou Abaporu em 1928, obra associada ao movimento antropofágico."},
{id:"guitarra",category:"Cultura",question:"Qual compositor criou a música de balé 'O Lago dos Cisnes'?",options:["Claude Debussy","Piotr Ilitch Tchaikovsky","Frédéric Chopin","Edvard Grieg"],answer:1,explanation:"Tchaikovsky compôs a música de O Lago dos Cisnes, estreado em 1877."},
{id:"vermeer",category:"Cultura",question:"Quem pintou a obra conhecida como 'Moça com Brinco de Pérola'?",options:["Rembrandt","Johannes Vermeer","Peter Paul Rubens","Diego Velázquez"],answer:1,explanation:"A pintura é atribuída ao artista holandês Johannes Vermeer, do século XVII."},
{id:"principe",category:"Cultura",question:"Quem escreveu 'O Pequeno Príncipe'?",options:["Jules Verne","Antoine de Saint-Exupéry","Victor Hugo","Albert Camus"],answer:1,explanation:"O escritor e aviador francês Antoine de Saint-Exupéry publicou O Pequeno Príncipe em 1943."},
{id:"camoes",category:"Cultura",question:"Quem é o autor da epopeia portuguesa 'Os Lusíadas'?",options:["Fernando Pessoa","Luís de Camões","Eça de Queirós","Gil Vicente"],answer:1,explanation:"Luís de Camões publicou Os Lusíadas em 1572."},
{id:"semana22",category:"Cultura",question:"Em que ano ocorreu a Semana de Arte Moderna no Teatro Municipal de São Paulo?",options:["1889","1922","1930","1945"],answer:1,explanation:"A Semana de Arte Moderna ocorreu em fevereiro de 1922 e marcou o Modernismo brasileiro."},
{id:"mozart",category:"Cultura",question:"Qual compositor austríaco criou a ópera 'A Flauta Mágica'?",options:["Joseph Haydn","Wolfgang Amadeus Mozart","Franz Schubert","Gustav Mahler"],answer:1,explanation:"Mozart compôs A Flauta Mágica, estreada em Viena em 1791."},
{id:"beethoven",category:"Cultura",question:"Quem compôs a Nona Sinfonia, que inclui a 'Ode à Alegria'?",options:["Johannes Brahms","Ludwig van Beethoven","Richard Wagner","Antonio Vivaldi"],answer:1,explanation:"A Nona Sinfonia é uma das obras mais conhecidas de Ludwig van Beethoven e foi estreada em 1824."},
{id:"monet",category:"Cultura",question:"Qual pintor está associado à obra 'Impressão, nascer do sol'?",options:["Édouard Manet","Claude Monet","Paul Gauguin","Henri Matisse"],answer:1,explanation:"A pintura de Claude Monet deu nome ao Impressionismo, movimento artístico do século XIX."},
];

const categories=["Todas","Ciência","Natureza","Geografia","Cultura"];
function shuffle<T>(values:T[]){const items=values.slice();for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
type QuizShared={category:string;round:QuizQuestion[];index:number;player:0|1;scores:[number,number];phase:"setup"|"question"|"result"|"finished";selected:number|null;timedOut:boolean;opponentCorrect:boolean;usedIds:string[]};
export function QuizGame({ solo = false }: { solo?: boolean }){
  const [quiz,setQuiz,sync]=useGameState<QuizShared>(()=>({category:"Todas",round:[],index:0,player:0,scores:[0,0],phase:"setup",selected:null,timedOut:false,opponentCorrect:false,usedIds:[]}),{
    turnSeat:(q)=>q.player,
    outcome:(q)=>q.phase!=="finished"?null:q.scores[0]===q.scores[1]?{kind:"draw"}:{kind:"win",winnerSeat:q.scores[0]>q.scores[1]?0:1},
  });
  const {category,round,index,player,scores,phase,selected,timedOut,opponentCorrect}=quiz;
  const [timeLeft,setTimeLeft]=useState(20);
  const question=round[index];
  const correct=selected===question?.answer;
  const answeredCount=index+(phase==="result"?1:0);
  const leader=scores[0]===scores[1]?"Empate":scores[0]>scores[1]?(solo?"Você":"Pessoa 1"):(solo?"Morados":"Pessoa 2");
  const setCategory=(value:string)=>setQuiz({...quiz,category:value});

  useEffect(()=>{setTimeLeft(20);},[index,phase]);
  useEffect(()=>{
    if(phase!=="question"||timeLeft<=0)return;
    const timer=window.setInterval(()=>setTimeLeft(value=>Math.max(0,value-1)),1000);
    return ()=>window.clearInterval(timer);
  },[phase,timeLeft]);

  useEffect(()=>{
    // No modo online, só quem está respondendo registra o tempo esgotado.
    if(phase==="question"&&timeLeft===0&&sync.canAct&&(!sync.online||sync.mySeat===player)){
      setQuiz(q=>{
        const botCorrect = solo && Math.floor(Math.random()*4) === (q.round[q.index]?.answer ?? -1);
        const scores = [...q.scores] as [number,number];
        if (botCorrect) scores[1] += 1;
        return {...q,scores,opponentCorrect:botCorrect,timedOut:true,selected:null,phase:"result"};
      });
    }
  },[phase,timeLeft,sync.canAct,sync.online,sync.mySeat,player,setQuiz]);

  function start(){
    const pool=category==="Todas"?questionBank:questionBank.filter(q=>q.category===category);
    const usedIds=quiz.usedIds??[];
    const fresh=pool.filter(question=>!usedIds.includes(question.id));
    const recentRoundIds=new Set((quiz.round??[]).map(question=>question.id));
    const candidates=fresh.length>=10?fresh:[...fresh,...pool.filter(question=>!fresh.some(item=>item.id===question.id)&&!recentRoundIds.has(question.id))];
    const round=shuffle(candidates).slice(0,10);
    const nextUsed=[...(fresh.length>=10?usedIds:(quiz.round??[]).map(question=>question.id)),...round.map(question=>question.id)].slice(-80);
    setQuiz({...quiz,round,usedIds:nextUsed,index:0,player:0,scores:[0,0],selected:null,timedOut:false,opponentCorrect:false,phase:"question"});
  }
  function answer(choice:number){
    if(phase!=="question"||selected!==null||!question)return;
    const nextScores=[...scores] as [number,number];
    if(choice===question.answer) nextScores[player]+=1;
    const opponentCorrect = solo && Math.floor(Math.random()*4) === question.answer;
    if(opponentCorrect) nextScores[1]+=1;
    setQuiz({...quiz,selected:choice,scores:nextScores,opponentCorrect,phase:"result"});
  }
  function next(){
    if(index>=round.length-1){setQuiz({...quiz,phase:"finished"});return;}
    setQuiz({...quiz,index:index+1,player:solo?0:player===0?1:0,selected:null,timedOut:false,opponentCorrect:false,phase:"question"});
  }
  function restart(){setQuiz({...quiz,phase:"setup",round:[],index:0,scores:[0,0],player:0,selected:null,timedOut:false});}
  const progress=round.length?Math.round((answeredCount/round.length)*100):0;

  return (
    <section className={"quiz-game" + (solo ? " is-solo" : "")}>
      {phase==="setup"&&(
        <div className="quiz-setup">
          <span className="quiz-mark"><Brain aria-hidden="true"/></span>
          <p className="date-kicker">Desafio de conhecimento</p>
          <h3>{solo ? "Desafio de conhecimento" : "Quiz dos dois"}</h3>
          <p>{solo ? "Teste seus conhecimentos contra uma rodada de respostas do Morados. Escolha uma categoria e tente superar a pontuação." : "Alternem as respostas, acertem as perguntas e descubram quem conhece mais assuntos diferentes."}</p>
          <div className="quiz-category-picker" role="group" aria-label="Escolher categoria">
            {categories.map(item=><button type="button" key={item} className={category===item?"is-active":""} onClick={()=>setCategory(item)}>{item}</button>)}
          </div>
          <div className="quiz-rules"><span>10 perguntas por rodada</span><span>20 segundos por resposta</span><span>1 ponto por acerto</span></div>
          <p className="quiz-bank-count"><strong>{questionBank.length} perguntas</strong> no banco · novas combinações a cada rodada</p>
          <button type="button" className="primary-action" onClick={start}>Começar quiz</button>
        </div>
      )}
      {(phase==="question"||phase==="result")&&question&&(
        <>
          <div className="quiz-scoreboard">
            <div className={player===0?"is-active":""}><span className="quiz-player-dot is-one"/>{solo ? "Você" : "Pessoa 1"} <strong>{scores[0]}</strong></div>
            <div className={player===1?"is-active":""}><span className="quiz-player-dot is-two"/>{solo ? "Morados" : "Pessoa 2"} <strong>{scores[1]}</strong></div>
          </div>
          <div className="quiz-progress-meta"><span>Pergunta {index+1}/{round.length}</span><span><Clock3 aria-hidden="true"/> {phase==="result"?"Resposta registrada":`${timeLeft}s`}</span></div>
          <div className="quiz-progress"><span style={{width:progress+"%"}}/></div>
          <article className="quiz-question-card">
            <span className="quiz-category">{question.category}</span>
            <p>{solo ? "Sua vez" : `Vez da Pessoa ${player+1}`}</p>
            <h3>{question.question}</h3>
            <div className="quiz-options">
              {question.options.map((option,i)=><button type="button" key={option} onClick={()=>answer(i)} disabled={phase==="result"} className={phase==="result"&&i===question.answer?"is-correct":phase==="result"&&i===selected?"is-wrong":""}>
                <span>{String.fromCharCode(65+i)}</span><strong>{option}</strong>
                {phase==="result"&&i===question.answer&&<small>Resposta correta</small>}
              </button>)}
            </div>
          </article>
          {phase==="result"&&(
            <div className={"quiz-feedback"+(correct?" is-correct":"")}>
              <strong>{timedOut?"Tempo esgotado.":correct?"Muito bem!":"Desta vez não foi."}</strong>
              <p>{question.explanation}</p>
              {solo && <small className={"quiz-opponent-feedback" + (opponentCorrect ? " is-correct" : "")}>Morados {opponentCorrect ? "acertaram" : "não acertaram"} esta pergunta.</small>}
              <button type="button" className="primary-action" onClick={next}>{index===round.length-1?"Ver placar final":"Próxima pergunta"}</button>
            </div>
          )}
        </>
      )}
      {phase==="finished"&&(
        <div className="quiz-finish">
          <span><Trophy aria-hidden="true"/></span><p className="date-kicker">Fim do desafio</p><h3>{solo ? (scores[0]===scores[1]?(solo?"Empate com Morados!":"Vocês empataram!"):`${leader} venceu!`) : (scores[0]===scores[1]?(solo?"Empate com Morados!":"Vocês empataram!"):`${leader} venceu!`)}</h3>
          <div className="quiz-final-score"><div><span>{solo ? "Você" : "Pessoa 1"}</span><strong>{scores[0]}</strong></div><div><span>{solo ? "Morados" : "Pessoa 2"}</span><strong>{scores[1]}</strong></div></div>
          <p>{solo ? "Você respondeu" : "Vocês responderam"} {round.length} perguntas na categoria {category.toLowerCase()}.</p>
          <button type="button" className="primary-action" onClick={start}>Jogar novamente</button>
          <button type="button" className="inline-action" onClick={restart}>Trocar categoria</button>
        </div>
      )}
    </section>
  );
}
