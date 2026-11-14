import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  AudioLines,
  Brain,
  CalendarHeart,
  Crown,
  Gamepad2,
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
import { InlineMenu } from "@/components/InlineMenu";
import { OnlineGameHost } from "@/components/OnlineGameHost";
import { OnlineBattleshipGame } from "@/components/OnlineBattleshipGame";
import { OnlineDominoGame } from "@/components/OnlineDominoGame";
import { OnlineTrucoGame } from "@/components/OnlineTrucoGame";
import { SecondaryPageChrome, type SecondaryPageSection } from "@/components/SecondaryPageChrome";
import {
  LocalConnectFourGame,
  LocalDailyChallengeGame,
  LocalThisOrThatGame,
} from "@/components/LocalCoupleGames";

type GameId = "connect-four" | "checkers" | "this-or-that" | "daily-challenge" | "investigation" | "investigation-train" | "chess" | "battleship" | "domino" | "truco" | "quiz" | "escape-room" | "island-survival";
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
    name: "A Carta Celeste",
    category: "Investigação policial",
    description: "Examine evidências, interrogue quatro suspeitos e descubra quem furtou a peça do museu.",
    players: "Cooperativo · 1–2",
    icon: Search,
    tone: "noir",
    new: true,
  },
  {
    id: "investigation-train",
    name: "O Último Trem",
    category: "Investigação policial",
    description: "Um roubo na Plataforma 4: reconstrua horários, rastros e depoimentos para encontrar a maleta.",
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
  { id: "island-survival", name: "Depois da tempestade", category: "Sobrevivência", description: "Administrem recursos, dividam tarefas e sobrevivam cinco dias numa ilha até o resgate.", players: "Cooperativo · 1–2", icon: Shield, tone: "olive", new: true },
];

function GamePage({
  gameId,
  userId,
  onBack,
  onNavigate,
}: {
  gameId: GameId;
  userId: string;
  onBack: () => void;
  onNavigate: (section: SecondaryPageSection) => void;
}) {
  const [mode, setMode] = useState<GameMode>(null);
  const game = catalogue.find((item) => item.id === gameId)!;

  useEffect(() => {
    document.documentElement.dataset.moradosGameOpen = "true";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    const onHardwareBack = () => onBack();
    window.addEventListener("keydown", onEscape);
    window.addEventListener("morados:game-back", onHardwareBack);
    return () => {
      delete document.documentElement.dataset.moradosGameOpen;
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("morados:game-back", onHardwareBack);
    };
  }, [onBack]);

  const gameOptions = (
    <InlineMenu
      label="Opções do jogo"
      trigger={<MoreVertical aria-hidden="true" />}
      triggerClassName="topbar-icon-button"
      menuClassName="nc-menu secondary-game-menu"
    >
      {(close) => (
        <>
          <button type="button" role="menuitem" className="nc-menu-item" onClick={() => { setMode("solo"); close(); }}>
            {mode === "solo" ? <Check aria-hidden="true" /> : <span className="secondary-game-menu-spacer" />}
            Jogar sozinho
          </button>
          <button type="button" role="menuitem" className="nc-menu-item" onClick={() => { setMode("local"); close(); }}>
            {mode === "local" ? <Check aria-hidden="true" /> : <span className="secondary-game-menu-spacer" />}
            Jogar juntos neste aparelho
          </button>
          <button type="button" role="menuitem" className="nc-menu-item" onClick={() => { setMode("online"); close(); }}>
            {mode === "online" ? <Check aria-hidden="true" /> : <span className="secondary-game-menu-spacer" />}
            Jogar online
          </button>
          <div className="nc-menu-sep" role="separator" />
          <button type="button" role="menuitem" className="nc-menu-item" onClick={() => { setMode(null); close(); }}>
            <span className="secondary-game-menu-spacer" /> Trocar modo
          </button>
          <span className="secondary-game-menu-note">{game.category} · {game.players}</span>
        </>
      )}
    </InlineMenu>
  );

  return (
    <div className={"games-fullscreen-page tone-" + game.tone} role="dialog" aria-modal="true" aria-label={game.name}>
      <SecondaryPageChrome
        title={game.name}
        onBack={onBack}
        backLabel="Voltar para os jogos"
        rightAction={gameOptions}
        activeSection="games"
        onNavigate={onNavigate}
        scrollKey={"game-" + gameId}
        contentClassName="games-fullscreen-scroll"
        scrollableContent
      >
        <div className={"games-fullscreen-content" + (mode ? " is-playing is-mode-" + mode : " is-choosing-mode")}>
          {!mode ? (
            <section className="game-mode-picker" aria-labelledby="game-mode-title">
              <div className="game-mode-picker-intro">
                <span className="game-mode-eyebrow"><Sparkles aria-hidden="true" /> UMA EXPERIÊNCIA DO MORADOS</span>
                <h2 id="game-mode-title">Como vocês querem jogar?</h2>
                <p>Escolha o formato da partida. Você pode trocar de modo a qualquer momento pelo menu no alto da tela.</p>
              </div>
              <div className="game-mode-options">
                <button type="button" className="game-mode-card is-solo" onClick={() => setMode("solo")}>
                  <span className="game-mode-icon"><Crown aria-hidden="true" /></span>
                  <span className="game-mode-copy"><strong>Sozinho</strong><small>Jogue no seu ritmo, com desafios individuais ou contra o Morados nos jogos de estratégia.</small></span>
                  <span className="game-mode-arrow">Jogar sozinho <ArrowLeft aria-hidden="true" /></span>
                </button>
                <button type="button" className="game-mode-card is-local" onClick={() => setMode("local")}>
                  <span className="game-mode-icon"><Users aria-hidden="true" /></span>
                  <span className="game-mode-copy"><strong>Juntos neste aparelho</strong><small>Uma só tela, duas pessoas. O jogo alterna as vezes e protege informações privadas quando necessário.</small></span>
                  <span className="game-mode-arrow">Jogar lado a lado <ArrowLeft aria-hidden="true" /></span>
                </button>
                <button type="button" className="game-mode-card is-online" onClick={() => setMode("online")}>
                  <span className="game-mode-icon"><Shield aria-hidden="true" /></span>
                  <span className="game-mode-copy"><strong>Online</strong><small>Cada pessoa no próprio aparelho, com partida e progresso sincronizados entre as duas contas.</small></span>
                  <span className="game-mode-arrow">Conectar partida <ArrowLeft aria-hidden="true" /></span>
                </button>
              </div>
              <p className="game-mode-footnote">Ao trocar de modo, uma nova partida começa; casos e desafios com progresso salvo podem manter suas pistas no aparelho.</p>
            </section>
          ) : (
            <>
              <div className="game-mode-toolbar">
                <span className={"game-mode-current is-" + mode}>
                  {mode === "solo" ? <Crown aria-hidden="true" /> : mode === "local" ? <Users aria-hidden="true" /> : <Shield aria-hidden="true" />}
                  {mode === "solo" ? "Modo sozinho" : mode === "local" ? "Juntos neste aparelho" : "Partida online"}
                </span>
                <button type="button" className="game-mode-change" onClick={() => setMode(null)}>
                  <ArrowLeft aria-hidden="true" /> Trocar modo
                </button>
              </div>
              <div key={mode + "-" + gameId} className="game-play-surface">
                {mode === "solo" && renderSoloGame(gameId)}
                {mode === "local" && renderLocalGame(gameId)}
                {mode === "online" && renderOnlineGame(gameId, userId)}
              </div>
            </>
          )}
        </div>
      </SecondaryPageChrome>
    </div>
  );
}

const cooperativeGames: GameId[] = ["investigation", "investigation-train", "escape-room", "island-survival"];

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

export function CoupleGames({ userId, onNavigate }: { userId: string; onNavigate: (section: SecondaryPageSection) => void }) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [filter, setFilter] = useState<"all" | "strategy" | "cooperation" | "investigation">("all");

  const visibleGames = catalogue.filter((game) => {
    if (filter === "strategy") return game.category === "Estratégia";
    if (filter === "cooperation") return ["Preferências","Cooperação","Conhecimento","Cartas","Escape room","Sobrevivência"].includes(game.category);
    if (filter === "investigation") return game.category === "Investigação policial" || game.category === "Escape room";
    return true;
  });

  if (activeGame) {
    return (
      <GamePage
        gameId={activeGame}
        userId={userId}
        onBack={() => setActiveGame(null)}
        onNavigate={(section) => {
          if (section === "games") setActiveGame(null);
          else onNavigate(section);
        }}
      />
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
