import { ConnectFourGame } from "@/components/ConnectFourGame";

const plannedGames = [
  { name: "Damas", type: "Estratégia", detail: "Captura de peças e coroação." },
  { name: "Xadrez", type: "Estratégia", detail: "Partidas completas com relógio e histórico de lances." },
  { name: "Batalha naval", type: "Dedução", detail: "Frotas escondidas e tiros alternados." },
  { name: "Dominó", type: "Mesa", detail: "Compra, bloqueio e contagem de pontos." },
  { name: "Truco", type: "Cartas", detail: "Rodadas, blefes e disputa por pontos." },
  { name: "Quiz", type: "Conhecimento", detail: "Perguntas por tema, tempo e placar." },
];

export function CoupleGames({ userId }: { userId: string }) {
  return (
    <section className="games-hub" aria-labelledby="games-hub-title">
      <header className="games-hub-heading">
        <div>
          <p className="date-kicker">Partidas online · 2 jogadores</p>
          <h1 id="games-hub-title">Jogos</h1>
        </div>
      </header>

      <section className="games-hub-available" aria-labelledby="games-available-title">
        <h2 id="games-available-title">Disponível para jogar</h2>
        <ConnectFourGame userId={userId} />
      </section>

      <section className="games-hub-planned" aria-labelledby="games-planned-title">
        <h2 id="games-planned-title">Próximos jogos</h2>
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
