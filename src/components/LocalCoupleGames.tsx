import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { createMoradosPreferenceProfile, getFreshThisOrThatRound } from "@/lib/this-or-that";
import { ThisOrThatResults } from "@/components/ThisOrThatResults";
import { GameVictoryScreen } from "@/components/GameExperience";

const CONNECT_WIDTH = 7;
const CONNECT_HEIGHT = 6;

function findConnectWinner(board: number[], row: number, column: number, player: number) {
  const directions: Array<[number, number]> = [[1,0],[0,1],[1,1],[1,-1]];
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

export function LocalConnectFourGame({ solo = false }: { solo?: boolean }) {
  const [board, setBoard] = useState<number[]>(() => Array(42).fill(0));
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [moves, setMoves] = useState(0);
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    if (!solo || turn !== 2 || winner || draw) return;
    const timer = window.setTimeout(() => {
      const columns = Array.from({ length: CONNECT_WIDTH }, (_, column) => column).filter((column) => board[column] === 0);
      const simulate = (from: number[], column: number, player: number) => {
        let row = -1;
        for (let y = CONNECT_HEIGHT - 1; y >= 0; y -= 1) if (from[y * CONNECT_WIDTH + column] === 0) { row = y; break; }
        if (row < 0) return null;
        const next = [...from];
        next[row * CONNECT_WIDTH + column] = player;
        return { next, row, wins: findConnectWinner(next, row, column, player) };
      };
      if (!columns.length) { setDraw(true); return; }
      const winning = columns.find((column) => simulate(board, column, 2)?.wins);
      const blocking = columns.find((column) => simulate(board, column, 1)?.wins);
      const ranked = columns.map((column) => {
        const result = simulate(board, column, 2);
        let score = (3 - Math.abs(3 - column)) * 4 + Math.random();
        if (result?.wins) score += 1000;
        if (result && columns.some((other) => simulate(result.next, other, 1)?.wins)) score -= 50;
        return { column, score };
      }).sort((a, b) => b.score - a.score);
      const selected = winning ?? blocking ?? ranked[0]?.column;
      if (selected === undefined) return;
      const result = simulate(board, selected, 2);
      if (!result) return;
      setBoard(result.next);
      setMoves((value) => value + 1);
      if (result.wins) setWinner(2);
      else if (result.next.every((cell) => cell !== 0)) setDraw(true);
      else setTurn(1);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [solo, turn, board, winner, draw]);

  function playColumn(column: number) {
    if (winner || draw || (solo && turn === 2)) return;
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
    <section className={"local-connect-four" + (solo ? " is-solo" : "")} aria-label="Lig 4">
      <div className="local-game-status">
        <span className={turn === 1 ? "is-turn" : ""}><i className="connect-four-piece is-player-one"/> {solo ? "Você" : "Pessoa 1"}</span>
        <span className={turn === 2 ? "is-turn" : ""}><i className="connect-four-piece is-player-two"/> {solo ? "Morados" : "Pessoa 2"}</span>
      </div>
      <p className="local-game-turn" role="status" aria-live="polite">
        {winner ? (solo ? (winner === 1 ? "Você venceu!" : "Morados venceram!") : `Pessoa ${winner} venceu a partida!`) : draw ? "Deu velha! A partida terminou empatada." : solo && turn === 2 ? "Morados estão pensando…" : `Vez de ${solo ? "você" : "Pessoa " + turn}`}
      </p>
      <div className="connect-four-column-controls" aria-label="Escolha a coluna">
        {Array.from({length:7},(_,column)=>(
          <button key={column} type="button" onClick={()=>playColumn(column)} disabled={Boolean(winner||draw)||(solo&&turn===2)||board[column]!==0} aria-label={`Soltar peça na coluna ${column+1}`}>{column+1}</button>
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
      {(winner || draw) && (
        <div
          className={"morados-connect-four-result " + (draw ? "is-draw" : winner === 1 ? "is-victory" : "is-defeat")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="morados-connect-four-result-title"
          data-outcome={draw ? "draw" : winner === 1 ? "victory" : "defeat"}
        >
          <div className="morados-connect-four-result-inner">
            <span className="morados-connect-four-result-mark" aria-hidden="true"><Trophy /></span>
            <span className="morados-connect-four-result-eyebrow">{draw ? "PARTIDA ENCERRADA" : winner === 1 ? "VITÓRIA" : "FIM DE JOGO"}</span>
            <h2 id="morados-connect-four-result-title">
              {draw ? "Empate!" : solo ? (winner === 1 ? "Você venceu!" : "Morados venceu!") : `Pessoa ${winner} venceu!`}
            </h2>
            <p className="morados-connect-four-result-message">
              {draw
                ? "As colunas se completaram sem uma sequência de quatro peças. Uma nova estratégia pode mudar o próximo resultado."
                : solo
                  ? winner === 1
                    ? "Quatro peças alinhadas. Você encontrou o caminho até a vitória."
                    : "Morados conseguiu completar a sequência desta vez. Tente outra estratégia na próxima rodada."
                  : `Quatro peças em linha. A Pessoa ${winner} conquistou a partida.`}
            </p>
            <div className="morados-connect-four-result-stats" aria-label={`Partida encerrada em ${moves} jogadas`}>
              <strong>{moves}</strong>
              <span>jogadas</span>
            </div>
            <div className="morados-connect-four-result-actions">
              <button type="button" className="morados-connect-four-replay" onClick={restart}>
                <RotateCcw aria-hidden="true" /> Jogar novamente
              </button>
              <button
                type="button"
                className="morados-connect-four-exit"
                onClick={() => window.dispatchEvent(new Event("morados:game-exit"))}
              >
                Voltar à biblioteca
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="local-game-footer">
        <span>{moves} jogadas · {solo ? "Contra Morados" : "Mesmo aparelho"}</span>
        <button type="button" className="inline-action" onClick={restart}><RotateCcw aria-hidden="true"/> Reiniciar</button>
      </footer>
    </section>
  );
}

type AnswerPair = {first:"a"|"b"|null; second:"a"|"b"|null};

export function LocalThisOrThatGame({ solo = false }: { solo?: boolean }) {
  const [index,setIndex]=useState(0);
  const [round,setRound]=useState(()=>getFreshThisOrThatRound());
  const [moradosChoices,setMoradosChoices]=useState(()=>createMoradosPreferenceProfile(round));
  const [recentIds,setRecentIds]=useState<string[]>([]);
  const [answers,setAnswers]=useState<Record<string,AnswerPair>>({});
  const [activePlayer,setActivePlayer]=useState<1|2>(1);
  const [handoff,setHandoff]=useState(false);
  const [showResults,setShowResults]=useState(false);
  const question=round[index];
  const firstAnswers=round.filter((item)=>answers[item.id]?.first).length;
  const secondAnswers=round.filter((item)=>answers[item.id]?.second).length;
  const results=useMemo(()=>round.map((item)=>({question:item,answers:answers[item.id]??{first:null,second:null}})),[round,answers]);

  function choose(value:"a"|"b") {
    setAnswers((current)=>{
      const existing=current[question.id]??{first:null,second:null};
      if (solo) return {...current,[question.id]:{first:value,second:moradosChoices[question.id]}};
      return {...current,[question.id]:activePlayer===1?{...existing,first:value}:{...existing,second:value}};
    });
    if (solo) {
      if (index < round.length - 1) setIndex((current)=>current+1);
      else setShowResults(true);
    } else if(activePlayer===1){setHandoff(true);}else if(index<round.length-1){setIndex((current)=>current+1);setActivePlayer(1);setHandoff(false);}else{setShowResults(true);setHandoff(false);}
  }

  function continueToSecond() {setActivePlayer(2);setHandoff(false);}
  function restart(){
    const nextRecent=[...recentIds,...round.map((item)=>item.id)].slice(-45);
    setRecentIds(nextRecent);
    const nextRound=getFreshThisOrThatRound(nextRecent);
    setRound(nextRound);
    setMoradosChoices(createMoradosPreferenceProfile(nextRound));
    setIndex(0);setAnswers({});setActivePlayer(1);setHandoff(false);setShowResults(false);
  }

  return (
    <section className={"local-choice-game" + (solo ? " is-solo" : "")}>
      {!showResults?(
        <>
          <div className="local-game-progress"><span>Pergunta {index+1} de {round.length}</span><span>{solo ? "Sua escolha" : `Pessoa ${activePlayer} responde`}</span></div>
          <div className="local-choice-progress"><span style={{width:((index+(activePlayer===2?0.5:0))/round.length*100)+"%"}}/></div>
          {handoff && !solo?(
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
          <div className="local-choice-counts">{solo ? <span>Suas respostas: {firstAnswers}/{round.length}</span> : <><span>Pessoa 1: {firstAnswers}/{round.length}</span><span>Pessoa 2: {secondAnswers}/{round.length}</span></>}</div>
        </>
      ):(
        <ThisOrThatResults
          mode={solo ? "solo" : "local"}
          entries={results
            .filter(({ answers:result }) => result.first !== null && result.second !== null)
            .map(({ question:item, answers:result }) => ({
              id: item.id,
              prompt: item.prompt,
              firstChoice: result.first === "a" ? item.a : item.b,
              secondChoice: result.second === "a" ? item.a : item.b,
              matched: result.first === result.second,
            }))}
          onReplay={restart}
          onExit={() => window.dispatchEvent(new Event("morados:game-exit"))}
        />
      )}
    </section>
  );
}

type LocalDailyChallenge = {
  category: string;
  title: string;
  instruction: string;
  solo: string;
  duration: string;
  objective: string;
};

const dailyChallenges: LocalDailyChallenge[] = [
  { category:"Criatividade", title:"Desenho às cegas", instruction:"Escolham um objeto. Cada pessoa desenha sem olhar para o papel por um minuto. Depois revelem os desenhos e tentem reconhecer o que o outro representou.", solo:"Escolha um objeto simples, feche os olhos e desenhe por um minuto. Depois observe o resultado e dê um nome à sua criação.", duration:"3 minutos", objective:"Criar um desenho sem olhar para a folha e comparar as interpretações." },
  { category:"Dedução", title:"Objeto misterioso", instruction:"Uma pessoa escolhe um objeto que esteja perto, sem mostrar. A outra pode fazer até dez perguntas que só aceitam sim ou não para descobrir o objeto. Depois troquem.", solo:"Escolha um objeto próximo e tente descrevê-lo sem olhar diretamente para ele. Faça até dez perguntas de sim ou não e deduza sua forma, material e uso antes de conferir.", duration:"5 minutos", objective:"Descobrir um objeto usando pistas limitadas e perguntas bem formuladas." },
  { category:"Memória", title:"Linha do tempo", instruction:"Cada pessoa conta três momentos marcantes da história de vocês. Misturem os seis momentos e tentem colocá-los em ordem cronológica.", solo:"Escolha três lembranças importantes e organize-as em ordem cronológica. Registre o que tornou cada momento especial.", duration:"7 minutos", objective:"Reconstruir uma sequência de lembranças sem consultar fotos ou mensagens." },
  { category:"Improviso", title:"História em turnos", instruction:"Criem juntos uma história. Cada pessoa acrescenta duas frases por vez, sem combinar o que vem depois. A história precisa terminar em até seis turnos.", solo:"Escreva uma história curta em seis frases. Cada frase deve acrescentar uma surpresa ou mudar o rumo da narrativa.", duration:"5 minutos", objective:"Concluir uma história com começo, mudança de rumo e final." },
  { category:"Observação", title:"Caça às cores", instruction:"Escolham uma cor. Cada pessoa tem um minuto para encontrar cinco objetos dessa cor e mostrar o resultado. Comparem tons e texturas.", solo:"Escolha uma cor e encontre cinco objetos dela em até um minuto. Depois tente organizá-los do mais claro ao mais escuro.", duration:"3 minutos", objective:"Encontrar cinco objetos da mesma cor e organizar os resultados." },
  { category:"Memória", title:"Mesa de detalhes", instruction:"Separem dez objetos pequenos sobre uma mesa. Observem por vinte segundos, cubram tudo e tentem listar os objetos e suas posições. Troquem a lista e confiram.", solo:"Observe dez objetos por vinte segundos. Cubra-os e escreva tudo de que se lembra, incluindo as posições aproximadas.", duration:"5 minutos", objective:"Lembrar ao menos sete objetos e três posições." },
  { category:"Linguagem", title:"Palavra proibida", instruction:"Escolham uma palavra comum, como 'sim', 'não' ou 'hoje'. Conversem por dois minutos sem pronunciá-la. Quem perceber uma infração marca um ponto.", solo:"Grave um áudio de um minuto falando sobre seu dia sem usar uma palavra comum escolhida antes. Depois ouça e conte quantas vezes quase a utilizou.", duration:"4 minutos", objective:"Manter uma conversa sem usar a palavra escolhida." },
  { category:"Audição", title:"Detetives de sons", instruction:"Uma pessoa fecha os olhos enquanto a outra produz cinco sons com objetos próximos. Tentem identificar a fonte e a ordem dos sons. Depois invertam.", solo:"Grave cinco sons diferentes feitos com objetos próximos. Ouça a gravação depois e tente identificar a ordem e a fonte de cada som.", duration:"5 minutos", objective:"Identificar corretamente a origem de cinco sons." },
  { category:"Fotografia", title:"Pequena expedição", instruction:"Escolham três temas: algo antigo, algo que tenha textura e algo que lembre a infância. Cada pessoa encontra e fotografa um exemplo de cada tema.", solo:"Fotografe três coisas ao seu redor: algo antigo, algo com uma textura interessante e algo que lembre sua infância.", duration:"8 minutos", objective:"Produzir três registros que contem pequenas histórias." },
  { category:"Criatividade", title:"Três vidas para um objeto", instruction:"Escolham um objeto simples. Em dois minutos, inventem três usos totalmente diferentes para ele. Cada uso precisa ter nome e explicação.", solo:"Escolha um objeto e invente três usos que ele normalmente não teria. Dê um nome e uma pequena explicação para cada ideia.", duration:"4 minutos", objective:"Criar três usos originais para o mesmo objeto." },
  { category:"Orientação", title:"Mapa de memória", instruction:"Descrevam um caminho conhecido sem dizer o nome das ruas ou lugares. A outra pessoa tenta desenhar o trajeto e identificar o destino.", solo:"Desenhe de memória um caminho que percorre com frequência. Depois compare o mapa com o trajeto real e marque o que esqueceu.", duration:"7 minutos", objective:"Representar um trajeto com referências claras e na ordem certa." },
  { category:"Carinho", title:"Elogio com evidências", instruction:"Cada pessoa escolhe uma qualidade do outro e conta dois episódios concretos em que a percebeu. Evitem elogios genéricos.", solo:"Escolha uma qualidade sua que costuma passar despercebida. Anote dois momentos em que ela apareceu e por que ela importa.", duration:"5 minutos", objective:"Transformar um elogio em duas lembranças concretas." },
  { category:"Improviso", title:"Apresente um sonho", instruction:"Cada um tem um minuto para apresentar um sonho como se estivesse convidando o outro para participar. Depois escolham um primeiro passo possível.", solo:"Apresente em voz alta um sonho como se estivesse convidando alguém para participar. Termine com um primeiro passo concreto.", duration:"4 minutos", objective:"Explicar um sonho e definir uma ação inicial." },
  { category:"Narrativa", title:"Cinco palavras, uma história", instruction:"Escolham cinco palavras aleatórias de objetos próximos. Criem uma história que use todas elas sem parecer uma lista.", solo:"Escolha cinco palavras de objetos próximos e escreva uma história curta que conecte todas elas.", duration:"6 minutos", objective:"Conectar cinco palavras em uma narrativa coerente." },
  { category:"Observação", title:"Lista relâmpago", instruction:"Em três minutos, encontrem algo redondo, algo macio, algo que faça barulho, algo que tenha uma história e algo que nenhum dos dois usa há meses.", solo:"Encontre cinco itens: algo redondo, algo macio, algo que faça barulho, algo com uma história e algo sem uso recente.", duration:"3 minutos", objective:"Encontrar cinco itens que atendam aos critérios." },
  { category:"Construção", title:"Torre improvável", instruction:"Com papel, livros ou objetos seguros, construam em três minutos a torre mais alta que consiga ficar em pé por dez segundos.", solo:"Use papel ou objetos leves e seguros para construir uma torre que permaneça em pé por dez segundos.", duration:"5 minutos", objective:"Construir uma estrutura estável com os materiais disponíveis." },
  { category:"Música", title:"Adivinhe a lembrança", instruction:"Cada pessoa escolhe uma música ligada a uma lembrança. Toquem um trecho sem revelar o motivo; o outro tenta adivinhar a ocasião.", solo:"Escolha uma música ligada a uma lembrança. Escreva três pistas sobre a ocasião e tente adivinhar a lembrança depois de um intervalo.", duration:"5 minutos", objective:"Relacionar uma música a uma lembrança usando três pistas." },
  { category:"Cooperação", title:"Desenho compartilhado", instruction:"Sem conversar, cada pessoa acrescenta uma parte a um desenho, alternando a cada quinze segundos. Depois de dois minutos, deem um título à criação.", solo:"Faça um desenho em quatro etapas, interrompendo-se por quinze segundos entre elas. A cada etapa, acrescente algo sem planejar o resultado final.", duration:"3 minutos", objective:"Concluir uma criação em etapas sem planejar o resultado." },
  { category:"Dedução", title:"Duas verdades e uma invenção", instruction:"Cada pessoa conta três fatos sobre si: dois verdadeiros e um inventado. A outra pessoa escolhe qual parece falso e explica a pista que percebeu.", solo:"Escreva três fatos sobre você, dois verdadeiros e um inventado. Depois releia e tente perceber qual deles parece menos convincente.", duration:"5 minutos", objective:"Identificar a afirmação inventada e explicar a escolha." },
  { category:"Criatividade", title:"Cardápio impossível", instruction:"Inventem um prato com três ingredientes escolhidos por cada pessoa. Criem nome, modo de preparo e uma frase de divulgação.", solo:"Invente um prato com três ingredientes improváveis. Dê um nome, descreva o preparo e escreva uma frase para apresentá-lo.", duration:"5 minutos", objective:"Criar um prato imaginário com nome e apresentação." },
];

function localDateSeed() {
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const date=Object.fromEntries(parts.map((part)=>[part.type,part.value]));
  const seed=Number(date.year+date.month+date.day);
  return seed%dailyChallenges.length;
}

export function LocalDailyChallengeGame({ solo = false }: { solo?: boolean }) {
  const challenge=dailyChallenges[localDateSeed()];
  const [done,setDone]=useState<[boolean,boolean]>([false,false]);
  const completeCount=Number(done[0])+Number(done[1]);
  const complete=solo ? done[0] : completeCount===2;
  return (
    <section className={"local-daily-game" + (solo ? " is-solo" : "")}>
      {!complete ? (
        <>
          <div className="local-daily-date">{solo ? "DESAFIO INDIVIDUAL · " : "MISSÃO DO DIA · "} {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"numeric",month:"long"}).format(new Date())}</div>
          <div className="local-daily-meta"><span className="local-game-category">{challenge.category}</span><span>{challenge.duration}</span></div>
          <h3>{challenge.title}</h3>
          <p className="local-daily-objective">{challenge.objective}</p>
          <p>{solo ? challenge.solo : challenge.instruction}</p>
          <div className="local-daily-players">
            {(solo ? [0] as const : [0,1] as const).map((player)=>(
              <button type="button" key={player} className={done[player]?"is-complete":""} onClick={()=>setDone((current)=>current.map((value,index)=>index===player?!value:value) as [boolean,boolean])}>
                <span className="local-daily-check">{done[player]?"✓":player+1}</span>
                <strong>{solo ? "Você" : `Pessoa ${player+1}`}</strong>
                <small>{done[player]?"Missão concluída":"Marcar conclusão"}</small>
              </button>
            ))}
          </div>
          <div className="local-daily-result" role="status" aria-live="polite">
            {solo ? (completeCount ? "Desafio individual concluído. Boa!" : "Faça a missão e marque quando terminar.") : completeCount===1?"Uma pessoa já concluiu. Falta só mais uma!":"Façam a missão juntos e marquem quando cada um terminar."}
          </div>
          <button type="button" className="inline-action" onClick={()=>setDone([false,false])}><RotateCcw aria-hidden="true"/> Limpar marcações</button>
        </>
      ) : (
        <GameVictoryScreen
          won
          eyebrow={solo ? "DESAFIO INDIVIDUAL" : "MISSÃO DO DIA"}
          title={solo ? "Missão cumprida!" : "Vocês conseguiram!"}
          subtitle={`${challenge.title}. ${challenge.objective}`}
          stats={[
            { label:"Participantes", value:solo ? "1/1" : "2/2" },
            { label:"Categoria", value:challenge.category },
            { label:"Duração sugerida", value:challenge.duration },
          ]}
          primaryLabel={solo ? "Refazer missão" : "Refazer desafio"}
          onReplay={()=>setDone([false,false])}
          onExit={()=>window.dispatchEvent(new Event("morados:game-exit"))}
        />
      )}
    </section>
  );
}
