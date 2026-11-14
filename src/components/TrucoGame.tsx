import { useEffect, useState } from "react";
import { Handshake, RotateCcw, Swords } from "lucide-react";

type Suit="♣"|"♥"|"♠"|"♦";
type Rank="4"|"5"|"6"|"7"|"Q"|"J"|"K"|"A"|"2"|"3";
export type Card={id:string;rank:Rank;suit:Suit};
export type Player=0|1;
export type TrickWinner=Player|"tie";
type Phase="play"|"handoff"|"challenge"|"trick-result"|"hand-result"|"match-result";
export type TableCard={player:Player;card:Card};
export type TrucoState={
  hands:[Card[],Card[]];
  vira:Card;
  manilha:Rank;
  handStarter:Player;
  turn:Player;
  table:TableCard[];
  tricks:TrickWinner[];
  score:[number,number];
  handPoints:number;
  pendingRaise:number|null;
  challenger:Player|null;
  phase:Phase;
  lastTrick:TrickWinner|null;
  handWinner:Player|null;
  handReason:string;
  matchWinner:Player|null;
};
export const suits:Suit[]=["♣","♥","♠","♦"];
export const ranks:Rank[]=["4","5","6","7","Q","J","K","A","2","3"];
const suitPower:Record<Suit,number>={"♦":1,"♠":2,"♥":3,"♣":4};
const rankPower:Record<Rank,number>={"4":0,"5":1,"6":2,"7":3,"Q":4,"J":5,"K":6,"A":7,"2":8,"3":9};
export const nextRank=(rank:Rank):Rank=>ranks[(rankPower[rank]+1)%ranks.length];
export const labels:Record<Suit,string>={"♣":"Paus","♥":"Copas","♠":"Espadas","♦":"Ouros"};
function shuffle<T>(items:T[]){
  const out=items.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function createHand(score:[number,number],starter:Player):TrucoState{
  const deck=shuffle(ranks.flatMap(rank=>suits.map(suit=>({id:rank+suit,rank,suit}))));
  const hands:[Card[],Card[]]=[deck.slice(0,3),deck.slice(3,6)];
  const vira=deck[6];
  return {hands,vira,manilha:nextRank(vira.rank),handStarter:starter,turn:starter,table:[],tricks:[],score:[...score],handPoints:1,pendingRaise:null,challenger:null,phase:"play",lastTrick:null,handWinner:null,handReason:"",matchWinner:null};
}
function strength(card:Card,manilha:Rank){
  return card.rank===manilha?100+suitPower[card.suit]:rankPower[card.rank];
}
export function trickWinner(a:Card,b:Card,manilha:Rank):TrickWinner{
  const first=strength(a,manilha),second=strength(b,manilha);
  return first===second?"tie":first>second?0:1;
}
export const other=(player:Player):Player=>player===0?1:0;
export function decideHand(wins:TrickWinner[],starter:Player):Player|null{
  const w0=wins.filter(x=>x===0).length,w1=wins.filter(x=>x===1).length;
  if(w0>=2)return 0;if(w1>=2)return 1;
  if(wins.length<3)return null;
  const firstDecisive=wins.find(x=>x!=="tie");
  return firstDecisive===undefined||(firstDecisive as unknown)==="tie"?starter:(firstDecisive as Player);
}
export function endHand(state:TrucoState,winner:Player,reason:string):TrucoState{
  const score=[...state.score] as [number,number];
  score[winner]+=state.handPoints;
  const matchWinner=score[winner]>=12?winner:null;
  return {...state,score,phase:matchWinner===null?"hand-result":"match-result",handWinner:winner,handReason:reason,matchWinner};
}
export function raiseLabel(points:number){return points===3?"Truco":points===6?"Seis":points===9?"Nove":"Doze";}
export function nextRaise(points:number){return points===1?3:points===3?6:points===6?9:points===9?12:null;}

export function TrucoGame({ solo = false }: { solo?: boolean }){
  const [game,setGame]=useState<TrucoState>(()=>createHand([0,0],0));
  const [error,setError]=useState("");
  const canRaise=game.phase==="play"&&nextRaise(game.handPoints)!==null;
  const currentHand=game.hands[game.turn];
  const winnerText=game.handWinner===null?"":solo?(game.handWinner===0?"Você":"Morados"):`Pessoa ${game.handWinner+1}`;
  const status=game.phase==="match-result"?(solo?(game.matchWinner===0?"Você venceu o jogo!":"Morados venceram o jogo!"):`Pessoa ${(game.matchWinner??0)+1} venceu o jogo!`):game.phase==="hand-result"?`${winnerText} ganhou a mão.`:game.phase==="challenge"?"Uma chamada foi feita.":solo&&game.turn===1?"Morados estão pensando…":`Vez de ${solo?(game.turn===0?"você":"Morados"):"Pessoa "+(game.turn+1)}.`;

  function playCard(cardId:string){
    if(game.phase!=="play")return;
    const card=currentHand.find(item=>item.id===cardId);
    if(!card)return;
    const hands=[game.hands[0].slice(),game.hands[1].slice()] as [Card[],Card[]];
    hands[game.turn]=hands[game.turn].filter(item=>item.id!==cardId);
    const table=[...game.table,{player:game.turn,card}];
    if(table.length===1){
      setGame({...game,hands,table,turn:other(game.turn),phase:solo?"play":"handoff"});
      return;
    }
    const resultPosition=trickWinner(table[0].card,table[1].card,game.manilha);
    const result:TrickWinner=resultPosition==="tie"?"tie":table[resultPosition].player;
    const tricks=[...game.tricks,result];
    const handWinner=decideHand(tricks,game.handStarter);
    const nextState={...game,hands,table,tricks,lastTrick:result};
    if(handWinner!==null){
      setGame(endHand(nextState,handWinner,`A mão valeu ${game.handPoints} ponto(s). ${tricks.filter(x=>x===handWinner).length} rodada(s) vencida(s).`));
    }else{
      setGame({...nextState,phase:"trick-result"});
    }
    setError("");
  }

  function callRaise(){
    const raise=nextRaise(game.handPoints);
    if(raise===null||game.phase!=="play")return;
    setGame({...game,pendingRaise:raise,challenger:game.turn,phase:"challenge"});
  }
  function answerChallenge(accept:boolean){
    if(game.phase!=="challenge"||game.challenger===null||game.pendingRaise===null)return;
    if(accept){
      setGame({...game,handPoints:game.pendingRaise,turn:game.challenger,pendingRaise:null,challenger:null,phase:"play"});
    }else{
      const winner=game.challenger;
      setGame(endHand(game,winner,`A Pessoa ${other(winner)+1} correu da chamada. A mão valeu ${game.handPoints} ponto(s).`));
    }
  }
  function continueHandoff(){if(game.phase==="handoff")setGame({...game,phase:"play"});}
  function continueTrick(){
    if(game.phase!=="trick-result"||game.lastTrick===null)return;
    const previousDecisive=[...game.tricks].reverse().find(result=>result!=="tie");
    const starter=game.lastTrick==="tie"?(previousDecisive??game.handStarter):game.lastTrick;
    setGame({...game,turn:starter,table:[],lastTrick:null,phase:"play"});
  }
  function nextHand(){
    if(game.phase!=="hand-result")return;
    setGame(createHand(game.score,other(game.handStarter)));
  }
  function restart(){setGame(createHand([0,0],0));setError("");}

  useEffect(() => {
    if (!solo) return;
    if (game.phase === "challenge" && game.challenger === 0 && game.pendingRaise !== null) {
      const timer = window.setTimeout(() => {
        const strengthTotal = game.hands[1].reduce((sum, card) => sum + strength(card, game.manilha), 0);
        const hasManilha = game.hands[1].some((card) => card.rank === game.manilha);
        const accept = hasManilha || strengthTotal >= 24 || Math.random() > 0.45;
        answerChallenge(accept);
      }, 720);
      return () => window.clearTimeout(timer);
    }
    if (game.phase !== "play" || game.turn !== 1) return;
    const timer = window.setTimeout(() => {
      const hand = game.hands[1];
      if (!hand.length) return;
      const canCall = nextRaise(game.handPoints) !== null;
      const power = hand.reduce((sum, card) => sum + strength(card, game.manilha), 0);
      if (game.table.length === 0 && canCall && power >= 27 && Math.random() < 0.22) {
        callRaise();
        return;
      }
      let selectedCard: Card;
      if (game.table.length === 1) {
        const lead = game.table[0].card;
        const winning = hand.filter((card) => strength(card, game.manilha) > strength(lead, game.manilha))
          .sort((a, b) => strength(a, game.manilha) - strength(b, game.manilha));
        selectedCard = winning[0] ?? hand.slice().sort((a, b) => strength(a, game.manilha) - strength(b, game.manilha))[0];
      } else {
        selectedCard = hand.slice().sort((a, b) => strength(a, game.manilha) - strength(b, game.manilha))[0];
      }
      playCard(selectedCard.id);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [solo, game]);

  return (
    <section className={"truco-game" + (solo ? " is-solo" : "")}>
      <div className="truco-scoreboard">
        <div className={game.turn===0?"is-active":""}><span className="truco-player-dot is-one"/>{solo ? "Você" : "Pessoa 1"}<strong>{game.score[0]}</strong></div>
        <span className="truco-score-separator">×</span>
        <div className={game.turn===1?"is-active":""}><span className="truco-player-dot is-two"/>{solo ? "Morados" : "Pessoa 2"}<strong>{game.score[1]}</strong></div>
      </div>
      <div className="truco-round-meta"><span>Mão vale <strong>{game.handPoints}</strong></span><span>Rodada {game.tricks.length+1}/3</span><span>Primeiro: {solo ? (game.handStarter===0?"Você":"Morados") : `Pessoa ${game.handStarter+1}`}</span></div>
      <div className="truco-table">
        <div className="truco-vira"><small>VIRA · MANILHA</small><div className="truco-vira-cards"><TrucoCard card={game.vira}/><span className="truco-manilha">Manilha: {game.manilha}</span></div></div>
        <div className="truco-played-cards">
          {game.table.length===0?<p>As cartas jogadas aparecerão aqui.</p>:game.table.map(item=><div key={item.card.id}><small>{solo ? (item.player===0?"Você":"Morados") : `Pessoa ${item.player+1}`}</small><TrucoCard card={item.card}/></div>)}
          {game.phase==="trick-result"&&<strong>{game.lastTrick==="tie"?"Rodada empatada.":solo?(game.lastTrick===0?"Rodada vencida por você.":"Rodada vencida pelos Morados."):`Rodada da Pessoa ${(game.lastTrick??0)+1}.`}</strong>}
        </div>
      </div>

      {game.phase==="handoff"&&(
        <div className="truco-overlay">
          <span><Handshake aria-hidden="true"/></span><p className="date-kicker">Troca de jogador</p>
          <h3>Passe o aparelho para a Pessoa {game.turn+1}.</h3>
          <p>A carta anterior já está na mesa. A mão da próxima pessoa só aparece quando ela confirmar.</p>
          <button type="button" className="primary-action" onClick={continueHandoff}>Estou pronto</button>
        </div>
      )}
      {game.phase==="challenge"&&(
        <div className="truco-overlay is-challenge">
          <span><Swords aria-hidden="true"/></span><p className="date-kicker">Desafio aceito?</p>
          <h3>{solo ? (game.challenger===1?"Você recebeu um pedido de ":"Morados receberam um pedido de ") : `Pessoa ${other(game.challenger??0)+1}, pediram `}{raiseLabel(game.pendingRaise??3).toLowerCase()}!</h3>
          <p>A mão passa a valer {game.pendingRaise} pontos se você aceitar. Se correr, {solo?(game.challenger===0?"você":"Morados"):"a outra pessoa"} leva os {game.handPoints} ponto(s) atuais.</p>
          {!(solo && game.challenger===0) ? <div className="truco-challenge-actions">
            <button type="button" className="primary-action" onClick={()=>answerChallenge(true)}>Aceitar · {game.pendingRaise}</button>
            <button type="button" className="secondary-action" onClick={()=>answerChallenge(false)}>Correr · {game.handPoints} ponto(s)</button>
          </div> : <p className="truco-ai-thinking">Morados estão avaliando a chamada…</p>}
        </div>
      )}
      {game.phase==="play"&&(
        <>
          {(!solo || game.turn===0) ? <><div className="truco-active-turn"><strong>{solo ? "Sua vez: escolha uma carta." : `Pessoa ${game.turn+1}, escolha uma carta.`}</strong><small>{solo ? "Morados não veem suas cartas." : "Seu adversário não vê sua mão."}</small></div>
          <div className="truco-hand">
            {currentHand.map(card=><button type="button" key={card.id} className="truco-hand-card" onClick={()=>playCard(card.id)} aria-label={`Jogar ${card.rank} de ${labels[card.suit]}`}><TrucoCard card={card}/></button>)}
          </div>
          <div className="truco-call-actions">
            <button type="button" className="truco-call-button" onClick={callRaise} disabled={!canRaise}><Swords aria-hidden="true"/> Pedir {nextRaise(game.handPoints)===3?"Truco":nextRaise(game.handPoints)===6?"Seis":nextRaise(game.handPoints)===9?"Nove":"Doze"}</button>
            <small>Manilhas: {game.manilha} · Paus, copas, espadas e ouros (nessa ordem).</small>
          </div></> : <div className="truco-ai-thinking">Morados estão escolhendo uma carta em segredo…</div>}
        </>
      )}
      {game.phase==="trick-result"&&(
        <div className="truco-result-panel"><strong>{game.lastTrick==="tie"?"Empate nesta rodada.":solo?(game.lastTrick===0?"Você ganhou a rodada.":"Morados ganharam a rodada."):`Pessoa ${(game.lastTrick??0)+1} ganhou a rodada.`}</strong><p>A próxima rodada começa por quem venceu; se houve empate, a mão segue as regras de desempate.</p><button type="button" className="primary-action" onClick={continueTrick}>Próxima rodada</button></div>
      )}
      {(game.phase==="hand-result"||game.phase==="match-result")&&(
        <div className="truco-result-panel is-hand-end"><strong>{game.phase==="match-result"?(solo?(game.matchWinner===0?"Você venceu o jogo!":"Morados venceram o jogo!"):`Pessoa ${(game.matchWinner??0)+1} venceu o jogo!`):(solo?(game.handWinner===0?"Você venceu a mão!":"Morados venceram a mão."):`Pessoa ${(game.handWinner??0)+1} venceu a mão.`)}</strong><p>{game.handReason}</p><div className="truco-final-score"><span>{solo ? "Você" : "Pessoa 1"} <strong>{game.score[0]}</strong></span><span>{solo ? "Morados" : "Pessoa 2"} <strong>{game.score[1]}</strong></span></div>{game.phase==="hand-result"?<button type="button" className="primary-action" onClick={nextHand}>Nova mão</button>:<button type="button" className="primary-action" onClick={restart}>Nova partida</button>}</div>
      )}
      <footer className="truco-footer"><span>Truco Paulista · {solo ? "Contra Morados" : "primeiro a 12 pontos"}</span><button type="button" className="inline-action" onClick={restart}><RotateCcw/> Reiniciar</button></footer>
      {error&&<p className="couple-game-error">{error}</p>}
    </section>
  );
}

export function TrucoCard({card}:{card:Card}){
  const red=card.suit==="♥"||card.suit==="♦";
  return <span className={"truco-card"+(red?" is-red":"")} aria-hidden="true"><strong>{card.rank}</strong><b>{card.suit}</b><small>{card.rank}{card.suit}</small></span>;
}
