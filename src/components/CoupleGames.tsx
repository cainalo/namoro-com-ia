import { useState } from "react";
import { CheckersGame } from "@/components/CheckersGame";
import { ConnectFourGame } from "@/components/ConnectFourGame";
import { CoupleDailyChallenge } from "@/components/CoupleDailyChallenge";
import { CoupleGame } from "@/components/CoupleGame";
import { MoradosSectionArt } from "@/components/MoradosSectionArt";

type GameId = "connect-four" | "checkers" | "this-or-that" | "daily-challenge";

const plannedGames = [
  { name: "Xadrez", type: "Estratégia", detail: "Partidas completas com relógio e histórico de lances." },
  { name: "Batalha naval", type: "Dedução", detail: "Frotas escondidas e tiros alternados." },
  { name: "Dominó", type: "Mesa", detail: "Compra, bloqueio e contagem de pontos." },
  { name: "Truco", type: "Cartas", detail: "Rodadas, blefes e disputa por pontos." },
  { name: "Quiz", type: "Conhecimento", detail: "Perguntas por tema, tempo e placar." },
];

export function CoupleGames({ userId }: { userId: string }) {
  const [activeGame, setActiveGame] = useState<GameId>("connect-four");

  return (
    <section className="games-hub" aria-labelledby="games-hub-title">
      <header className="games-hub-heading">
        <div>
          <p className="date-kicker">Jogos para dois · online e local</p>
          <h1 id="games-hub-title">Jogos</h1>
        </div>
        <MoradosSectionArt variant="games" />
      </header>

      <div className="games-hub-categories">
        <section className="games-hub-category" aria-labelledby="games-competition-title">
          <h2 id="games-competition-title">Competir e cooperar</h2>
          <p>Jogos clássicos, estratégia e desafios para jogar junto.</p>
          <div className="games-hub-selectors" role="group" aria-label="Jogos para competir ou cooperar">
            <button
              type="button"
              className={activeGame === "connect-four" ? "is-active" : ""}
              aria-pressed={activeGame === "connect-four"}
              onClick={() => setActiveGame("connect-four")}
            >
              Lig 4
            </button>
            <button
              type="button"
              className={activeGame === "checkers" ? "is-active" : ""}
              aria-pressed={activeGame === "checkers"}
              onClick={() => setActiveGame("checkers")}
            >
              Damas
            </button>
          </div>
        </section>

        <section className="games-hub-category" aria-labelledby="games-couple-title">
          <h2 id="games-couple-title">Jogos de casal</h2>
          <p>Jogos próprios para vocês se conhecerem, conversarem e se divertirem.</p>
          <div className="games-hub-selectors" role="group" aria-label="Jogos de casal">
            <button
              type="button"
              className={activeGame === "this-or-that" ? "is-active" : ""}
              aria-pressed={activeGame === "this-or-that"}
              onClick={() => setActiveGame("this-or-that")}
            >
              Isto ou aquilo?
            </button>
            <button
              type="button"
              className={activeGame === "daily-challenge" ? "is-active" : ""}
              aria-pressed={activeGame === "daily-challenge"}
              onClick={() => setActiveGame("daily-challenge")}
            >
              Desafio do dia
            </button>
          </div>
        </section>
      </div>

      <div className="games-hub-active" aria-live="polite">
        {activeGame === "connect-four" ? (
          <ConnectFourGame userId={userId} />
        ) : activeGame === "checkers" ? (
          <CheckersGame />
        ) : activeGame === "this-or-that" ? (
          <CoupleGame userId={userId} />
        ) : (
          <CoupleDailyChallenge userId={userId} />
        )}
      </div>

      <section className="games-hub-planned" aria-labelledby="games-planned-title">
        <h2 id="games-planned-title">Mais jogos a caminho</h2>
        <ul>
          {plannedGames.map((game) => (
            <li key={game.name}>
              <div>
                <p className="games-hub-game-type">{game.type}</p>
                <h3>{game.name}</h3>
                <p>{game.detail}</p>
              </div>
              <span>Em desenvolvimento</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
