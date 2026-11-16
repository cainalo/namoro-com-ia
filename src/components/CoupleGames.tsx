import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  AudioLines,
  Brain,
  CalendarHeart,
  Crown,
  DoorOpen,
  Gamepad2,
  Grid2X2,
  Grid3X3,
  Heart,
  Mountain,
  Play,
  Scale,
  Search,
  Ship,
  Spade,
  LockKeyhole,
  LoaderCircle,
  MoreVertical,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrainFront,
  Users,
  Waves,
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
    icon: Grid3X3,
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
    icon: Heart,
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
    icon: TrainFront,
    tone: "noir",
    new: true,
  },
  { id: "chess", name: "Xadrez", category: "Estratégia", description: "Partidas clássicas com movimentos legais, xeque, roque, en passant e histórico.", players: "2 pessoas", icon: Scale, tone: "plum" },
  { id: "battleship", name: "Batalha Naval", category: "Estratégia", description: "Posicionem frotas secretas e encontrem os navios da outra pessoa.", players: "2 pessoas", icon: Ship, tone: "petrol" },
  { id: "domino", name: "Dominó", category: "Estratégia", description: "Joguem, comprem peças, bloqueiem a mesa e somem os pontos.", players: "2 pessoas", icon: Grid2X2, tone: "olive" },
  { id: "truco", name: "Truco Paulista", category: "Cartas", description: "Vira, manilhas e blefe. Aumentem a aposta até doze pontos.", players: "2 pessoas", icon: Spade, tone: "terracotta" },
  { id: "quiz", name: "Quiz dos dois", category: "Conhecimento", description: "Perguntas por categoria, tempo limitado e placar alternado.", players: "2 pessoas", icon: Brain, tone: "plum" },
  { id: "escape-room", name: "A sala do relógio", category: "Escape room", description: "Investiguem uma sala, encontrem objetos e descubram o código para escapar.", players: "Cooperativo · 1–2", icon: DoorOpen, tone: "noir", new: true },
  { id: "island-survival", name: "Depois da tempestade", category: "Sobrevivência", description: "Uma expedição naufraga numa ilha que parece conhecer os sobreviventes. Cada capítulo traz escolhas, recursos, desafios e segredos.", players: "Cooperativo · 1–2", icon: Waves, tone: "olive", new: true },
  { id: "cave-expedition", name: "As Ruínas de Morados", category: "Aventura 2D", description: "Explore câmaras esquecidas, enfrente guardiões, encontre relíquias e escape em uma aventura cooperativa.", players: "Cooperativo · 1–2", icon: Mountain, tone: "noir", new: true },
];

function GamePage({gameId,userId,onBack,onlineLaunch}:{gameId:GameId;userId:string;onBack:()=>void;onlineLaunch?:OnlineGameLaunch|null}) {
 const [stage,setStage]=useState<"cover"|"mode"|"play"|"waiting">(()=>onlineLaunch?"play":"cover");
 const [mode,setMode]=useState<GameMode>(()=>onlineLaunch?"online":null);
 const [confirmExit,setConfirmExit]=useState(false);
 const [inviteBusy,setInviteBusy]=useState(false);
 const [inviteError,setInviteError]=useState<string|null>(null);
 const game=catalogue.find(item=>item.id===gameId)!;
 const GameIcon=game.icon,{play}=useGameAudio();
 useEffect(()=>{
  document.documentElement.dataset.moradosGameOpen="true";
  const prior=document.body.style.overflow;document.body.style.overflow="hidden";
  const goBack=()=>{if(confirmExit)setConfirmExit(false);else if(stage==="play")setConfirmExit(true);else if(stage==="waiting")setStage("mode");else if(stage==="mode")setStage("cover");else onBack();};
  const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();goBack();}};
  const onGameExit=()=>onBack();
  window.addEventListener("keydown",escape);window.addEventListener("morados:game-back",goBack);window.addEventListener("morados:game-exit",onGameExit);
  return()=>{delete document.documentElement.dataset.moradosGameOpen;document.body.style.overflow=prior;window.removeEventListener("keydown",escape);window.removeEventListener("morados:game-back",goBack);window.removeEventListener("morados:game-exit",onGameExit);};
 },[onBack,confirmExit,stage]);

 useEffect(()=>{
  const onInvitationClosed=(event:Event)=>{
   const detail=(event as CustomEvent<{gameKey?:string}>).detail;
   if(detail?.gameKey===gameId && mode==="online" && stage==="waiting"){
    setStage("mode");
    setInviteError("O convite foi encerrado. Escolha um modo para tentar novamente.");
   }
  };
  window.addEventListener("morados:game-invitation-closed",onInvitationClosed);
  return()=>window.removeEventListener("morados:game-invitation-closed",onInvitationClosed);
 },[gameId,mode,stage]);

 async function sendOnlineInvitation(){
  if(inviteBusy)return;
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

 const back=()=>{play("tap");if(confirmExit)setConfirmExit(false);else if(stage==="play")setConfirmExit(true);else if(stage==="waiting")setStage("mode");else if(stage==="mode")setStage("cover");else onBack();};
 const settings=<InlineMenu label="Configurações do jogo" trigger={<MoreVertical/>} triggerClassName="game-world-float-button" menuClassName="game-world-menu-panel" className="game-world-menu">{close=><><div className="game-world-menu-heading">CONFIGURAÇÕES</div><GameAudioToggle/><button type="button" role="menuitem" onClick={()=>{setStage("mode");setConfirmExit(false);close();play("tap");}}><Users/> Trocar modo</button><button type="button" role="menuitem" onClick={()=>{setConfirmExit(true);close();play("warning");}}><ArrowLeft/> Sair da partida</button></>}</InlineMenu>;
 const choices=[{id:"solo" as const,title:"Jogar sozinho",Icon:Crown},{id:"local" as const,title:"Jogar neste aparelho",Icon:Users},{id:"online" as const,title:"Jogar online",Icon:Shield}];
 return <div className={"games-fullscreen-page game-world world-"+gameId+" tone-"+game.tone} role="dialog" aria-modal="true" aria-label={game.name}>
  <header className="game-world-topbar"><button type="button" className="game-world-float-button" onClick={back} aria-label={stage==="cover"?"Voltar aos jogos":"Voltar uma etapa"}><ArrowLeft/></button><div className="game-world-top-title"><small>MORADOS ORIGINALS</small><strong>{game.name}</strong></div>{settings}</header>
  <main className={"game-world-main stage-"+stage}>
   {stage==="cover"&&<section className="game-launch-cover">
      <div className={"game-cover-art art-"+gameId} aria-hidden="true">
        <span className="game-cover-art-watermark">{game.name}</span>
        <span className="game-cover-orbit orbit-one"/><span className="game-cover-orbit orbit-two"/>
        <span className="game-cover-beam beam-one"/><span className="game-cover-beam beam-two"/>
        <span className="game-cover-spark spark-one"/><span className="game-cover-spark spark-two"/><span className="game-cover-spark spark-three"/>
        <span className="game-cover-token token-one"/><span className="game-cover-token token-two"/><span className="game-cover-token token-three"/>
        <div className="game-cover-emblem"><GameIcon/></div>
        <span className="game-cover-art-number">0{catalogue.findIndex(x=>x.id===gameId)+1}</span>
      </div>
      <div className="game-cover-copy">
        <h1>{game.name}</h1>
        <button type="button" className="game-world-primary" onClick={()=>{setStage("mode");play("discovery");}}><Play/> Jogar</button>
      </div>
    </section>}
   {stage==="mode"&&<section className="game-mode-stage">
      <div className="game-stage-heading"><h1>Como você quer jogar?</h1></div>
      <div className="game-world-mode-grid">{choices.map(({id,title,Icon})=><button key={id} type="button" className={"game-world-mode-card is-"+id} onClick={()=>{setMode(id);play("discovery");if(id==="online"){void sendOnlineInvitation();}else{setStage("play");}}}>
        <span className="game-world-mode-icon"><Icon/></span>
        <strong>{title}</strong>
        <span className="game-world-mode-enter">{id==="online"&&inviteBusy?<LoaderCircle/>:<Play/>}</span>
      </button>)}</div>
      {inviteError&&<p className="couple-game-error" role="alert">{inviteError}</p>}
      <button type="button" className="game-world-text-button" onClick={()=>setStage("cover")}>Voltar à capa</button>
    </section>}
   
   {stage==="waiting"&&mode==="online"&&<section className="game-invite-waiting"><span className="game-invite-waiting-mark"><Users/></span><h1>Aguardando a outra pessoa</h1><button type="button" className="game-world-text-button" onClick={()=>setStage("mode")}>Voltar aos modos</button></section>}
   {stage==="play"&&mode&&<section className="game-session-stage"><div key={mode+"-"+gameId} className="game-play-surface">{mode==="solo"&&renderSoloGame(gameId)}{mode==="local"&&renderLocalGame(gameId)}{mode==="online"&&renderOnlineGame(gameId,userId)}</div></section>}
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
          <p className="date-kicker">MORADOS ORIGINALS</p>
          <h1>Jogos</h1>
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
        {visibleGames.map((game, index) => {
          const Icon = game.icon;
          return (
            <button key={game.id} type="button" className={"games-hub-card tone-" + game.tone + " art-" + game.id} onClick={() => setActiveGame(game.id)} aria-label={"Abrir capa de " + game.name}>
              <span className="games-hub-card-art" aria-hidden="true">
                <span className="games-hub-card-watermark">{game.name}</span>
                <span className="games-hub-card-orbit orbit-one" />
                <span className="games-hub-card-orbit orbit-two" />
                <span className="games-hub-card-number">0{index + 1}</span>
                <span className="games-hub-card-symbol"><Icon /></span>
              </span>
              <span className="games-hub-card-copy"><strong>{game.name}</strong></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
