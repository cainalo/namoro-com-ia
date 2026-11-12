import { useMemo, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";

const CONNECT_WIDTH = 7;
const CONNECT_HEIGHT = 6;

function findConnectWinner(board: number[], row: number, column: number, player: number) {
  const directions = [[1,0],[0,1],[1,1],[1,-1]];
  return directions.some(([dx,dy]) => {
    let count = 1;
    for (const sign of [-1,1]) {
      let x = column + dx * sign;
      let y = row + dy * sign;
      while (x >= 0 && x < CONNECT_WIDTH && y >= 0 && y < CONNECT_HEIGHT && board[y * CONNECT_WIDTH + x] === player) {
        count += 1;
        x += dx * sign;
        y += dy * sign;
      }
    }
    return count >= 4;
  });
}

export function LocalConnectFourGame() {
  const [board, setBoard] = useState<number[]>(() => Array(42).fill(0));
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [moves, setMoves] = useState(0);
  const [draw, setDraw] = useState(false);

  function playColumn(column: number) {
    if (winner || draw) return;
    let targetRow = -1;
    for (let row = CONNECT_HEIGHT - 1; row >= 0; row -= 1) {
      if (board[row * CONNECT_WIDTH + column] === 0) {
        targetRow = row;
        break;
      }
    }
    if (targetRow < 0) return;
    const next = [...board];
    next[targetRow * CONNECT_WIDTH + column] = turn;
    setBoard(next);
    setMoves((value) => value + 1);
    if (findConnectWinner(next, targetRow, column, turn)) {
      setWinner(turn);
    } else if (next.every((cell) => cell !== 0)) {
      setDraw(true);
    } else {
      setTurn(turn === 1 ? 2 : 1);
    }
  }

  function restart() {
    setBoard(Array(42).fill(0));
    setTurn(1);
    setWinner(null);
    setMoves(0);
    setDraw(false);
  }

  return (
    <section className="local-connect-four" aria-label="Lig 4 local">
      <div className="local-game-status">
        <span className={turn === 1 ? "is-turn" : ""}><i className="connect-four-piece is-player-one"/> Pessoa 1</span>
        <span className={turn === 2 ? "is-turn" : ""}><i className="connect-four-piece is-player-two"/> Pessoa 2</span>
      </div>
      <p className="local-game-turn" role="status" aria-live="polite">
        {winner ? `Pessoa ${winner} venceu a partida!` : draw ? "Deu velha! A partida terminou empatada." : `Vez da Pessoa ${turn}`}
      </p>
      <div className="connect-four-column-controls" aria-label="Escolha a coluna">
        {Array.from({length:7},(_,column)=>(
          <button key={column} type="button" onClick={()=>playColumn(column)} disabled={Boolean(winner||draw)||board[column]!==0} aria-label={`Soltar peça na coluna ${column+1}`}>{column+1}</button>
        ))}
      </div>
      <div className="connect-four-board" role="grid" aria-label="Tabuleiro de Lig 4">
        {Array.from({length:6},(_,row)=>(
          <div className="connect-four-row" role="row" key={row}>
            {Array.from({length:7},(_,column)=>{
              const cell=board[row*7+column];
              return <div key={column} className="connect-four-cell" role="gridcell" aria-label={`Linha ${row+1}, coluna ${column+1}, ${cell===1?"Pessoa 1":cell===2?"Pessoa 2":"vazia"}`}>
                <span className={"connect-four-piece"+(cell===1?" is-player-one":cell===2?" is-player-two":"")}/>
              </div>;
            })}
          </div>
        ))}
      </div>
      <footer className="local-game-footer">
        <span>{moves} jogadas · Mesmo aparelho</span>
        <button type="button" className="inline-action" onClick={restart}><RotateCcw aria-hidden="true"/> Reiniciar</button>
      </footer>
    </section>
  );
}

type ChoiceQuestion = {id:string; prompt:string; a:string; b:string; category:string};
const choiceQuestions: ChoiceQuestion[] = [
  {id:"trip",prompt:"Uma viagem perfeita seria…",a:"Conhecer cidades históricas",b:"Explorar a natureza",category:"Viagens"},
  {id:"sunday",prompt:"Um domingo livre combina mais com…",a:"Passear sem roteiro",b:"Ficar em casa e descansar",category:"Rotina"},
  {id:"food",prompt:"Na hora de escolher o jantar…",a:"Experimentar algo novo",b:"Repetir um prato favorito",category:"Comida"},
  {id:"movie",prompt:"Para uma noite de cinema…",a:"Mistério e investigação",b:"Comédia e aventura",category:"Entretenimento"},
  {id:"gift",prompt:"Um presente memorável é…",a:"Algo feito à mão",b:"Uma experiência para viver",category:"Preferências"},
  {id:"weekend",prompt:"Um fim de semana ideal…",a:"Cheio de atividades",b:"Com poucas coisas marcadas",category:"Rotina"},
  {id:"music",prompt:"A trilha sonora de uma viagem…",a:"Playlist preparada antes",b:"Músicas escolhidas na hora",category:"Música"},
  {id:"surprise",prompt:"Uma surpresa melhor seria…",a:"Um passeio inesperado",b:"Um bilhete carinhoso",category:"Carinho"},
  {id:"home",prompt:"Uma casa aconchegante precisa de…",a:"Livros e cantinhos de leitura",b:"Música e espaço para receber",category:"Casa"},
  {id:"learning",prompt:"Para aprender algo novo…",a:"Um curso organizado",b:"Experimentar e descobrir",category:"Aprendizado"},
  {id:"weather",prompt:"O clima que mais agrada…",a:"Frio e chuva",b:"Sol e céu aberto",category:"Preferências"},
  {id:"memory",prompt:"Para guardar uma memória…",a:"Fotos e vídeos",b:"Cartas e objetos",category:"Memórias"},
];

type AnswerPair = {first:"a"|"b"|null; second:"a"|"b"|null};

export function LocalThisOrThatGame() {
  const [index,setIndex]=useState(0);
  const [answers,setAnswers]=useState<Record<string,AnswerPair>>({});
  const [activePlayer,setActivePlayer]=useState<1|2>(1);
  const [handoff,setHandoff]=useState(false);
  const [showResults,setShowResults]=useState(false);
  const question=choiceQuestions[index];
  const pair=answers[question.id]??{first:null,second:null};
  const firstAnswers=choiceQuestions.filter((item)=>answers[item.id]?.first).length;
  const secondAnswers=choiceQuestions.filter((item)=>answers[item.id]?.second).length;
  const matched=choiceQuestions.filter((item)=>answers[item.id]?.first&&answers[item.id]?.first===answers[item.id]?.second).length;
  const results=useMemo(()=>choiceQuestions.map((item)=>({question:item,answers:answers[item.id]??{first:null,second:null}})),[answers]);

  function choose(value:"a"|"b") {
    setAnswers((current)=>{
      const existing=current[question.id]??{first:null,second:null};
      return {...current,[question.id]:activePlayer===1?{...existing,first:value}:{...existing,second:value}};
    });
    if(activePlayer===1){setHandoff(true);}else if(index<choiceQuestions.length-1){setIndex((current)=>current+1);setActivePlayer(1);setHandoff(false);}else{setShowResults(true);setHandoff(false);}
  }

  function continueToSecond() {setActivePlayer(2);setHandoff(false);}
  function restart(){setIndex(0);setAnswers({});setActivePlayer(1);setHandoff(false);setShowResults(false);}

  return (
    <section className="local-choice-game">
      {!showResults?(
        <>
          <div className="local-game-progress"><span>Pergunta {index+1} de {choiceQuestions.length}</span><span>Pessoa {activePlayer} responde</span></div>
          <div className="local-choice-progress"><span style={{width:((index+(activePlayer===2?0.5:0))/choiceQuestions.length*100)+"%"}}/></div>
          {handoff?(
            <div className="local-choice-handoff">
              <span className="local-choice-handoff-icon">↔</span>
              <p className="date-kicker">Resposta registrada</p>
              <h3>Passe o aparelho para a Pessoa 2.</h3>
              <p>A primeira escolha foi guardada. A outra pessoa responde sem ver a resposta anterior.</p>
              <button type="button" className="primary-action" onClick={continueToSecond}>Estou com o aparelho</button>
            </div>
          ):(
            <div className="local-choice-question">
              <span className="local-game-category">{question.category}</span>
              <h3>{question.prompt}</h3>
              <div className="local-choice-options">
                <button type="button" onClick={()=>choose("a")}><span>A</span><strong>{question.a}</strong><small>Escolher</small></button>
                <span className="local-choice-or">ou</span>
                <button type="button" onClick={()=>choose("b")}><span>B</span><strong>{question.b}</strong><small>Escolher</small></button>
              </div>
            </div>
          )}
          <div className="local-choice-counts"><span>Pessoa 1: {firstAnswers}/{choiceQuestions.length}</span><span>Pessoa 2: {secondAnswers}/{choiceQuestions.length}</span></div>
        </>
      ):(
        <div className="local-choice-results">
          <p className="date-kicker">Resultado final</p>
          <h3>Quantas escolhas combinaram?</h3>
          <div className="local-choice-score"><strong>{matched}</strong><span>de {choiceQuestions.length} em comum</span></div>
          <ol>
            {results.map(({question:item,answers:result})=>(
              <li key={item.id}>
                <strong>{item.prompt}</strong>
                <span className={result.first===result.second?"is-match":""}>Pessoa 1: {result.first==="a"?item.a:item.b}</span>
                <span className={result.first===result.second?"is-match":""}>Pessoa 2: {result.second==="a"?item.a:item.b}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="primary-action" onClick={restart}><RotateCcw aria-hidden="true"/> Jogar novamente</button>
        </div>
      )}
    </section>
  );
}

const dailyChallenges = [
  {category:"Criatividade",title:"Desenho às cegas",instruction:"Escolham um objeto. Cada pessoa desenha sem olhar para o papel por um minuto. Depois comparem os resultados."},
  {category:"Dedução",title:"Objeto misterioso",instruction:"Uma pessoa escolhe um objeto que esteja perto. A outra pode fazer até dez perguntas que só aceitam sim ou não."},
  {category:"Memória",title:"Linha do tempo",instruction:"Cada pessoa conta três momentos marcantes da história de vocês. Tentem colocá-los na ordem correta."},
  {category:"Improviso",title:"História em turnos",instruction:"Criem juntos uma história. Cada pessoa acrescenta duas frases, sem combinar o que vem depois."},
  {category:"Observação",title:"Caça às cores",instruction:"Escolham uma cor. Cada pessoa tem um minuto para encontrar cinco objetos dessa cor e mostrar o resultado."},
];

function localDateSeed() {
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const date=Object.fromEntries(parts.map((part)=>[part.type,part.value]));
  const seed=Number(date.year+date.month+date.day);
  return seed%dailyChallenges.length;
}

export function LocalDailyChallengeGame() {
  const challenge=dailyChallenges[localDateSeed()];
  const [done,setDone]=useState<[boolean,boolean]>([false,false]);
  const completeCount=Number(done[0])+Number(done[1]);
  return (
    <section className="local-daily-game">
      <div className="local-daily-date">MISSÃO DO DIA · {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"numeric",month:"long"}).format(new Date())}</div>
      <span className="local-game-category">{challenge.category}</span>
      <h3>{challenge.title}</h3>
      <p>{challenge.instruction}</p>
      <div className="local-daily-players">
        {([0,1] as const).map((player)=>(
          <button type="button" key={player} className={done[player]?"is-complete":""} onClick={()=>setDone((current)=>current.map((value,index)=>index===player?!value:value) as [boolean,boolean])}>
            <span className="local-daily-check">{done[player]?"✓":player+1}</span>
            <strong>Pessoa {player+1}</strong>
            <small>{done[player]?"Missão concluída":"Marcar conclusão"}</small>
          </button>
        ))}
      </div>
      <div className="local-daily-result" role="status" aria-live="polite">
        {completeCount===2?"Missão concluída pelos dois. Muito bem!":completeCount===1?"Uma pessoa já concluiu. Falta só mais uma!":"Façam a missão juntos e marquem quando cada um terminar."}
      </div>
      <button type="button" className="inline-action" onClick={()=>setDone([false,false])}><RotateCcw aria-hidden="true"/> Limpar marcações</button>
    </section>
  );
}
