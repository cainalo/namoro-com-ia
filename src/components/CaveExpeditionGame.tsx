import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/components/OnlineGameHost";
import { AudioLines, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Heart, KeyRound, Music2, Pickaxe, RotateCcw, Skull, Sparkles, Swords, Trophy } from "lucide-react";

type Cell = "wall" | "floor" | "start" | "gate" | "enemy" | "relic" | "key" | "potion";
type Point = { x: number; y: number };
type CaveState = { player: Point; hp: number; maxHp: number; key: boolean; relic: boolean; bossHp: number; revealed: string[]; turn: 0 | 1; moves: number; status: "playing" | "won" | "lost"; log: string[] };
const MAP: Cell[][] = [
 ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
 ["wall","start","floor","floor","wall","floor","floor","floor","gate","floor","wall"],
 ["wall","floor","wall","floor","wall","floor","wall","floor","wall","floor","wall"],
 ["wall","floor","wall","floor","floor","floor","wall","floor","floor","floor","wall"],
 ["wall","floor","floor","floor","enemy","floor","floor","floor","wall","floor","wall"],
 ["wall","wall","wall","floor","wall","floor","wall","wall","floor","floor","wall"],
 ["wall","floor","floor","floor","wall","floor","floor","floor","relic","floor","wall"],
 ["wall","floor","floor","floor","floor","floor","key","floor","potion","floor","wall"],
 ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
];
const keyOf = (p: Point) => p.x + "," + p.y;
const initial = (): CaveState => ({ player:{x:1,y:1},hp:6,maxHp:6,key:false,relic:false,bossHp:4,revealed:["1,1","2,1","1,2"],turn:0,moves:0,status:"playing",log:["A entrada desabou atrás de vocês. A relíquia está no coração da caverna."] });
const TILE: Record<Cell,{icon:string;label:string}> = { wall:{icon:"▩",label:"Rocha"},floor:{icon:"",label:"Caminho"},start:{icon:"⌂",label:"Entrada"},gate:{icon:"✦",label:"Portal antigo"},enemy:{icon:"☠",label:"Guardião"},relic:{icon:"◆",label:"Relíquia"},key:{icon:"⚿",label:"Chave"},potion:{icon:"✚",label:"Poção"} };
function sound(frequency:number,duration=0.12) {
 try { const ctx=new AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.type="triangle"; osc.frequency.value=frequency; gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.06,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration); osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>void ctx.close(); } catch { /* áudio opcional */ }
}
export function CaveExpeditionGame({solo=false}:{solo?:boolean}) {
 const [game,setGame,sync]=useGameState<CaveState>(initial,{onlineInitial:initial(),turnSeat:()=>null,outcome:s=>s.status==="won"?{kind:"win",winnerSeat:null}:s.status==="lost"?{kind:"loss",winnerSeat:null}:null});
 const [music,setMusic]=useState(false); const [soundOn,setSoundOn]=useState(true); const [message,setMessage]=useState("Explore as ruínas, encontre a chave e recupere a relíquia.");
 const ambientRef=useRef<AudioContext|null>(null); const oscillatorsRef=useRef<OscillatorNode[]>([]);
 useEffect(()=>()=>{oscillatorsRef.current.forEach(o=>{try{o.stop()}catch{}});void ambientRef.current?.close()},[]);
 const emit=(f:number,d=.12)=>{if(soundOn)sound(f,d)};
 function toggleMusic(){
  if(music){oscillatorsRef.current.forEach(o=>{try{o.stop()}catch{}});oscillatorsRef.current=[];void ambientRef.current?.close();ambientRef.current=null;setMusic(false);return}
  try{const ctx=new AudioContext();ambientRef.current=ctx;[82.4,123.5,164.8].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i===0?"sine":"triangle";o.frequency.value=f;g.gain.value=i===0?.018:.006;o.connect(g);g.connect(ctx.destination);o.start();oscillatorsRef.current.push(o)});setMusic(true)}catch{setMessage("O áudio não está disponível neste aparelho.")}
 }
 function act(dx:number,dy:number){
  if(game.status!=="playing")return;
  const next={x:game.player.x+dx,y:game.player.y+dy};const cell=MAP[next.y]?.[next.x];
  if(!cell||cell==="wall"){emit(95,.07);setMessage("A passagem está bloqueada por rocha.");return}
  if(cell==="gate"&&(!game.key||!game.relic)){setMessage("O portal exige a chave antiga e a relíquia.");emit(180);return}
  const revealed=[...new Set([...game.revealed,keyOf(next),keyOf({x:next.x+1,y:next.y}),keyOf({x:next.x-1,y:next.y}),keyOf({x:next.x,y:next.y+1}),keyOf({x:next.x,y:next.y-1})])];
  const n:CaveState={...game,player:next,moves:game.moves+1,revealed};
  if(cell==="key"){n.key=true;setMessage("Chave antiga encontrada. Ela abre o portal da câmara.");n.log=["Vocês encontraram uma chave antiga.",...game.log];emit(620)}
  else if(cell==="relic"){n.relic=true;setMessage("A relíquia foi recuperada. O guardião despertou!");n.log=["A relíquia despertou o guardião da caverna.",...game.log];emit(760)}
  else if(cell==="potion"){n.hp=Math.min(n.maxHp,n.hp+3);setMessage("Poção encontrada: +3 de vida.");n.log=["Uma poção restaurou parte da vida.",...game.log];emit(520)}
  else if(cell==="enemy"){n.hp=Math.max(0,n.hp-1);n.bossHp=Math.max(0,n.bossHp-2);setMessage(n.bossHp===0?"O guardião foi derrotado! O caminho está livre.":"Golpe contra o guardião! Ele também feriu vocês.");n.log=["Vocês enfrentaram o guardião.",...game.log];emit(n.bossHp===0?880:150,.2);if(n.hp===0)n.status="lost"}
  else if(cell==="gate"){n.status="won";setMessage("A relíquia foi devolvida ao altar. Vocês escaparam!");emit(940,.35)}
  else{setMessage("Passagem explorada.");emit(240,.05)}
  n.turn=game.turn===0?1:0;setGame(n);
 }
 function attack(){
  if(game.status!=="playing"||game.bossHp<=0)return;
  const adjacent=Math.abs(game.player.x-4)+Math.abs(game.player.y-4)<=1;
  if(!adjacent){setMessage("O guardião está longe. Aproxime-se antes de atacar.");return}
  const hp=Math.max(0,game.bossHp-2),playerHp=Math.max(0,game.hp-1);
  const n:CaveState={...game,bossHp:hp,hp:playerHp,moves:game.moves+1,turn:game.turn===0?1:0,log:[hp===0?"O guardião foi derrotado.":"Vocês atingiram o guardião.",...game.log]};
  if(playerHp===0)n.status="lost";setGame(n);setMessage(hp===0?"Vitória! O guardião caiu. Sigam para o portal.":"Ataque certeiro, mas o guardião revidou.");emit(hp===0?900:130,.2);
 }
 function restart(){setGame(initial());setMessage("Uma nova expedição começou.")}
 const canAttack=Math.abs(game.player.x-4)+Math.abs(game.player.y-4)<=1&&game.bossHp>0;
 const won=game.status==="won",lost=game.status==="lost";
 return <section className="cave-expedition" aria-label="Expedição às ruínas">
  <header className="cave-hud"><div className="cave-brand"><span><Pickaxe/></span><div><small>AVENTURA COOPERATIVA</small><h2>As Ruínas de Morados</h2></div></div><div className="cave-hud-actions"><button type="button" aria-label={music?"Desligar música":"Ligar música"} aria-pressed={music} onClick={toggleMusic}><Music2/></button><button type="button" aria-label={soundOn?"Desligar efeitos":"Ligar efeitos"} aria-pressed={soundOn} onClick={()=>setSoundOn(v=>!v)}><AudioLines/></button></div></header>
  <div className="cave-status-strip"><span><Heart/> {game.hp}/{game.maxHp}</span><span><KeyRound/> {game.key?"Chave obtida":"Chave pendente"}</span><span><Sparkles/> {game.relic?"Relíquia obtida":"Relíquia pendente"}</span><span><Skull/> Guardião {game.bossHp}/4</span></div>
  <div className="cave-stage"><div className="cave-scene-top"><span>SETOR {game.player.y+1} · CÂMARA {game.player.x+1}</span><span>{sync.online?"COOPERATIVO ONLINE":solo?"EXPEDIÇÃO SOLO":"COOPERATIVO LOCAL"}</span></div>
   <div className="cave-map" role="grid" aria-label="Mapa explorável da caverna">{MAP.map((row,y)=>row.map((cell,x)=>{const p={x,y},visible=game.revealed.includes(keyOf(p))||Math.abs(game.player.x-x)+Math.abs(game.player.y-y)<=1,isPlayer=game.player.x===x&&game.player.y===y,hidden=!visible&&cell!=="wall";return <div key={keyOf(p)} role="gridcell" aria-label={visible?TILE[cell].label:"Área desconhecida"} className={["cave-tile","is-"+cell,isPlayer?"is-player":"",hidden?"is-hidden":""].filter(Boolean).join(" ")}>{isPlayer?<span className="cave-hero">♟</span>:visible?cell==="enemy"&&game.bossHp===0?"✕":TILE[cell].icon:""}</div>}))}</div>
   <div className="cave-scene-caption"><span>✦</span><p>{message}</p></div>
  </div>
  <div className="cave-controls"><div className="cave-dpad" aria-label="Controles de movimento"><button type="button" onClick={()=>act(0,-1)} aria-label="Mover para cima"><ChevronUp/></button><button type="button" onClick={()=>act(-1,0)} aria-label="Mover para esquerda"><ChevronLeft/></button><button type="button" onClick={()=>act(0,1)} aria-label="Mover para baixo"><ChevronDown/></button><button type="button" onClick={()=>act(1,0)} aria-label="Mover para direita"><ChevronRight/></button></div><button type="button" className="cave-attack" onClick={attack} disabled={!canAttack}><Swords/> Atacar guardião</button></div>
  <footer className="cave-footer"><span>Movimentos: {game.moves} · {sync.online?"Progresso compartilhado": "Exploração por turnos"}</span><button type="button" onClick={restart}><RotateCcw/> Reiniciar</button></footer>
  {(won||lost)&&<div className={"cave-ending "+(won?"is-won":"is-lost")} role="dialog" aria-modal="true"><div className="cave-ending-art">{won?<Trophy/>:<Skull/>}</div><span>{won?"EXPEDIÇÃO CONCLUÍDA":"EXPEDIÇÃO ENCERRADA"}</span><h2>{won?"As ruínas foram conquistadas!":"A caverna venceu desta vez."}</h2><p>{won?"Vocês recuperaram a relíquia e abriram o portal antigo. A aventura termina, mas as ruínas guardam outros segredos.":"A equipe perdeu toda a energia antes de concluir a missão. Reorganizem a estratégia e tentem novamente."}</p><div className="cave-ending-stats"><strong>{game.moves} movimentos</strong><strong>{game.hp} vida restante</strong><strong>{game.relic?"Relíquia recuperada":"Relíquia perdida"}</strong></div><button type="button" onClick={restart}><RotateCcw/> Jogar novamente</button></div>}
 </section>;
}
