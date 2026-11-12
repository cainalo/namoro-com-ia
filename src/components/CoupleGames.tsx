import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AudioLines,
  Brain,
  CalendarHeart,
  Crown,
  Gamepad2,
  Search,
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
import {
  LocalConnectFourGame,
  LocalDailyChallengeGame,
  LocalThisOrThatGame,
} from "@/components/LocalCoupleGames";

type GameId = "connect-four" | "checkers" | "this-or-that" | "daily-challenge" | "investigation";
type GameMode = "local" | "online";

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
];

function GamePage({
  gameId,
  userId,
  onBack,
}: {
  gameId: GameId;
  userId: string;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<GameMode>("local");
  const game = catalogue.find((item) => item.id === gameId)!;
  const isRemoteSupported = gameId === "connect-four" || gameId === "this-or-that" || gameId === "daily-challenge";

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

  return (
    <div className={"games-fullscreen-page tone-" + game.tone} role="dialog" aria-modal="true" aria-label={game.name}>
      <header className="games-fullscreen-header">
        <button type="button" className="games-fullscreen-back" onClick={onBack} aria-label="Voltar para os jogos">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="games-fullscreen-heading">
          <span>{game.category}</span>
          <strong>{game.name}</strong>
        </div>
        {isRemoteSupported ? (
          <div className="games-mode-switch" role="group" aria-label="Modo de jogo">
            <button type="button" className={mode === "local" ? "is-active" : ""} onClick={() => setMode("local")}>Neste aparelho</button>
            <button type="button" className={mode === "online" ? "is-active" : ""} onClick={() => setMode("online")}>Online</button>
          </div>
        ) : (
          <span className="games-fullscreen-mode"><Users aria-hidden="true" /> {game.players}</span>
        )}
      </header>
      <main className="games-fullscreen-scroll">
        <div className="games-fullscreen-content">
          {gameId === "connect-four" ? (
            mode === "local" ? <LocalConnectFourGame /> : <ConnectFourGame userId={userId} />
          ) : gameId === "checkers" ? (
            <CheckersGame />
          ) : gameId === "this-or-that" ? (
            mode === "local" ? <LocalThisOrThatGame /> : <CoupleGame userId={userId} />
          ) : gameId === "daily-challenge" ? (
            mode === "local" ? <LocalDailyChallengeGame /> : <CoupleDailyChallenge userId={userId} />
          ) : (
            <CoupleInvestigationGame />
          )}
        </div>
      </main>
    </div>
  );
}

export function CoupleGames({ userId }: { userId: string }) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [filter, setFilter] = useState<"all" | "strategy" | "cooperation" | "investigation">("all");

  const visibleGames = catalogue.filter((game) => {
    if (filter === "strategy") return game.category === "Estratégia";
    if (filter === "cooperation") return game.category !== "Estratégia" && game.id !== "investigation";
    if (filter === "investigation") return game.id === "investigation";
    return true;
  });

  if (activeGame) {
    return (
      <GamePage
        gameId={activeGame}
        userId={userId}
        onBack={() => setActiveGame(null)}
      />
    );
  }

  return (
    <section className="games-hub">
      <div className="games-hub-intro">
        <div>
          <p className="date-kicker">Escolham uma experiência</p>
          <h1>Jogos</h1>
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
          <article><Crown aria-hidden="true"/><div><strong>Xadrez</strong><small>Partidas completas, relógio e histórico de lances</small></div><span>Em produção</span></article>
          <article><Target aria-hidden="true"/><div><strong>Batalha naval</strong><small>Frotas ocultas, tiros e estratégia</small></div><span>Em produção</span></article>
          <article><Gamepad2 aria-hidden="true"/><div><strong>Dominó</strong><small>Compra, bloqueio e pontuação por rodada</small></div><span>Planejado</span></article>
          <article><Swords aria-hidden="true"/><div><strong>Truco</strong><small>Duplas, blefe, manilhas e tentos</small></div><span>Planejado</span></article>
          <article><Brain aria-hidden="true"/><div><strong>Quiz</strong><small>Rodadas por tema, tempo e placar</small></div><span>Planejado</span></article>
        </div>
      </section>

      <section className="games-hub-next">
        <div className="games-hub-next-title">
          <span><Sparkles aria-hidden="true" /></span>
          <div><h2>Novos gêneros</h2><p>Jogos que vão além dos tabuleiros.</p></div>
        </div>
        <div className="games-hub-next-grid">
          <article><Shield aria-hidden="true"/><div><strong>Casos policiais</strong><small>Novos dossiês, suspeitos e mistérios além do Caso 001</small></div><span>Em produção</span></article>
          <article><AudioLines aria-hidden="true"/><div><strong>Escape rooms</strong><small>Enigmas, códigos, objetos e ambientes secretos</small></div><span>Planejado</span></article>
          <article><Brain aria-hidden="true"/><div><strong>Estratégia e sobrevivência</strong><small>Gestão de recursos e decisões com consequências</small></div><span>Planejado</span></article>
        </div>
      </section>
    </section>
  );
}
