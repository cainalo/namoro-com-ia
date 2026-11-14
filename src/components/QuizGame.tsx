import { useEffect, useState } from "react";
import { Brain, Clock3, RotateCcw, Trophy } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";

type QuizQuestion={id:string;category:string;question:string;options:[string,string,string,string];answer:number;explanation:string};
const questionBank:QuizQuestion[]=[
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
];

const categories=["Todas","Ciência","Natureza","Geografia","Cultura"];
function shuffle<T>(values:T[]){const items=values.slice();for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
type QuizShared={category:string;round:QuizQuestion[];index:number;player:0|1;scores:[number,number];phase:"setup"|"question"|"result"|"finished";selected:number|null;timedOut:boolean;opponentCorrect:boolean};
export function QuizGame({ solo = false }: { solo?: boolean }){
  const [quiz,setQuiz,sync]=useGameState<QuizShared>(()=>({category:"Todas",round:[],index:0,player:0,scores:[0,0],phase:"setup",selected:null,timedOut:false,opponentCorrect:false}),{
    turnSeat:(q)=>q.player,
    outcome:(q)=>q.phase!=="finished"?null:q.scores[0]===q.scores[1]?{kind:"draw"}:{kind:"win",winnerSeat:q.scores[0]>q.scores[1]?0:1},
  });
  const {category,round,index,player,scores,phase,selected,timedOut}=quiz;
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
    setQuiz({...quiz,round:shuffle(pool).slice(0,10),index:0,player:0,scores:[0,0],selected:null,timedOut:false,opponentCorrect:false,phase:"question"});
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
          <div className="quiz-rules"><span>10 perguntas</span><span>20 segundos por resposta</span><span>1 ponto por acerto</span></div>
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
          <span><Trophy aria-hidden="true"/></span><p className="date-kicker">Fim do desafio</p><h3>{solo ? (scores[0]===scores[1]?"Vocês empataram!":`${leader} venceu!`) : (scores[0]===scores[1]?"Vocês empataram!":`${leader} venceu!`)}</h3>
          <div className="quiz-final-score"><div><span>{solo ? "Você" : "Pessoa 1"}</span><strong>{scores[0]}</strong></div><div><span>{solo ? "Morados" : "Pessoa 2"}</span><strong>{scores[1]}</strong></div></div>
          <p>{solo ? "Você respondeu" : "Vocês responderam"} {round.length} perguntas na categoria {category.toLowerCase()}.</p>
          <button type="button" className="primary-action" onClick={start}>Jogar novamente</button>
          <button type="button" className="inline-action" onClick={restart}>Trocar categoria</button>
        </div>
      )}
    </section>
  );
}
