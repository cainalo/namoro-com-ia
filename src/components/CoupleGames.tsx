import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  AudioLines,
  Brain,
  CalendarHeart,
  Crown,
  Gamepad2,
  Play,
  Search,
  LockKeyhole,
  MoreVertical,
  Shield,
  Sparkles,
  Swords,
  Target,
  Users,
} from "lucide-react";
import { CheckersGame } from "@/components/CheckersGame";
import { ConnectFourGame } from "@/components/ConnectFourGame";
import { CoupleDailyChallenge } from "@/components/CoupleDailyChallenge";
import { CoupleGame } from "@/components/CoupleGame";
import { CoupleInvestigationGame } from "@/components/CoupleInvestigationGame";
import { CoupleInvestigationTrainGame } from "@/components/CoupleInvestigationTrainGame";
import { ChessGame } from "@/components/ChessGame";
import { BattleshipGame } from "@/components/BattleshipGame";
import { DominoGame } from "@/components/DominoGame";
import { TrucoGame } from "@/components/TrucoGame";
import { QuizGame } from "@/components/QuizGame";
import { EscapeRoomGame } from "@/components/EscapeRoomGame";
import { IslandSurvivalGame } from "@/components/IslandSurvivalGame";
import "./GameCover.css";
import { CaveExpeditionGame } from "@/components/CaveExpeditionGame";
import { InlineMenu } from "@/components/InlineMenu";
import { GameAudioProvider, GameAudioToggle, useGameAudio } from "@/components/GameExperience";
import { OnlineGameHost } from "@/components/OnlineGameHost";
import { OnlineBattleshipGame } from "@/components/OnlineBattleshipGame";
import { OnlineDominoGame } from "@/components/OnlineDominoGame";
import { OnlineTrucoGame } from "@/components/OnlineTrucoGame";
import { createGameInvitation, onlineGameInvitationError, type OnlineGameLaunch, type OnlineInviteMode } from "@/lib/game-invitations";
import type { SecondaryPageSection } from "@/components/SecondaryPageChrome";
import {
  LocalConnectFourGame,
  LocalDailyChallengeGame,
  LocalThisOrThatGame,
} from "@/components/LocalCoupleGames";

type GameId = "connect-four" | "checkers" | "this-or-that" | "daily-challenge" | "investigation" | "investigation-train" | "chess" | "battleship" | "domino" | "truco" | "quiz" | "escape-room" | "island-survival" | "cave-expedition";
type GameMode = "solo" | "local" | "online" | null;

const catalogue: Array<{
  id: GameId;
  name: string;
  category: string;
  description: string;
  players: string;
  icon: typeof Gamepad2;
  tone: string;
  new?: boolean;
}> = [
  {
    id: "connect-four",
    name: "Lig 4",
    category: "Estratégia",
    description: "Conecte quatro peças antes da outra pessoa. Planeje, bloqueie e mude de estratégia.",
    players: "2 pessoas",
    icon: Target,
    tone: "petrol",
  },
  {
    id: "checkers",
    name: "Damas brasileiras",
    category: "Estratégia",
    description: "Capturas obrigatórias, sequências, damas voadoras e partidas completas.",
    players: "2 pessoas",
    icon: Crown,
    tone: "terracotta",
  },
  {
    id: "this-or-that",
    name: "Isto ou aquilo?",
    category: "Preferências",
    description: "Respondam separadamente e descubram quantas escolhas combinam.",
    players: "2 pessoas",
    icon: Brain,
    tone: "plum",
  },
  {
    id: "daily-challenge",
    name: "Desafio do dia",
    category: "Cooperação",
    description: "Uma missão nova para fazer em conjunto, com conclusão individual.",
    players: "2 pessoas",
    icon: CalendarHeart,
    tone: "olive",
  },
  {
    id: "investigation",
    name: "A Hospedagem dos Ausentes",
    category: "Investigação policial",
    description: "Um hotel fechado esconde um quarto que não consta na planta. Leiam a história e abram documentos, fotografias e gravações.",
    players: "Cooperativo · 1–2",
    icon: Search,
    tone: "noir",
    new: true,
  },
  {
    id: "investigation-train",
    name: "O Último Trem de Santa Íria",
    category: "Investigação policial",
    description: "Uma linha cancelada volta a aparecer no painel. Sigam os capítulos e abram os materiais de um caso cheio de desaparecimentos.",
    players: "Cooperativo · 1–2",
    icon: Search,
    tone: "noir",
    new: true,
  },
  { id: "chess", name: "Xadrez", category: "Estratégia", description: "Partidas clássicas com movimentos legais, xeque, roque, en passant e histórico.", players: "2 pessoas", icon: Crown, tone: "plum" },
  { id: "battleship", name: "Batalha Naval", category: "Estratégia", description: "Posicionem frotas secretas e encontrem os navios da outra pessoa.", players: "2 pessoas", icon: Target, tone: "petrol" },
  { id: "domino", name: "Dominó", category: "Estratégia", description: "Joguem, comprem peças, bloqueiem a mesa e somem os pontos.", players: "2 pessoas", icon: Gamepad2, tone: "olive" },
  { id: "truco", name: "Truco Paulista", category: "Cartas", description: "Vira, manilhas e blefe. Aumentem a aposta até doze pontos.", players: "2 pessoas", icon: Swords, tone: "terracotta" },
  { id: "quiz", name: "Quiz dos dois", category: "Conhecimento", description: "Perguntas por categoria, tempo limitado e placar alternado.", players: "2 pessoas", icon: Brain, tone: "plum" },
  { id: "escape-room", name: "A sala do relógio", category: "Escape room", description: "Investiguem uma sala, encontrem objetos e descubram o código para escapar.", players: "Cooperativo · 1–2", icon: LockKeyhole, tone: "noir", new: true },
  { id: "island-survival", name: "Depois da tempestade", category: "Sobrevivência", description: "Uma expedição naufraga numa ilha que parece conhecer os sobreviventes. Cada capítulo traz escolhas, recursos, desafios e segredos.", players: "Cooperativo · 1–2", icon: Shield, tone: "olive", new: true },
  { id: "cave-expedition", name: "As Ruínas de Morados", category: "Aventura 2D", description: "Explore câmaras esquecidas, enfrente guardiões, encontre relíquias e escape em uma aventura cooperativa.", players: "Cooperativo · 1–2", icon: Swords, tone: "noir", new: true },
];

const launchInfo:Record<GameId,{eyebrow:string;tagline:string;story:string;goal:string;steps:string[];chips:string[]}> = {
"connect-four":{eyebrow:"ARENA DE ESTRATÉGIA",tagline:"Quatro peças. Uma jogada decisiva.",story:"Uma arena de raciocínio rápido em que cada coluna muda o rumo da disputa. Ataque, antecipe bloqueios e monte sua sequência.",goal:"Conectar quatro peças da sua cor antes do adversário.",steps:["Escolha uma coluna para soltar sua peça.","Observe ameaças e bloqueie sequências.","No modo individual, enfrente o Morados."],chips:["Partidas rápidas","Estratégia","Duelo online"]},
"checkers":{eyebrow:"CAMPO DE BATALHA",tagline:"Domine o tabuleiro. Controle o ritmo.",story:"Uma disputa tática em que cada peça importa. Prepare capturas em cadeia, proteja suas fileiras e transforme peões em damas.",goal:"Capturar ou bloquear todas as peças adversárias.",steps:["Capturas são obrigatórias quando disponíveis.","Planeje sequências e proteja suas peças.","Chegue à última fileira para virar dama."],chips:["Capturas em cadeia","Damas voadoras","Duelo"]},
"this-or-that":{eyebrow:"JOGO DE CONEXÃO",tagline:"Descubra o quanto vocês combinam.",story:"Uma sequência de escolhas revela gostos, diferenças inesperadas e pequenas histórias. Não existe resposta certa: o desafio é descobrir como cada pessoa pensa.",goal:"Responder às escolhas e comparar preferências.",steps:["Leia as duas opções antes de escolher.","No modo local, cada pessoa responde na sua vez.","No online, as respostas são sincronizadas."],chips:["Perguntas variadas","Escolhas individuais","Compatibilidade"]},
"daily-challenge":{eyebrow:"MISSÃO COMPARTILHADA",tagline:"Uma missão diferente para hoje.",story:"Um desafio cooperativo para sair da rotina, criar uma lembrança e concluir uma pequena missão em conjunto.",goal:"Concluir a proposta do dia e registrar a participação.",steps:["Leiam a missão completa.","Combinem como realizar o desafio.","Marquem a conclusão depois de participar."],chips:["Missões rotativas","Progresso conjunto","Conquistas"]},
"investigation":{eyebrow:"ROMANCE POLICIAL · CASO 001",tagline:"Há quartos que continuam ocupados depois de fechados.",story:"O Hotel Orfeu encerrou as atividades há dezenove anos. Durante a demolição, uma parede revela um quarto mobiliado, um telefone ativo e um homem que não aparece nos registros oficiais. Jornais, fotografias, plantas e gravações reconstroem o caso.",goal:"Acompanhar a história até o relatório final, abrindo os materiais de arquivo e observando como cada revelação muda o que parecia ter acontecido.",steps:["Leiam os capítulos como uma história policial.","Abram as manchetes, fotografias, documentos e depoimentos que aparecem nas páginas.","Sigam até o relatório final: não é necessário acusar ninguém nem acertar um enigma."],chips:["Romance policial","Livro de materiais pop-up","Reviravoltas"]},
"investigation-train":{eyebrow:"ROMANCE POLICIAL · CASO 002",tagline:"O trem chegou. Nenhum passageiro desceu.",story:"Uma linha ferroviária cancelada há vinte e três anos reaparece no painel da estação. Uma mala surge na plataforma, sete nomes voltam a circular e um funcionário desaparece. Notícias antigas, bilhetes, gravações e fotografias acompanham a narrativa.",goal:"Ler o caso como um romance interativo, consultando os materiais quando eles surgirem e acompanhando as reviravoltas até o encerramento.",steps:["Acompanhem a narrativa capítulo por capítulo.","Abram os recortes de jornal, os objetos, os áudios e os depoimentos.","Não existe prova para acertar nem acusação obrigatória: a própria história revela o que foi possível descobrir."],chips:["Suspense ferroviário","Materiais de arquivo","Mistério e reviravoltas"]},
"chess":{eyebrow:"ARENA DE XADREZ",tagline:"Pense adiante. Cada movimento importa.",story:"Uma arena de madeira e peças em disputa. Planeje aberturas, proteja seu rei e construa combinações. O tabuleiro é o centro da experiência.",goal:"Dar xeque-mate ao rei adversário.",steps:["Toque em uma peça para ver movimentos possíveis.","Use roque e en passant quando permitido.","Acompanhe o histórico e fique atento ao xeque."],chips:["Movimentos legais","Roque e en passant","Histórico"]},
"battleship":{eyebrow:"COMANDO NAVAL",tagline:"O oceano esconde a frota inimiga.",story:"Dois comandos navais disputam um mar desconhecido. Posicione a frota, leia os disparos e descubra os navios inimigos antes que encontrem os seus.",goal:"Localizar e afundar todas as embarcações adversárias.",steps:["Posicione navios sem sobreposição.","Escolha coordenadas para disparar.","Use resultados anteriores para reduzir a busca."],chips:["Frota secreta","Batalha por coordenadas","Duelo online"]},
"domino":{eyebrow:"MESA DE DOMINÓ",tagline:"A próxima pedra pode fechar o jogo.",story:"Uma mesa de madeira, peças na mão e uma sequência que exige leitura do jogo. Controle as pontas, conte pontos e escolha quando travar a mesa.",goal:"Ficar sem peças ou terminar com a menor soma de pontos.",steps:["Jogue uma peça que combine com uma das pontas.","Compre quando não houver jogada possível.","Observe as peças baixadas para antecipar o fechamento."],chips:["Compra de peças","Bloqueio","Contagem de pontos"]},
"truco":{eyebrow:"MESA DE TRUCO",tagline:"Coragem, leitura e blefe.",story:"Uma mesa de cartas em que a mão pode mudar com uma chamada. Leia intenções, use as manilhas e decida quando aumentar a aposta.",goal:"Vencer mãos e alcançar doze pontos.",steps:["Entenda a vira e a ordem das manilhas.","Escolha cartas para disputar as rodadas.","Peça truco quando aceitar o risco."],chips:["Vira e manilhas","Chamadas","Blefe"]},
"quiz":{eyebrow:"MORADOS QUIZ SHOW",tagline:"Luzes acesas. Cronômetro valendo.",story:"O palco está aberto. Cada pergunta vale pontos, o tempo corre e a disputa pode virar com uma única resposta. Escolham uma categoria e entrem no programa.",goal:"Acumular mais pontos respondendo antes do cronômetro terminar.",steps:["Escolha uma categoria ou jogue com todas.","Cada pergunta tem tempo limitado.","Acompanhe o placar e a explicação."],chips:["Palco de programa","Cronômetro","Categorias"]},
"escape-room":{eyebrow:"ESCAPE ROOM · A SALA DO RELÓGIO",tagline:"O tempo está correndo. Encontre a saída.",story:"Vocês acordaram em uma sala trancada. Objetos, mecanismos e mensagens escondidas compõem uma sequência de enigmas.",goal:"Investigar o ambiente, coletar itens e destrancar a porta.",steps:["Toque nos pontos de interesse.","Examine objetos e descubra como interagem.","Use pistas para abrir os mecanismos."],chips:["Cenário interativo","Mecanismos","Enigmas"]},
"island-survival":{eyebrow:"ROMANCE DE SOBREVIVÊNCIA · DEPOIS DA TEMPESTADE",tagline:"Cada dia é um capítulo. Cada escolha muda o que vem depois.",story:"Lia e Noah naufragam numa ilha que não aparece nos mapas. A narrativa acompanha os sete dias da expedição: caminhos diferentes, recursos escassos, objetos encontrados, desafios de lógica e decisões que deixam marcas nos próximos capítulos.",goal:"Atravessar a história e construir uma rota de sobrevivência por meio das escolhas, dos materiais recuperados e dos desafios que surgem dentro das cenas.",steps:["Leiam cada dia como um capítulo do livro.","Decidam quais caminhos seguir e o que recuperar; os recursos e as lembranças mudam conforme as escolhas.","Abram os objetos, resolvam os desafios e acompanhem as consequências até o epílogo."],chips:["História ramificada","Recursos e escolhas","Desafios dentro da narrativa"]},
"cave-expedition":{eyebrow:"RPG 2D · AS RUÍNAS DE MORADOS",tagline:"Desça às ruínas. Enfrente o que desperta.",story:"Uma expedição encontra a entrada de um complexo subterrâneo esquecido. Câmaras, passagens ocultas, criaturas e relíquias aguardam. A equipe precisa explorar e sobreviver aos guardiões.",goal:"Explorar os andares, encontrar tesouros, vencer monstros e concluir a expedição.",steps:["Explore o mapa e revele áreas ocultas.","Gerencie vida, energia e poções.","Em batalha, ataque, use habilidades, defenda ou recupere vida."],chips:["Exploração 2D","Combate e chefes","Cooperação"]}
};

function GamePage({gameId,userId,onBack,onlineLaunch}:{gameId:GameId;userId:string;onBack:()=>void;onlineLaunch?:OnlineGameLaunch|null}) {
 const [stage,setStage]=useState<"cover"|"mode"|"briefing"|"play"|"waiting">(()=>onlineLaunch?"play":"cover");
 const [mode,setMode]=useState<GameMode>(()=>onlineLaunch?"online":null);
 const [confirmExit,setConfirmExit]=useState(false);
 const [inviteBusy,setInviteBusy]=useState(false);
 const [inviteError,setInviteError]=useState<string|null>(null);
 const game=catalogue.find(item=>item.id===gameId)!;
 const info=launchInfo[gameId],GameIcon=game.icon,{play}=useGameAudio();
 useEffect(()=>{
  document.documentElement.dataset.moradosGameOpen="true";
  const prior=document.body.style.overflow;document.body.style.overflow="hidden";
  const goBack=()=>{if(confirmExit)setConfirmExit(false);else if(stage==="play")setConfirmExit(true);else if(stage==="briefing")setStage("mode");else if(stage==="mode")setStage("cover");else onBack();};
  const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();goBack();}};
  const onGameExit=()=>onBack();
  window.addEventListener("keydown",escape);window.addEventListener("morados:game-back",goBack);window.addEventListener("morados:game-exit",onGameExit);
  return()=>{delete document.documentElement.dataset.moradosGameOpen;document.body.style.overflow=prior;window.removeEventListener("keydown",escape);window.removeEventListener("morados:game-back",goBack);window.removeEventListener("morados:game-exit",onGameExit);};
 },[onBack,confirmExit,stage]);

 useEffect(()=>{
  const onInvitationClosed=(event:Event)=>{
   const detail=(event as CustomEvent<{gameKey?:string}>).detail;
   if(detail?.gameKey===gameId && mode==="online" && stage==="waiting"){
    setStage("briefing");
    setInviteError("O convite foi encerrado. Você pode enviar outro quando quiser.");
   }
  };
  window.addEventListener("morados:game-invitation-closed",onInvitationClosed);
  return()=>window.removeEventListener("morados:game-invitation-closed",onInvitationClosed);
 },[gameId,mode,stage]);

 async function sendOnlineInvitation(){
  if(mode!=="online"||inviteBusy)return;
  setInviteBusy(true);
  setInviteError(null);
  const inviteMode:OnlineInviteMode = ["this-or-that","daily-challenge","investigation","investigation-train","escape-room","island-survival","cave-expedition"].includes(gameId)?"cooperative":"competitive";
  try{
   const result=await createGameInvitation(gameId,inviteMode);
   if(result.error)throw result.error;
   if(typeof result.data!=="string")throw new Error("invitation_creation_failed");
   setStage("waiting");
  }catch(cause){
   const failure=cause as {code?:string;message?:string};
   setInviteError(onlineGameInvitationError(failure.message??"",failure.code));
  }finally{setInviteBusy(false);}
 }

 const back=()=>{play("tap");if(confirmExit)setConfirmExit(false);else if(stage==="play")setConfirmExit(true);else if(stage==="briefing")setStage("mode");else if(stage==="mode")setStage("cover");else onBack();};
 const settings=<InlineMenu label="Configurações do jogo" trigger={<MoreVertical/>} triggerClassName="game-world-float-button" menuClassName="game-world-menu-panel" className="game-world-menu">{close=><><div className="game-world-menu-heading">CONFIGURAÇÕES</div><GameAudioToggle/><button type="button" role="menuitem" onClick={()=>{setStage("briefing");setConfirmExit(false);close();play("tap");}}><Sparkles/> Regras e objetivo</button><button type="button" role="menuitem" onClick={()=>{setStage("mode");setConfirmExit(false);close();play("tap");}}><Users/> Trocar modo</button><button type="button" role="menuitem" onClick={()=>{setConfirmExit(true);close();play("warning");}}><ArrowLeft/> Sair da partida</button></>}</InlineMenu>;
 const choices=[{id:"solo" as const,title:"Jogar sozinho",detail:"Uma experiência individual, no seu ritmo. Nos duelos, enfrente o Morados.",meta:"1 JOGADOR",Icon:Crown},{id:"local" as const,title:"Jogar neste aparelho",detail:"Duas pessoas compartilham a tela e alternam os controles.",meta:"2 JOGADORES · LOCAL",Icon:Users},{id:"online" as const,title:"Jogar online",detail:"Cada pessoa usa seu aparelho, com a partida sincronizada.",meta:"2 JOGADORES · ONLINE",Icon:Shield}];
 return <div className={"games-fullscreen-page game-world world-"+gameId+" tone-"+game.tone} role="dialog" aria-modal="true" aria-label={game.name}>
  <header className="game-world-topbar"><button type="button" className="game-world-float-button" onClick={back} aria-label={stage==="cover"?"Voltar aos jogos":"Voltar uma etapa"}><ArrowLeft/></button><div className="game-world-top-title"><small>MORADOS ORIGINALS · {game.category.toUpperCase()}</small><strong>{game.name}</strong></div>{settings}</header>
  <main className={"game-world-main stage-"+stage}>
   {stage==="cover"&&<section className="game-launch-cover"><div className="game-cover-copy"><span className="game-world-eyebrow"><Sparkles/> {info.eyebrow}</span><h1>{game.name}</h1><p className="game-cover-tagline">{info.tagline}</p><p className="game-cover-description">{game.description}</p><div className="game-cover-highlights">{info.chips.map(x=><span key={x}>{x}</span>)}</div><button type="button" className="game-world-primary" onClick={()=>{setStage("mode");play("discovery");}}><Play/> Entrar no jogo</button><span className="game-cover-brand"><Gamepad2/> MORADOS ORIGINALS</span></div><div className={"game-cover-art art-"+gameId} aria-hidden="true"><span className="game-cover-orbit orbit-one"/><span className="game-cover-orbit orbit-two"/><span className="game-cover-beam beam-one"/><span className="game-cover-beam beam-two"/><span className="game-cover-spark spark-one"/><span className="game-cover-spark spark-two"/><span className="game-cover-spark spark-three"/><span className="game-cover-token token-one"/><span className="game-cover-token token-two"/><span className="game-cover-token token-three"/><div className="game-cover-emblem"><GameIcon/></div><span className="game-cover-art-label">{game.category.toUpperCase()}</span><span className="game-cover-art-number">0{catalogue.findIndex(x=>x.id===gameId)+1}</span></div><div className="game-cover-premise"><span>O UNIVERSO</span><p>{info.story}</p></div></section>}
   {stage==="mode"&&<section className="game-mode-stage"><div className="game-stage-heading"><span className="game-world-eyebrow">ESCOLHA SUA EXPERIÊNCIA</span><h1>Como você quer jogar?</h1><p>Escolha como entrar neste jogo.</p></div><div className="game-world-mode-grid">{choices.map(({id,title,detail,meta,Icon})=><button key={id} type="button" className={"game-world-mode-card is-"+id} onClick={()=>{setMode(id);setStage("briefing");play("discovery");}}><span className="game-world-mode-icon"><Icon/></span><span className="game-world-mode-meta">{meta}</span><strong>{title}</strong><small>{detail}</small><span className="game-world-mode-enter">Continuar <ArrowLeft/></span></button>)}</div><button type="button" className="game-world-text-button" onClick={()=>setStage("cover")}>Voltar à capa</button></section>}
   {stage==="briefing"&&<section className="game-briefing-stage"><div className="game-stage-heading"><span className="game-world-eyebrow">ANTES DE COMEÇAR · {mode==="solo"?"MODO INDIVIDUAL":mode==="local"?"DOIS JOGADORES · LOCAL":"DOIS JOGADORES · ONLINE"}</span><h1>{info.tagline}</h1><p>{info.story}</p></div><div className="game-briefing-grid"><article className="game-briefing-objective"><span className="game-briefing-number">01</span><div><small>OBJETIVO PRINCIPAL</small><h2>{info.goal}</h2></div></article><article className="game-briefing-guide"><span className="game-briefing-number">02</span><div><small>COMO JOGAR</small><ol>{info.steps.map(s=><li key={s}>{s}</li>)}</ol></div></article></div><div className="game-briefing-footer"><button type="button" className="game-world-text-button" onClick={()=>setStage("mode")}>Trocar modo</button><button type="button" className="game-world-primary" disabled={inviteBusy} onClick={()=>{if(mode==="online"){void sendOnlineInvitation();}else{setStage("play");play("success");}}}>{inviteBusy?<LoaderCircle/>:mode==="online"?<Users/>:<Play/>} {inviteBusy?"Enviando convite…":mode==="online"?"Convidar e aguardar":"Começar partida"}</button></div>{inviteError&&<p className="couple-game-error" role="alert">{inviteError}</p>}</section>}
   {stage==="waiting"&&mode==="online"&&<section className="game-briefing-stage game-invite-waiting"><div className="game-stage-heading"><span className="game-world-eyebrow">CONVITE ENVIADO</span><h1>Aguardando sua namorada.</h1><p>A partida ainda não foi iniciada. Assim que ela aceitar o convite que aparece sobre qualquer tela do Morados, vocês entrarão juntos no jogo. O convite pode ser cancelado no aviso global.</p></div><div className="game-briefing-footer"><button type="button" className="game-world-text-button" onClick={()=>setStage("briefing")}>Voltar às regras</button></div></section>}
   {stage==="play"&&mode&&<section className="game-session-stage"><div className="game-session-context"><span>{game.category.toUpperCase()}</span><strong>{game.name}</strong><small>{mode==="solo"?"MODO INDIVIDUAL":mode==="local"?"DOIS JOGADORES · LOCAL":"PARTIDA ONLINE"}</small></div><div key={mode+"-"+gameId} className="game-play-surface">{mode==="solo"&&renderSoloGame(gameId)}{mode==="local"&&renderLocalGame(gameId)}{mode==="online"&&renderOnlineGame(gameId,userId)}</div></section>}
  </main>
  {confirmExit&&<div className="game-world-exit-backdrop" role="presentation"><section className="game-world-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="game-exit-title"><span className="game-world-exit-icon"><Shield/></span><small>PAUSAR EXPERIÊNCIA</small><h2 id="game-exit-title">Sair desta partida?</h2><p>Você pode voltar ao jogo depois. O progresso salvo continua disponível quando o modo permitir.</p><button type="button" className="game-world-primary" onClick={()=>{setConfirmExit(false);setStage("cover");setMode(null);}}>Voltar à capa do jogo</button><button type="button" className="game-world-text-button" onClick={()=>{setConfirmExit(false);onBack();}}>Voltar ao catálogo</button><button type="button" className="game-world-exit-cancel" onClick={()=>setConfirmExit(false)}>Continuar jogando</button></section></div>}
 </div>;
}

const cooperativeGames: GameId[] = ["investigation", "investigation-train", "escape-room", "island-survival", "cave-expedition"];

function renderSoloGame(gameId: GameId) {
  switch (gameId) {
    case "connect-four": return <LocalConnectFourGame solo />;
    case "checkers": return <CheckersGame solo />;
    case "this-or-that": return <LocalThisOrThatGame solo />;
    case "daily-challenge": return <LocalDailyChallengeGame solo />;
    case "investigation": return <CoupleInvestigationGame solo />;
    case "investigation-train": return <CoupleInvestigationTrainGame solo />;
    case "chess": return <ChessGame solo />;
    case "battleship": return <BattleshipGame solo />;
    case "domino": return <DominoGame solo />;
    case "truco": return <TrucoGame solo />;
    case "quiz": return <QuizGame solo />;
    case "escape-room": return <EscapeRoomGame solo />;
    case "island-survival": return <IslandSurvivalGame solo />;
    case "cave-expedition": return <CaveExpeditionGame solo />;
  }
}

function renderLocalGame(gameId: GameId) {
  switch (gameId) {
    case "connect-four": return <LocalConnectFourGame />;
    case "checkers": return <CheckersGame />;
    case "this-or-that": return <LocalThisOrThatGame />;
    case "daily-challenge": return <LocalDailyChallengeGame />;
    case "investigation": return <CoupleInvestigationGame />;
    case "investigation-train": return <CoupleInvestigationTrainGame />;
    case "chess": return <ChessGame />;
    case "battleship": return <BattleshipGame />;
    case "domino": return <DominoGame />;
    case "truco": return <TrucoGame />;
    case "quiz": return <QuizGame />;
    case "escape-room": return <EscapeRoomGame />;
    case "island-survival": return <IslandSurvivalGame />;
    case "cave-expedition": return <CaveExpeditionGame />;
  }
}

function renderOnlineGame(gameId: GameId, userId: string) {
  // Estes três já tinham sincronização própria (tabelas existentes preservadas).
  if (gameId === "connect-four") return <ConnectFourGame userId={userId} />;
  if (gameId === "this-or-that") return <CoupleGame userId={userId} />;
  if (gameId === "daily-challenge") return <CoupleDailyChallenge userId={userId} />;
  const game =
    gameId === "battleship" ? <OnlineBattleshipGame /> :
    gameId === "domino" ? <OnlineDominoGame /> :
    gameId === "truco" ? <OnlineTrucoGame /> :
    renderLocalGame(gameId);
  return (
    <OnlineGameHost key={gameId} gameKey={gameId} userId={userId} mode={cooperativeGames.includes(gameId) ? "cooperative" : "competitive"}>
      {game}
    </OnlineGameHost>
  );
}

export function CoupleGames({ userId, onlineLaunch, onOnlineLaunchConsumed }: { userId: string; onNavigate: (section: SecondaryPageSection) => void; onlineLaunch?: OnlineGameLaunch | null; onOnlineLaunchConsumed?: () => void }) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [launch, setLaunch] = useState<OnlineGameLaunch | null>(null);
  const lastLaunchId = useRef<string | null>(null);
  const [filter, setFilter] = useState<"all" | "strategy" | "cooperation" | "investigation">("all");

  useEffect(() => {
    if (!onlineLaunch || lastLaunchId.current === onlineLaunch.invitationId) return;
    if (!catalogue.some((game) => game.id === onlineLaunch.gameKey)) return;
    lastLaunchId.current = onlineLaunch.invitationId;
    setLaunch(onlineLaunch);
    setActiveGame(onlineLaunch.gameKey as GameId);
    onOnlineLaunchConsumed?.();
  }, [onlineLaunch, onOnlineLaunchConsumed]);

  const visibleGames = catalogue.filter((game) => {
    if (filter === "strategy") return game.category === "Estratégia";
    if (filter === "cooperation") return ["Preferências","Cooperação","Conhecimento","Cartas","Escape room","Sobrevivência","Aventura 2D"].includes(game.category);
    if (filter === "investigation") return game.category === "Investigação policial" || game.category === "Escape room";
    return true;
  });

  if (activeGame) {
    return (
      <GameAudioProvider><GamePage key={launch?.invitationId ?? activeGame} gameId={activeGame} userId={userId} onlineLaunch={launch} onBack={() => { setActiveGame(null); setLaunch(null); }} /></GameAudioProvider>
    );
  }

  return (
    <section className="games-hub">
      <div className="games-hub-intro">
        <div>
          <p className="date-kicker">Escolham uma experiência</p>
          <p>Partidas rápidas, desafios em conjunto e histórias para investigar.</p>
        </div>
        <span className="games-hub-mark"><Gamepad2 aria-hidden="true" /></span>
      </div>

      <nav className="games-hub-filters" aria-label="Filtrar jogos">
        {([
          ["all", "Todos"],
          ["strategy", "Estratégia"],
          ["cooperation", "Cooperação"],
          ["investigation", "Investigação"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={filter === id ? "is-active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="games-hub-grid">
        {visibleGames.map((game) => {
          const Icon = game.icon;
          return (
            <button key={game.id} type="button" className={"games-hub-card tone-" + game.tone} onClick={() => setActiveGame(game.id)}>
              <div className="games-hub-card-art">
                <Icon aria-hidden="true" />
                {game.new && <span><Sparkles aria-hidden="true" /> Novo</span>}
              </div>
              <div className="games-hub-card-copy">
                <span>{game.category}</span>
                <h2>{game.name}</h2>
                <p>{game.description}</p>
                <div className="games-hub-card-footer">
                  <small><Users aria-hidden="true" /> {game.players}</small>
                  <strong>Jogar <ArrowLeft aria-hidden="true" /></strong>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="games-hub-next games-hub-next-classics">
        <div className="games-hub-next-title">
          <span><Crown aria-hidden="true" /></span>
          <div><h2>Clássicos em desenvolvimento</h2><p>Os próximos jogos de mesa que já estavam previstos.</p></div>
        </div>
        <div className="games-hub-next-grid">
          <article><Brain aria-hidden="true"/><div><strong>Estratégia e sobrevivência</strong><small>Gestão de recursos, exploração e decisões com consequências</small></div><span>Próximo</span></article>
          <article><Sparkles aria-hidden="true"/><div><strong>Histórias interativas</strong><small>Mistérios com escolhas, personagens e caminhos diferentes</small></div><span>Próximo</span></article>
        </div>
      </section>

      <section className="games-hub-next">
        <div className="games-hub-next-title">
          <span><Sparkles aria-hidden="true" /></span>
          <div><h2>Novos gêneros</h2><p>Jogos que vão além dos tabuleiros.</p></div>
        </div>
        <div className="games-hub-next-grid">
          <article><Shield aria-hidden="true"/><div><strong>Casos policiais</strong><small>Novos dossiês, suspeitos e mistérios além do Caso 001</small></div><span>Em produção</span></article>
          <article><AudioLines aria-hidden="true"/><div><strong>Novas salas de fuga</strong><small>Ambientes, enigmas e mecanismos em sequência</small></div><span>Próximo</span></article>
          <article><Brain aria-hidden="true"/><div><strong>Estratégia e sobrevivência</strong><small>Gestão de recursos e decisões com consequências</small></div><span>Planejado</span></article>
        </div>
      </section>
    </section>
  );
}
