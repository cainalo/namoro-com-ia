import { useEffect, useMemo, useState } from "react";
import { Anchor, RotateCcw, Shield, Target } from "lucide-react";

type FleetCell = string | null;
export type Fleet = FleetCell[];
export type Shot = "hit" | "miss" | null;
type Phase = "play" | "pass" | "finished";
export const SIZE=10;
export const shipSpecs=[{id:"porta-avioes",name:"Porta-aviões",length:5},{id:"encouracado",name:"Encouraçado",length:4},{id:"cruzador",name:"Cruzador",length:3},{id:"submarino",name:"Submarino",length:3},{id:"patrulha",name:"Patrulha",length:2}];
export const axis=["A","B","C","D","E","F","G","H","I","J"];

export function createFleet():Fleet {
  const board:Fleet=Array(SIZE*SIZE).fill(null);
  for(const ship of shipSpecs){
    let placed=false,tries=0;
    while(!placed&&tries<2000){
      tries++;
      const horizontal=Math.random()<0.5;
      const row=Math.floor(Math.random()*SIZE);
      const col=Math.floor(Math.random()*SIZE);
      if(horizontal?col+ship.length>SIZE:row+ship.length>SIZE)continue;
      const squares=Array.from({length:ship.length},(_,i)=>(row+(horizontal?0:i))*SIZE+col+(horizontal?i:0));
      if(squares.some(square=>board[square]!==null))continue;
      squares.forEach(square=>board[square]=ship.id);
      placed=true;
    }
    if(!placed)throw new Error("Não foi possível posicionar a frota.");
  }
  return board;
}
function newGame(){
  return {
    fleets:[createFleet(),createFleet()] as [Fleet,Fleet],
    shots:[[...Array(SIZE*SIZE)].map(()=>null),[...Array(SIZE*SIZE)].map(()=>null)] as [Shot[],Shot[]],
    current:0 as 0|1,
    phase:"play" as Phase,
    winner:null as number|null,
    lastShot:null as number|null,
    hitCount:[0,0] as [number,number],
    computerTurn:false,
  };
}
type NavalState=ReturnType<typeof newGame>;
export function shipSunk(fleet:Fleet,shots:Shot[],shipId:string){
  return fleet.every((cell,index)=>cell!==shipId||shots[index]==="hit");
}

export function BattleshipGame({ solo = false }: { solo?: boolean }){
  const [game,setGame]=useState<NavalState>(()=>newGame());
  const [error,setError]=useState("");
  const active=game.current;
  const enemy=active===0?1:0;
  const myFleet=game.fleets[active];
  const enemyFleet=game.fleets[enemy];
  const myIncoming=game.shots[enemy];
  const myShots=game.shots[active];
  const sunken=shipSpecs.filter(ship=>shipSunk(myFleet,myIncoming,ship.id));
  const enemySunken=shipSpecs.filter(ship=>shipSunk(enemyFleet,myShots,ship.id));
  const hitCount=game.hitCount[active];
  const fleetRows=Array.from({length:SIZE},(_,row)=>row);
  const sunkCount=enemySunken.length;

  useEffect(() => {
    if (!solo || !game.computerTurn || game.winner !== null) return;
    const timer = window.setTimeout(() => {
      const ownShots = game.shots[1];
      const available = ownShots.map((shot, square) => shot === null ? square : -1).filter((square) => square >= 0);
      if (!available.length) {
        setGame((current) => ({ ...current, computerTurn: false, phase: "finished", winner: current.hitCount[0] >= current.hitCount[1] ? 0 : 1 }));
        return;
      }
      const recentHits = ownShots.map((shot, square) => shot === "hit" ? square : -1).filter((square) => square >= 0);
      const adjacent = recentHits.flatMap((square) => {
        const row = Math.floor(square / SIZE), col = square % SIZE;
        return [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
          .filter(([r,c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE)
          .map(([r,c]) => r * SIZE + c)
          .filter((candidate) => ownShots[candidate] === null && available.includes(candidate));
      });
      const pool = adjacent.length ? adjacent : available;
      const square = pool[Math.floor(Math.random() * pool.length)];
      const hit = game.fleets[0][square] !== null;
      const nextShots = [game.shots[0].slice(), game.shots[1].slice()] as [Shot[], Shot[]];
      nextShots[1][square] = hit ? "hit" : "miss";
      const nextHits = [...game.hitCount] as [number, number];
      if (hit) nextHits[1] += 1;
      const defeated = shipSpecs.every((ship) => shipSunk(game.fleets[0], nextShots[1], ship.id));
      setGame((current) => ({
        ...current,
        shots: nextShots,
        hitCount: nextHits,
        lastShot: square,
        winner: defeated ? 1 : null,
        phase: defeated ? "finished" : "play",
        computerTurn: false,
      }));
    }, 680);
    return () => window.clearTimeout(timer);
  }, [solo, game.computerTurn, game.shots, game.fleets, game.hitCount, game.winner]);

  function fire(square:number){
    if(game.phase!=="play"||game.winner!==null||game.shots[active][square]!==null)return;
    const hit=enemyFleet[square]!==null;
    const nextShots=[game.shots[0].slice(),game.shots[1].slice()] as [Shot[],Shot[]];
    nextShots[active][square]=hit?"hit":"miss";
    const nextHits=[...game.hitCount] as [number,number];
    if(hit)nextHits[active]+=1;
    const allShipsSunk=shipSpecs.every(ship=>shipSunk(enemyFleet,nextShots[active],ship.id));
    setGame(current=>({
      ...current,
      shots:nextShots,
      hitCount:nextHits,
      lastShot:square,
      winner:allShipsSunk?active:null,
      phase:allShipsSunk?"finished":solo?"play":"pass",
      computerTurn:solo&&!allShipsSunk,
    }));
    setError("");
  }
  function passDevice(){
    if(game.phase!=="pass")return;
    setGame(current=>({...current,current:current.current===0?1:0,phase:"play",lastShot:null}));
  }
  function reset(){setGame(newGame());setError("");}
  const status=game.phase==="finished"?(solo?(game.winner===0?"Você venceu a Batalha Naval!":"Morados venceram a Batalha Naval!"):`Pessoa ${(game.winner??0)+1} venceu a Batalha Naval!`):solo&&game.computerTurn?"Morados estão atacando…":solo?"Escolha uma coordenada para disparar.":`Pessoa ${active+1}: escolha uma coordenada para disparar.`;

  if(game.phase==="pass"){
    return (
      <section className={"naval-game" + (solo ? " is-solo" : "")}>
        <div className="naval-pass-screen">
          <span className="naval-pass-mark"><Anchor aria-hidden="true"/></span>
          <p className="date-kicker">Fim da jogada</p>
          <h3>Passe o aparelho para a Pessoa {game.current===0?2:1}.</h3>
          <p>A jogada anterior ficou escondida. Quando a outra pessoa estiver pronta, toque para revelar apenas o próprio tabuleiro e continuar.</p>
          <button type="button" className="primary-action" onClick={passDevice}>Estou pronto para jogar</button>
        </div>
      </section>
    );
  }

  return (
    <section className={"naval-game" + (solo ? " is-solo" : "")}>
      <div className="naval-scorebar">
        <div className={active===0?"is-active":""}><span className="naval-player-token is-one"/>{solo ? "Você" : "Pessoa 1"} <strong>{game.hitCount[0]}</strong></div>
        <span className="naval-score-separator">×</span>
        <div className={active===1?"is-active":""}><span className="naval-player-token is-two"/>{solo ? "Morados" : "Pessoa 2"} <strong>{game.hitCount[1]}</strong></div>
      </div>
      <div className="naval-turn-banner">
        <Target aria-hidden="true"/>
        <div><strong>{status}</strong><small>Frota adversária afundada: {sunkCount}/5</small></div>
      </div>
      <div className="naval-section-heading"><h3>Mar de busca</h3><span>Suas coordenadas de ataque</span></div>
      <div className="naval-board-wrap">
        <div className="naval-axis naval-axis-top"><span/> {axis.map(x=><span key={x}>{x}</span>)}</div>
        <div className="naval-board">
          {fleetRows.map(row=>(
            <div className="naval-row" key={row}>
              <span className="naval-row-label">{row+1}</span>
              {Array.from({length:SIZE},(_,col)=>{
                const square=row*SIZE+col,shot=myShots[square];
                return <button key={col} type="button" className={"naval-cell"+(shot==="hit"?" is-hit":shot==="miss"?" is-miss":"")} onClick={()=>fire(square)} disabled={shot!==null||game.phase==="finished"||(solo&&game.computerTurn)} aria-label={`Disparo em ${axis[col]}${row+1}: ${shot==="hit"?"acerto":shot==="miss"?"água":"não disparado"}`}>
                  {shot==="hit"?"✦":shot==="miss"?"·":""}
                </button>;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="naval-fleet-status">
        <div><Shield aria-hidden="true"/><span>Sua frota</span></div>
        <div className="naval-fleet-dots">{shipSpecs.map(ship=>{
          const sunkHere=shipSunk(myFleet,myIncoming,ship.id);
          return <span key={ship.id} className={sunkHere?"is-sunk":""} title={ship.name}>{ship.id.slice(0,1).toUpperCase()}</span>;
        })}</div>
        <small>Navios restantes: {shipSpecs.length-sunken.length}/5</small>
      </div>
      <div className="naval-own-board">
        <details>
          <summary>Ver meu mapa de frota</summary>
          <div className="naval-board-wrap is-own">
            <div className="naval-axis naval-axis-top"><span/>{axis.map(x=><span key={x}>{x}</span>)}</div>
            <div className="naval-board">
              {fleetRows.map(row=><div className="naval-row" key={row}><span className="naval-row-label">{row+1}</span>{Array.from({length:SIZE},(_,col)=>{
                const square=row*SIZE+col,ship=myFleet[square],shot=myIncoming[square];
                return <span key={col} className={"naval-cell is-static"+(ship?" has-ship":"")+(shot==="hit"?" was-hit":shot==="miss"?" was-miss":"")}>{shot==="hit"?"✦":shot==="miss"?"·":ship?"▪":""}</span>;
              })}</div>)}
            </div>
          </div>
        </details>
      </div>
      <footer className="naval-footer"><span>{solo ? "Frotas ocultas · Contra Morados" : "Frotas ocultas · Mesmo aparelho"}</span><button type="button" className="inline-action" onClick={reset}><RotateCcw/> Nova partida</button></footer>
      {game.phase==="finished"&&<div className="naval-end-screen"><strong>{status}</strong><p>{enemySunken.length===5?"A frota adversária foi completamente afundada.":""}</p><button type="button" className="primary-action" onClick={reset}>Jogar novamente</button></div>}
      {error&&<p className="couple-game-error">{error}</p>}
    </section>
  );
}
