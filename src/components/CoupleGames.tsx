import { useState } from "react";
import { CoupleDailyChallenge } from "@/components/CoupleDailyChallenge";
import { CoupleGame } from "@/components/CoupleGame";

type GameId = "choices" | "daily";

export function CoupleGames({ userId }: { userId: string }) {
  const [activeGame, setActiveGame] = useState<GameId>("choices");

  return (
    <section className="couple-games">
      <nav className="couple-games-switcher" role="tablist" aria-label="Escolher jogo">
        <button
          type="button"
          role="tab"
          aria-selected={activeGame === "choices"}
          className={activeGame === "choices" ? "is-active" : ""}
          onClick={() => setActiveGame("choices")}
        >
          Isto ou aquilo?
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeGame === "daily"}
          className={activeGame === "daily" ? "is-active" : ""}
          onClick={() => setActiveGame("daily")}
        >
          Desafio do dia
        </button>
      </nav>

      <div role="tabpanel">
        {activeGame === "choices" ? (
          <CoupleGame userId={userId} />
        ) : (
          <CoupleDailyChallenge userId={userId} />
        )}
      </div>
    </section>
  );
}
