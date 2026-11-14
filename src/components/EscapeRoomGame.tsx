import { useEffect, useState } from "react";
import { useGameState } from "@/components/OnlineGameHost";
import { Archive, Clock3, DoorOpen, KeyRound, Lightbulb, LockKeyhole, RotateCcw, Search, Unlock } from "lucide-react";

type RoomObject="clock"|"books"|"portrait"|"desk"|"safe";
type RoomProgress={inspected:RoomObject[];key:boolean;gear:boolean;note:boolean;code:string;opened:boolean};
const STORAGE="morados-escape-clock-room-v1";
const initial:RoomProgress={inspected:[],key:false,gear:false,note:false,code:"",opened:false};
const objects:Array<{id:RoomObject;name:string;icon:typeof Clock3;hint:string}>=[
{id:"clock",name:"Relógio de parede",icon:Clock3,hint:"Os ponteiros parecem ter sido ajustados à mão."},
{id:"books",name:"Estante antiga",icon:Archive,hint:"Quatro livros têm marcas de uso muito mais recentes que os outros."},
{id:"portrait",name:"Retrato do relojoeiro",icon:Search,hint:"A moldura está ligeiramente afastada da parede."},
{id:"desk",name:"Escrivaninha",icon:KeyRound,hint:"Há gavetas com fechaduras diferentes e ferramentas sobre a mesa."},
{id:"safe",name:"Cofre embutido",icon:LockKeyhole,hint:"O teclado aceita quatro algarismos. Uma engrenagem está faltando."},
];

export function EscapeRoomGame(){
 const [progress,setProgress,sync]=useGameState<RoomProgress>(()=>{try{const raw=localStorage.getItem(STORAGE);return raw?{...initial,...JSON.parse(raw)}:initial;}catch{return initial;}});
 const [active,setActive]=useState<RoomObject|null>(null);
 const [message,setMessage]=useState("A porta principal se fechou atrás de vocês. Encontrem o mecanismo que libera a saída.");
 const [wrongAttempts,setWrongAttempts]=useState(0);
 useEffect(()=>{if(!sync.online)localStorage.setItem(STORAGE,JSON.stringify(progress));},[progress,sync.online]);
 const doneCount=Number(progress.key)+Number(progress.gear)+Number(progress.note);
 const object=objects.find(item=>item.id===active);
 function inspect(id:RoomObject){
  setActive(id);
  setProgress(current=>({...current,inspected:current.inspected.includes(id)?current.inspected:[...current.inspected,id]}));
  if(id==="portrait"&&!progress.key){
   setMessage("Atrás do retrato há um pequeno compartimento. Dentro dele está uma chave de bronze.");
   setProgress(current=>({...current,key:true,inspected:current.inspected.includes(id)?current.inspected:[...current.inspected,id]}));
  }else if(id==="books"&&!progress.note){
   setMessage("As lombadas formam uma sequência: 2, 1, 4, 7. Um bilhete dobrado cai de dentro do último livro.");
   setProgress(current=>({...current,note:true,inspected:current.inspected.includes(id)?current.inspected:[...current.inspected,id]}));
  }else if(id==="desk"&&!progress.gear){
   setMessage("Uma pequena engrenagem está presa sob a gaveta. A chave de bronze permite soltá-la.");
   if(progress.key)setProgress(current=>({...current,gear:true,inspected:current.inspected.includes(id)?current.inspected:[...current.inspected,id]}));
   else setMessage("A gaveta está presa. Talvez uma chave pequena possa ajudar.");
  }else if(id==="clock"){
   setMessage("O relógio parou às 21h47. Os ponteiros ainda estão pressionados contra o mostrador.");
  }else if(id==="safe"){
   setMessage(progress.key&&progress.gear&&progress.note?"A fechadura parece pronta. Digitem o código encontrado nas pistas.":"O cofre precisa de uma chave, uma engrenagem e um código de quatro dígitos.");
  }
 }
 function updateCode(value:string){setProgress(current=>({...current,code:value.replace(/\D/g,"").slice(0,4)}));}
 function unlock(){
  if(progress.code!=="2147"){setWrongAttempts(value=>value+1);setMessage("O mecanismo não cede. Reexaminem as pistas e tentem novamente.");return;}
  if(!progress.key||!progress.gear||!progress.note){setMessage("Ainda falta preparar o mecanismo do cofre.");return;}
  setProgress(current=>({...current,opened:true}));
  setMessage("O cofre se abre. Dentro, uma chave longa destrava a porta da sala. Vocês escaparam!");
 }
 function reset(){localStorage.removeItem(STORAGE);setProgress(initial);setActive(null);setMessage("A porta principal se fechou atrás de vocês. Encontrem o mecanismo que libera a saída.");setWrongAttempts(0);}
 return(
  <section className="escape-room-game">
   <div className="escape-room-hero">
    <div><span className="escape-room-kicker">ESCAPE ROOM · SALA 01</span><h2>A sala do relógio</h2><p>Uma sala antiga, cinco objetos suspeitos e uma única saída. Trabalhem juntos para descobrir a combinação.</p></div>
    <div className="escape-room-door"><DoorOpen aria-hidden="true"/><span>{progress.opened?"SAÍDA ABERTA":"PORTA TRANCADA"}</span></div>
   </div>
   <div className="escape-room-scene" role="group" aria-label="Objetos da sala. Selecione um para investigar.">
    <div className="escape-room-scene-light"/>
    {objects.map(item=>{const Icon=item.icon;const inspected=progress.inspected.includes(item.id);return(
     <button type="button" key={item.id} className={"escape-room-hotspot hotspot-"+item.id+(active===item.id?" is-active":"")+(inspected?" is-inspected":"")} onClick={()=>inspect(item.id)} aria-pressed={active===item.id}>
      <Icon aria-hidden="true"/><span>{item.name}</span>{inspected&&<i>✓</i>}
     </button>
    );})}
    <span className="escape-room-scene-caption">TOQUEM NOS OBJETOS PARA EXAMINAR</span>
   </div>
   <div className="escape-room-progress">
    <div><span>Inventário</span><strong>{doneCount}/3 itens encontrados</strong></div>
    <div className="escape-room-inventory">
     <span className={progress.key?"is-found":""}><KeyRound/>Chave</span>
     <span className={progress.gear?"is-found":""}><div className="escape-room-gear">⚙</div>Engrenagem</span>
     <span className={progress.note?"is-found":""}><Archive/>Bilhete</span>
    </div>
   </div>
   {object&&<article className="escape-room-object-panel">
    <span className="escape-room-kicker">OBJETO EXAMINADO</span><h3>{object.name}</h3><p>{object.hint}</p>
    {active==="safe"&&!progress.opened&&<div className="escape-room-lock">
     <label htmlFor="escape-code">Código de quatro dígitos</label><input id="escape-code" inputMode="numeric" autoComplete="off" maxLength={4} value={progress.code} onChange={event=>updateCode(event.target.value)} placeholder="••••"/>
     <button type="button" onClick={unlock} disabled={progress.code.length!==4}><Unlock/> Tentar abrir cofre</button>
    </div>}
    {active==="desk"&&progress.key&&!progress.gear&&<button type="button" className="escape-room-action" onClick={()=>{setProgress(current=>({...current,gear:true}));setMessage("Você removeu a engrenagem de latão da gaveta.");}}>Retirar engrenagem</button>}
   </article>}
   <div className="escape-room-narration" role="status" aria-live="polite"><Lightbulb aria-hidden="true"/><p>{message}</p></div>
   {progress.opened&&<div className="escape-room-complete"><Unlock/><h3>Vocês escaparam!</h3><p>O mecanismo foi reconstruído e a porta abriu. A primeira sala está concluída.</p><button type="button" onClick={reset}>Jogar novamente</button></div>}
   <footer className="escape-room-footer"><span>{wrongAttempts} tentativas incorretas</span><button type="button" onClick={reset}><RotateCcw/> Reiniciar sala</button></footer>
  </section>
 );
}
