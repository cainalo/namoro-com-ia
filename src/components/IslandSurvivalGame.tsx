import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/components/OnlineGameHost";
import {
  Anchor, Droplets, Flame, HeartPulse, Leaf, Package, RotateCcw,
  Shield, Sun, TentTree, Trees, Waves, Wind,
} from "lucide-react";

type ActionId="forage"|"fish"|"wood"|"rain"|"shelter"|"signal"|"rest"|"treat";
type Action={id:ActionId;title:string;description:string;cost:string;disabled?:boolean};
type SurvivalState={
 day:number;player:1|2;phase:"action"|"handoff"|"night"|"won"|"lost";
 food:number;water:number;wood:number;medicine:number;signal:number;shelter:number;
 health:[number,number];morale:number;log:string[];ending:string;
};
const STORAGE="morados-island-survival-v1";
const initial:SurvivalState={day:1,player:1,phase:"action",food:3,water:3,wood:1,medicine:1,signal:0,shelter:0,health:[3,3],morale:3,log:[],ending:""};
const actionList:Action[]=[
{id:"forage",title:"Explorar a vegetação",description:"Procurar frutos, raízes e água doce entre as árvores.",cost:"Sem custo · risco baixo"},
{id:"fish",title:"Pescar na enseada",description:"Tentar conseguir alimento no mar raso.",cost:"Sem custo · exige tempo"},
{id:"wood",title:"Recolher madeira",description:"Buscar galhos secos para abrigo e sinalização.",cost:"Sem custo"},
{id:"rain",title:"Coletar água",description:"Filtrar água de chuva ou encontrar uma nascente.",cost:"Sem custo"},
{id:"shelter",title:"Reforçar o abrigo",description:"Construir uma proteção para a noite e as tempestades.",cost:"2 madeiras"},
{id:"signal",title:"Acender uma fogueira de sinal",description:"Criar uma coluna de fumaça visível do mar.",cost:"2 madeiras"},
{id:"rest",title:"Descansar e cuidar",description:"Recuperar o fôlego e manter o ânimo.",cost:"Sem custo"},
{id:"treat",title:"Tratar um ferimento",description:"Usar o kit de primeiros socorros.",cost:"1 remédio"},
];
function loadState():SurvivalState{try{const raw=localStorage.getItem(STORAGE);return raw?{...initial,...JSON.parse(raw)}:initial;}catch{return initial;}}
const limit=(value:number)=>Math.max(0,Math.min(9,value));
export function IslandSurvivalGame({ solo = false }: { solo?: boolean }){
 const [game,setGame,sync]=useGameState<SurvivalState>(loadState,{onlineInitial:initial});
 const [feedback,setFeedback]=useState("A tempestade passou. Vocês alcançaram uma pequena ilha. O resgate pode demorar alguns dias.");
 const [choice,setChoice]=useState<ActionId|null>(null);
 useEffect(()=>{if(!sync.online)localStorage.setItem(STORAGE,JSON.stringify(game));},[game,sync.online]);
 const totalHealth=game.health[0]+game.health[1];
 const dayLabel=["Chegada","Primeira noite","A tempestade","Maré baixa","Sinal no horizonte","Resgate"][game.day]??"Último dia";
 const actions=useMemo(()=>actionList.map(a=>({...a,disabled:a.id==="shelter"&&game.wood<2||a.id==="signal"&&game.wood<2||a.id==="treat"&&game.medicine<1||totalHealth>=6&&a.id==="treat"})),[game.wood,game.medicine,totalHealth]);
 const dayProgress=Math.min(100,((game.day-1)/5)*100);
 function log(text:string){setGame(g=>({...g,log:[text,...g.log].slice(0,8)}));}
 function resolveNight(state:SurvivalState):SurvivalState{
  let next={...state,health:[...state.health] as [number,number],day:state.day+1};
  let notes:string[]=[];
  next.food=limit(next.food-2);next.water=limit(next.water-2);
  if(state.food<2){next.health=next.health.map(x=>Math.max(0,x-1)) as [number,number];notes.push("A comida acabou; os dois perderam energia.");}
  if(state.water<2){next.health=next.health.map(x=>Math.max(0,x-1)) as [number,number];notes.push("A água foi insuficiente; os dois ficaram debilitados.");}
  if(state.day===2&&state.shelter<2){next.health=next.health.map(x=>Math.max(0,x-1)) as [number,number];notes.push("A tempestade atingiu o abrigo improvisado.");}
  if(state.day===3&&state.shelter===0){next.morale=Math.max(0,next.morale-1);notes.push("A noite fria sem abrigo abalou o ânimo.");}
  if(state.day===4){next.water=limit(next.water+1);notes.push("A chuva da madrugada encheu um recipiente.");}
  if(next.health.every(x=>x<=0)){next.phase="lost";next.ending="A ilha venceu. Vocês não conseguiram manter as forças até o resgate."; }
  else if(state.day>=5){next.phase="won";next.ending=state.signal>=3?"A fumaça foi vista de longe. Um barco de resgate se aproxima!":"Vocês sobreviveram até a janela de busca. O sinal foi fraco, mas a equipe costeira encontrou a ilha."; }
  else{next.phase="action";next.player=1;}
  next.log=[...notes,...next.log].slice(0,8);
  return next;
 }
 function applyAction(id:ActionId){
  if(game.phase!=="action")return;
  let next={...game,health:[...game.health] as [number,number],log:[...game.log]};
  const messages:Record<ActionId,string>={
   forage:"Vocês encontraram frutos e raízes na vegetação.",
   fish:"A pesca rendeu alimento fresco na enseada.",
   wood:"Galhos secos foram reunidos perto do acampamento.",
   rain:"Vocês conseguiram água para os cantis.",
   shelter:"O abrigo ficou mais firme e protege melhor do vento.",
   signal:"A fogueira levantou uma coluna de fumaça sobre a ilha.",
   rest:"Uma pausa trouxe um pouco de alívio.",
   treat:"O kit de primeiros socorros ajudou a tratar os ferimentos.",
  };
  if(id==="forage"){next.food=limit(next.food+2);if(game.day===2){next.health=next.health.map(x=>Math.max(0,x-1)) as [number,number];}}
  if(id==="fish"){next.food=limit(next.food+2);}
  if(id==="wood"){next.wood=limit(next.wood+2);}
  if(id==="rain"){next.water=limit(next.water+2);}
  if(id==="shelter"&&next.wood>=2){next.wood-=2;next.shelter=limit(next.shelter+1);}
  if(id==="signal"&&next.wood>=2){next.wood-=2;next.signal=limit(next.signal+2);}
  if(id==="rest"){next.health[game.player-1]=Math.min(3,next.health[game.player-1]+1);next.morale=limit(next.morale+1);}
  if(id==="treat"&&next.medicine>=1){next.medicine-=1;next.health[game.player-1]=Math.min(3,next.health[game.player-1]+2);}
  next.log=[`Dia ${game.day} · Pessoa ${game.player}: ${messages[id]}`,...next.log].slice(0,8);
  setGame({...next,phase:game.player===1?((solo||sync.online)?"action":"handoff"):"night",player:game.player===1?2:1});
  setFeedback(messages[id]);
  setChoice(null);
 }
 function continueTurn(){
  if(game.phase!=="handoff")return;
  const next={...game,phase:"action" as const};
  setGame(next);setFeedback("Agora é a vez da Pessoa 2. Escolham uma ação diferente ou reforcem o plano.");
 }
 function endDay(){
  const next=resolveNight(game);
  setGame(next);
  setFeedback(next.phase==="won"||next.phase==="lost"?next.ending:"A noite passou. Confiram os recursos antes de tomar a próxima decisão.");
 }
 function restart(){if(!sync.online)localStorage.removeItem(STORAGE);setGame(initial);setChoice(null);setFeedback("A tempestade passou. Vocês alcançaram uma pequena ilha. O resgate pode demorar alguns dias.");}
 return(
  <section className={"island-survival-game" + (solo ? " is-solo" : "")}>
   <div className="island-survival-hero">
    <div className="island-survival-kicker">{solo ? "MODO INDIVIDUAL · GESTÃO DA EQUIPE" : "SOBREVIVÊNCIA COOPERATIVA · 2 PESSOAS"}</div>
    <h2>Depois da tempestade</h2>
    <p>{solo ? "Você chegou a uma ilha desconhecida com uma pequena equipe. Administre os recursos, planeje duas ações por dia e conduza todos até o resgate." : "Vocês chegaram a uma ilha desconhecida. Dividam tarefas, administrem os recursos e mantenham o acampamento até o resgate."}</p>
    <div className="island-survival-scene"><div className="island-sun"><Sun/></div><div className="island-islet"/><div className="island-water"/></div>
    <div className="island-survival-day"><span> DIA {Math.min(game.day,5)} DE 5 · {dayLabel.toUpperCase()}</span><strong>{Math.round(dayProgress)}%</strong></div>
    <div className="island-survival-progress"><span style={{width:dayProgress+"%"}}/></div>
   </div>
   <div className="island-resource-grid">
    <Resource icon={Leaf} label="Comida" value={game.food}/>
    <Resource icon={Droplets} label="Água" value={game.water}/>
    <Resource icon={Trees} label="Madeira" value={game.wood}/>
    <Resource icon={Package} label="Remédios" value={game.medicine}/>
    <Resource icon={Flame} label="Sinal" value={game.signal}/>
    <Resource icon={TentTree} label="Abrigo" value={game.shelter}/>
   </div>
   <div className="island-health-row">
    {[0,1].map(i=><div key={i}><span>Pessoa {i+1}</span><div>{Array.from({length:3},(_,n)=><HeartPulse key={n} className={game.health[i]>n?"is-alive":"is-empty"}/>)}</div></div>)}
    <span>Ânimo coletivo · {game.morale}/9</span>
   </div>
   {!solo && game.phase==="handoff"&&<div className="island-handoff"><span><Wind/></span><p className="date-kicker">Troca de turno</p><h3>Passe o aparelho para a Pessoa 2.</h3><p>A ação da Pessoa 1 foi registrada. A próxima decisão agora é da outra pessoa.</p><button type="button" onClick={continueTurn}>Estou pronto</button></div>}
   {game.phase==="night"&&<div className="island-night-panel"><span><Wind/></span><p className="date-kicker">FIM DO DIA {game.day}</p><h3>Preparados para passar a noite?</h3><p>O consumo de água e comida será calculado, e o clima pode afetar a equipe e o abrigo.</p><button type="button" onClick={endDay}>Encerrar o dia e passar a noite</button></div>}
   {game.phase==="action"&&<div className="island-actions-panel"><div className="island-actions-heading"><span className="date-kicker">{solo ? `SUA DECISÃO · AÇÃO ${game.player} DE 2` : `DECISÃO DO DIA · PESSOA ${game.player}`}</span><h3>{solo ? (game.player===1?"Qual será sua primeira ação?":"Escolha sua segunda ação do dia.") : "O que vocês vão fazer agora?"}</h3><p>{solo ? "Você controla as duas decisões da equipe. Pense no que será necessário para atravessar a noite." : "Cada pessoa realiza uma ação por dia. Escolham considerando o que será necessário à noite."}</p></div><div className="island-action-grid">{actions.map(action=><button type="button" key={action.id} className={choice===action.id?"is-selected":""} disabled={action.disabled} onClick={()=>setChoice(action.id)}><ActionIcon id={action.id}/><span><strong>{action.title}</strong><small>{action.description}</small><em>{action.cost}</em></span></button>)}</div><button type="button" className="island-confirm-action" disabled={!choice} onClick={()=>choice&&applyAction(choice)}>Confirmar ação</button></div>}
   {(game.phase==="won"||game.phase==="lost")&&<div className={"island-ending "+(game.phase==="won"?"is-won":"is-lost")}><Anchor/><span className="date-kicker">{game.phase==="won"?"RESGATE CONCLUÍDO":"FIM DA EXPEDIÇÃO"}</span><h3>{solo ? (game.phase==="won"?"Você conduziu o resgate!":"A expedição terminou.") : (game.phase==="won"?"Vocês conseguiram!":"A expedição terminou.")}</h3><p>{game.ending}</p><div><strong>Recursos finais</strong><span>Comida {game.food} · Água {game.water} · Sinal {game.signal}</span></div><button type="button" onClick={restart}>Jogar novamente</button></div>}
   <div className="island-feedback"><Leaf/><p>{feedback}</p></div>
   <details className="island-log"><summary>Diário da expedição</summary><ol>{game.log.map((line,i)=><li key={i}>{line}</li>)}</ol></details>
   <footer className="island-footer"><span>{solo ? "Você controla as decisões dos dois sobreviventes." : "As decisões alteram os recursos e a condição da equipe."}</span><button type="button" onClick={restart}><RotateCcw/> Reiniciar</button></footer>
  </section>
 );
}
function Resource({icon:Icon,label,value}:{icon:typeof Droplets;label:string;value:number}){
 return <div className="island-resource"><Icon/><span>{label}</span><strong>{value}</strong></div>;
}
function AppleIcon(props:React.ComponentProps<typeof Leaf>){return <Leaf {...props}/>;}
function ActionIcon({id}:{id:ActionId}){
 const Icon=id==="forage"?Leaf:id==="fish"?Waves:id==="wood"?Trees:id==="rain"?Droplets:id==="shelter"?TentTree:id==="signal"?Flame:id==="rest"?Sun:HeartPulse;
 return <span className={"island-action-icon action-"+id}><Icon/></span>;
}
