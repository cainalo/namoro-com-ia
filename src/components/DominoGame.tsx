import { useEffect, useMemo, useState } from "react";
import { RotateCcw, ShoppingCart } from "lucide-react";

export type Tile={id:string;a:number;b:number};
export type Placed={tile:Tile;a:number;b:number};
type Player=0|1;
export type DominoState={
  hands:[Tile[],Tile[]];
  stock:Tile[];
  line:Placed[];
  turn:Player;
  left:number|null;
  right:number|null;
  selected:string|null;
  passes:number;
  winner:Player|null|"draw";
  reason:string|null;
};
function shuffle<T>(items:T[]):T[]{
  const copy=items.slice();
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function newDominoGame():DominoState{
  const tiles:Tile[]=[];
  for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)tiles.push({id:`${a}-${b}`,a,b});
  const pack=shuffle(tiles);
  return {
    hands:[pack.slice(0,7),pack.slice(7,14)],
    stock:pack.slice(14),
    line:[],
    turn:0,
    left:null,
    right:null,
    selected:null,
    passes:0,
    winner:null,
    reason:null,
  };
}
export function pipCount(hand:Tile[]){return hand.reduce((sum,tile)=>sum+tile.a+tile.b,0);}
export function playable(tile:Tile,left:number|null,right:number|null){
  return left===null||right===null||tile.a===left||tile.b===left||tile.a===right||tile.b===right;
}
export function placeTile(state:DominoState,side:"left"|"right"):DominoState|null{
  if(!state.selected||state.winner!==null)return null;
  const hand=state.hands[state.turn];
  const tile=hand.find(item=>item.id===state.selected);
  if(!tile)return null;
  let placed:Placed;
  let left=state.left,right=state.right;
  if(left===null||right===null){
    placed={tile,a:tile.a,b:tile.b};left=tile.a;right=tile.b;
  }else if(side==="left"){
    if(tile.b===left){placed={tile,a:tile.a,b:tile.b};left=tile.a;}
    else if(tile.a===left){placed={tile,a:tile.b,b:tile.a};left=tile.b;}
    else return null;
  }else{
    if(tile.a===right){placed={tile,a:tile.a,b:tile.b};right=tile.b;}
    else if(tile.b===right){placed={tile,a:tile.b,b:tile.a};right=tile.a;}
    else return null;
  }
  const hands=[state.hands[0].slice(),state.hands[1].slice()] as [Tile[],Tile[]];
  hands[state.turn]=hands[state.turn].filter(item=>item.id!==tile.id);
  const winner=hands[state.turn].length===0?state.turn:null;
  return {...state,hands,line:side==="left"&&state.line.length>0?[placed,...state.line]:[...state.line,placed],left,right,turn:state.turn===0?1:0,selected:null,passes:0,winner,reason:winner!==null?"Um jogador ficou sem peças.":null};
}
export function DominoGame({ solo = false }: { solo?: boolean }){
  const [game,setGame]=useState<DominoState>(()=>newDominoGame());
  const hand=game.hands[game.turn];
  const canPlayAny=hand.some(tile=>playable(tile,game.left,game.right));
  const pipTotals=[pipCount(game.hands[0]),pipCount(game.hands[1])];
  const currentTile=hand.find(tile=>tile.id===game.selected)??null;
  const canPlaceLeft=Boolean(currentTile&&(game.left===null||currentTile.a===game.left||currentTile.b===game.left));
  const canPlaceRight=Boolean(currentTile&&(game.right===null||currentTile.a===game.right||currentTile.b===game.right));

  useEffect(() => {
    if (!solo || game.turn !== 1 || game.winner !== null) return;
    const timer = window.setTimeout(() => {
      const hand = game.hands[1];
      const possible = hand.filter((tile) => playable(tile, game.left, game.right));
      if (!possible.length && game.stock.length > 0) {
        const nextStock = game.stock.slice();
        const tile = nextStock.shift()!;
        const nextHands = [game.hands[0].slice(), game.hands[1].slice()] as [Tile[], Tile[]];
        nextHands[1].push(tile);
        setGame({ ...game, stock: nextStock, hands: nextHands, selected: null });
        return;
      }
      if (!possible.length) {
        const pips: [number, number] = [pipCount(game.hands[0]), pipCount(game.hands[1])];
        const passes = game.passes + 1;
        if (passes >= 2) {
          const winner = pips[0] === pips[1] ? "draw" : pips[0] < pips[1] ? 0 : 1;
          setGame({ ...game, passes, winner, reason: "Mesa bloqueada. Vence quem terminou com menos pontos na mão." });
        } else {
          setGame({ ...game, passes, turn: 0, selected: null });
        }
        return;
      }
      const ranked = possible.map((tile) => {
        const opensDouble = tile.a === tile.b ? 7 : 0;
        const pipPenalty = tile.a + tile.b;
        return { tile, score: opensDouble + pipPenalty * 1.4 + Math.random() };
      }).sort((a, b) => b.score - a.score);
      const tile = ranked[0].tile;
      const leftFits = game.left === null || tile.a === game.left || tile.b === game.left;
      const rightFits = game.right === null || tile.a === game.right || tile.b === game.right;
      const side: "left" | "right" = rightFits ? "right" : leftFits ? "left" : "right";
      const next = placeTile({ ...game, selected: tile.id }, side);
      if (next) setGame(next);
    }, 540);
    return () => window.clearTimeout(timer);
  }, [solo, game]);

  function place(side:"left"|"right"){
    const next=placeTile(game,side);
    if(next)setGame(next);
  }
  function drawTile(){
    if(game.winner!==null||canPlayAny||!game.stock.length)return;
    const nextStock=game.stock.slice();
    const tile=nextStock.shift()!;
    const nextHands=[game.hands[0].slice(),game.hands[1].slice()] as [Tile[],Tile[]];
    nextHands[game.turn].push(tile);
    setGame({...game,stock:nextStock,hands:nextHands});
  }
  function pass(){
    if(game.winner!==null||canPlayAny||game.stock.length>0)return;
    const nextPasses=game.passes+1;
    if(nextPasses>=2){
      const winner=pipTotals[0]===pipTotals[1]?"draw":pipTotals[0]<pipTotals[1]?0:1;
      setGame({...game,passes:nextPasses,winner,reason:"Mesa bloqueada. Vence quem terminou com menos pontos na mão."});
    }else{
      setGame({...game,passes:nextPasses,turn:game.turn===0?1:0,selected:null});
    }
  }
  function restart(){setGame(newDominoGame());}
  const lineText=useMemo(()=>game.line.length?game.line.map(item=>`${item.a}|${item.b}`).join(" — "):"A mesa ainda está vazia.",[game.line]);
  const status=game.winner==="draw"?"Empate!":typeof game.winner==="number"?(solo?(game.winner===0?"Você venceu!":"Morados venceram!"):`Pessoa ${game.winner+1} venceu!`):`Vez da ${solo?(game.turn===0?"sua vez":"vez dos Morados"):"Pessoa "+(game.turn+1)}`;

  return (
    <section className={"domino-game" + (solo ? " is-solo" : "")}>
      <div className="domino-scorebar">
        <div className={game.turn===0?"is-active":""}><span className="domino-token is-one"/>{solo ? "Você" : "Pessoa 1"} <strong>{game.hands[0].length}</strong><small>{pipTotals[0]} pontos</small></div>
        <div className={game.turn===1?"is-active":""}><span className="domino-token is-two"/>{solo ? "Morados" : "Pessoa 2"} <strong>{game.hands[1].length}</strong><small>{pipTotals[1]} pontos</small></div>
      </div>
      <div className="domino-table-status" role="status" aria-live="polite"><strong>{solo && game.turn===1 && game.winner===null ? "Morados estão pensando…" : status}</strong><span>{game.stock.length} peças na compra · {game.line.length} na mesa</span></div>
      <div className="domino-line-wrap">
        <div className="domino-end-labels"><span>← {game.left??"Esquerda"}</span><span>{game.right??"Direita"} →</span></div>
        <div className="domino-line" aria-label={lineText}>
          {game.line.length?game.line.map((placed,index)=><DominoTileView key={placed.tile.id+"-"+index} a={placed.a} b={placed.b}/>):<p>Escolha uma peça para abrir a partida.</p>}
        </div>
      </div>
      {game.winner===null?(
        <>
          {(!solo || game.turn===0) ? <><div className="domino-turn-call">{solo ? "Sua mão" : `Pessoa ${game.turn+1}, escolha uma peça da sua mão.`} · {pipCount(hand)} pontos</div>
          <div className="domino-hand" aria-label={solo ? "Sua mão" : `Mão da Pessoa ${game.turn+1}`}>
            {hand.map(tile=><button key={tile.id} type="button" className={"domino-hand-tile"+(game.selected===tile.id?" is-selected":"")} onClick={()=>setGame(current=>({...current,selected:current.selected===tile.id?null:tile.id}))} aria-pressed={game.selected===tile.id}>
              <DominoTileView a={tile.a} b={tile.b}/>
            </button>)}
          </div></> : <div className="domino-turn-call">Morados estão escolhendo uma peça em segredo…</div>}
          {(!solo || game.turn===0) && <><div className="domino-play-actions">
            <button type="button" className="primary-action" onClick={()=>place("left")} disabled={!game.selected||!canPlaceLeft}>Colocar à esquerda</button>
            <button type="button" className="primary-action" onClick={()=>place("right")} disabled={!game.selected||!canPlaceRight}>Colocar à direita</button>
          </div>
          <div className="domino-table-actions">
            <button type="button" className="inline-action" onClick={drawTile} disabled={canPlayAny||game.stock.length===0}><ShoppingCart/> Comprar peça ({game.stock.length})</button>
            <button type="button" className="inline-action" onClick={pass} disabled={canPlayAny||game.stock.length>0}>Passar</button>
          </div>
          {!canPlayAny&&game.stock.length>0&&<p className="domino-hint">Você não tem uma peça compatível. Compre uma peça para tentar jogar.</p>}
          {!canPlayAny&&game.stock.length===0&&<p className="domino-hint">Sem jogadas possíveis. Passe a vez; se a outra pessoa também não puder jogar, a mesa será bloqueada.</p>}</>}
        </>
      ):(
        <div className="domino-end-panel"><strong>{status}</strong><p>{game.reason}</p><button type="button" className="primary-action" onClick={restart}>Nova partida</button></div>
      )}
      <footer className="domino-footer"><span>Duplo-seis · {solo ? "Contra Morados" : "Compra, bloqueio e pontuação"}</span><button type="button" className="inline-action" onClick={restart}><RotateCcw/> Reiniciar</button></footer>
    </section>
  );
}

export function DominoTileView({a,b}:{a:number;b:number}){
  return <span className="domino-tile" aria-hidden="true"><span>{Array.from({length:a},(_,i)=><i key={"a"+i}/>)}</span><span className="domino-divider"/><span>{Array.from({length:b},(_,i)=><i key={"b"+i}/>)}</span></span>;
}
