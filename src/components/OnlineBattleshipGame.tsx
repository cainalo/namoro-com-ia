import { useEffect, useState } from "react";
import { Shield, Target } from "lucide-react";
import { useGameState, useOnlineGame } from "@/components/OnlineGameHost";
import {
  axis,
  createFleet,
  shipSpecs,
  shipSunk,
  SIZE,
  type Fleet,
} from "@/components/BattleshipGame";
import { loadPrivate, setPrivate, type Seat } from "@/lib/online-game";

type OnlineShot = "hit" | "miss" | "pending" | null;
/** shots[s]: disparos feitos pela pessoa s. A frota de cada pessoa fica só no estado privado dela. */
export type NavalShared = {
  shots: [OnlineShot[], OnlineShot[]];
  sunk: [string[], string[]];
  hits: [number, number];
  turn: Seat;
  winner: Seat | null;
};

const empty = () => Array<OnlineShot>(SIZE * SIZE).fill(null);
const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** Resolve disparos pendentes da outra pessoa contra a minha frota (só eu conheço a frota). */
export function resolveIncoming(state: NavalShared, me: Seat, fleet: Fleet): NavalShared | null {
  const opp = other(me);
  const incoming = state.shots[opp];
  if (!incoming.includes("pending")) return null;
  const nextIncoming = incoming.map((shot, index) =>
    shot === "pending" ? (fleet[index] !== null ? "hit" : "miss") : shot,
  );
  const hitsNow = nextIncoming.filter((shot) => shot === "hit").length;
  const asResolved = nextIncoming.map((shot) =>
    shot === "hit" ? "hit" : shot === "miss" ? "miss" : null,
  );
  const sunkMine = shipSpecs
    .filter((ship) => shipSunk(fleet, asResolved, ship.id))
    .map((ship) => ship.id);
  const shots = (me === 0 ? [state.shots[0], nextIncoming] : [nextIncoming, state.shots[1]]) as [
    OnlineShot[],
    OnlineShot[],
  ];
  const sunk = (me === 0 ? [sunkMine, state.sunk[1]] : [state.sunk[0], sunkMine]) as [
    string[],
    string[],
  ];
  const hits = (opp === 0 ? [hitsNow, state.hits[1]] : [state.hits[0], hitsNow]) as [
    number,
    number,
  ];
  const lost = sunkMine.length === shipSpecs.length;
  return { shots, sunk, hits, turn: lost ? opp : me, winner: lost ? opp : null };
}

export function OnlineBattleshipGame() {
  const ctx = useOnlineGame();
  const [game, setGame, sync] = useGameState<NavalShared>(
    () => ({ shots: [empty(), empty()], sunk: [[], []], hits: [0, 0], turn: 0, winner: null }),
    {
      turnSeat: (s) => s.turn,
      outcome: (s) => (s.winner === null ? null : { kind: "win", winnerSeat: s.winner }),
    },
  );
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const me = (sync.mySeat ?? 0) as Seat;
  const opp = other(me);
  const matchId = ctx?.match.id;

  useEffect(() => {
    if (!ctx || !matchId) return;
    let alive = true;
    void loadPrivate<{ fleet?: Fleet }>(matchId, ctx.userId).then(async (result) => {
      if (!alive) return;
      if (result.data?.fleet) return setFleet(result.data.fleet);
      const created = createFleet();
      const saved = await setPrivate(matchId, { fleet: created });
      if (alive && !saved.error) setFleet(created);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const pendingAgainstMe = game.shots[opp].includes("pending");
  useEffect(() => {
    if (!fleet || !sync.canAct || !pendingAgainstMe) return;
    const resolved = resolveIncoming(game, me, fleet);
    if (resolved) setGame(resolved);
  }, [fleet, sync.canAct, pendingAgainstMe, game, me, setGame]);

  if (!ctx) return null;
  if (!fleet)
    return (
      <p className="couple-game-state" role="status">
        Posicionando sua frota secreta…
      </p>
    );

  const myShots = game.shots[me];
  const incoming = game.shots[opp];
  const myTurn = sync.canAct && game.turn === me && !pendingAgainstMe;

  function fire(square: number) {
    if (!myTurn || game.winner !== null || myShots[square] !== null) return;
    const nextMine = myShots.slice();
    nextMine[square] = "pending";
    const shots = (me === 0 ? [nextMine, game.shots[1]] : [game.shots[0], nextMine]) as [
      OnlineShot[],
      OnlineShot[],
    ];
    setGame({ ...game, shots, turn: opp });
  }

  const rows = Array.from({ length: SIZE }, (_, row) => row);
  return (
    <section className="naval-game">
      <div className="naval-scorebar">
        <div className={game.turn === 0 ? "is-active" : ""}>
          <span className="naval-player-token is-one" />
          Pessoa 1 <strong>{game.hits[0]}</strong>
        </div>
        <span className="naval-score-separator">×</span>
        <div className={game.turn === 1 ? "is-active" : ""}>
          <span className="naval-player-token is-two" />
          Pessoa 2 <strong>{game.hits[1]}</strong>
        </div>
      </div>
      <div className="naval-turn-banner">
        <Target aria-hidden="true" />
        <div>
          <strong>
            {myTurn ? "Escolha uma coordenada para disparar." : "Aguardando a outra pessoa."}
          </strong>
          <small>
            Frota adversária afundada: {game.sunk[opp].length}/5 · Disparos pendentes aparecem como
            “?” até a outra pessoa conferir.
          </small>
        </div>
      </div>
      <div className="naval-section-heading">
        <h3>Mar de busca</h3>
        <span>Suas coordenadas de ataque</span>
      </div>
      <div className="naval-board-wrap">
        <div className="naval-axis naval-axis-top">
          <span />{" "}
          {axis.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="naval-board">
          {rows.map((row) => (
            <div className="naval-row" key={row}>
              <span className="naval-row-label">{row + 1}</span>
              {Array.from({ length: SIZE }, (_, col) => {
                const square = row * SIZE + col;
                const shot = myShots[square];
                return (
                  <button
                    key={col}
                    type="button"
                    className={
                      "naval-cell" +
                      (shot === "hit" ? " is-hit" : shot === "miss" ? " is-miss" : "")
                    }
                    onClick={() => fire(square)}
                    disabled={shot !== null || !myTurn}
                    aria-label={`Disparo em ${axis[col]}${row + 1}: ${shot === "hit" ? "acerto" : shot === "miss" ? "água" : shot === "pending" ? "aguardando" : "não disparado"}`}
                  >
                    {shot === "hit" ? "✦" : shot === "miss" ? "·" : shot === "pending" ? "?" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="naval-fleet-status">
        <div>
          <Shield aria-hidden="true" />
          <span>Sua frota</span>
        </div>
        <div className="naval-fleet-dots">
          {shipSpecs.map((ship) => (
            <span
              key={ship.id}
              className={game.sunk[me].includes(ship.id) ? "is-sunk" : ""}
              title={ship.name}
            >
              {ship.id.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <small>Navios restantes: {shipSpecs.length - game.sunk[me].length}/5</small>
      </div>
      <div className="naval-own-board">
        <details>
          <summary>Ver meu mapa de frota</summary>
          <div className="naval-board-wrap is-own">
            <div className="naval-board">
              {rows.map((row) => (
                <div className="naval-row" key={row}>
                  <span className="naval-row-label">{row + 1}</span>
                  {Array.from({ length: SIZE }, (_, col) => {
                    const square = row * SIZE + col;
                    const shot = incoming[square];
                    return (
                      <span
                        key={col}
                        className={
                          "naval-cell" +
                          (fleet[square] ? " is-ship" : "") +
                          (shot === "hit" ? " is-hit" : shot === "miss" ? " is-miss" : "")
                        }
                      >
                        {shot === "hit" ? "✦" : shot === "miss" ? "·" : ""}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
