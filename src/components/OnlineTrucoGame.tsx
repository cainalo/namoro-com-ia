import { useEffect, useRef, useState } from "react";
import { Swords } from "lucide-react";
import { useGameState, useOnlineGame } from "@/components/OnlineGameHost";
import {
  decideHand,
  endHand,
  labels,
  nextRank,
  nextRaise,
  other,
  raiseLabel,
  ranks,
  suits,
  trickWinner,
  TrucoCard,
  type Card,
  type Player,
  type TableCard,
  type TrickWinner,
  type TrucoState,
} from "@/components/TrucoGame";
import { useOnlineHand } from "@/components/useOnlineHand";
import { drawPile, newDealId, resetPile } from "@/lib/online-game";

/** Estado público: hands fica sempre vazio; cada mão vive só no estado privado do titular. */
export type TrucoShared = TrucoState & {
  dealId: string | null;
  handCounts: [number, number];
  lastTable: TableCard[];
};

export function trucoDeck(): Card[] {
  return ranks.flatMap((rank) => suits.map((suit) => ({ id: rank + suit, rank, suit })));
}

export function trucoTurnSeat(s: TrucoShared): Player {
  if (s.phase === "challenge") return other(s.challenger ?? 0);
  if (s.phase === "hand-result") return other(s.handStarter);
  return s.turn;
}

function publicHand(
  score: [number, number],
  starter: Player,
  vira: Card,
  dealId: string,
): TrucoShared {
  return {
    hands: [[], []],
    vira,
    manilha: nextRank(vira.rank),
    handStarter: starter,
    turn: starter,
    table: [],
    tricks: [],
    score: [...score] as [number, number],
    handPoints: 1,
    pendingRaise: null,
    challenger: null,
    phase: "play",
    lastTrick: null,
    handWinner: null,
    handReason: "",
    matchWinner: null,
    dealId,
    handCounts: [3, 3],
    lastTable: [],
  };
}

const placeholder: Card = { id: "4♦", rank: "4", suit: "♦" };

export function OnlineTrucoGame() {
  const ctx = useOnlineGame();
  const [game, setGame, sync] = useGameState<TrucoShared>(
    () => ({ ...publicHand([0, 0], 0, placeholder, ""), dealId: null }),
    {
      turnSeat: trucoTurnSeat,
      outcome: (s) => (s.matchWinner === null ? null : { kind: "win", winnerSeat: s.matchWinner }),
    },
  );
  const me = (sync.mySeat ?? 0) as Player;
  const { hand, setHand, error } = useOnlineHand<Card>(game.dealId, 3);
  const [busy, setBusy] = useState(false);
  const dealing = useRef(false);

  async function deal(score: [number, number], starter: Player) {
    if (!ctx || dealing.current) return;
    dealing.current = true;
    setBusy(true);
    const reset = await resetPile(ctx.match.id, trucoDeck());
    const vira = reset.error ? null : await drawPile(ctx.match.id, 1, null, false);
    const card = Array.isArray(vira?.data) ? (vira!.data[0] as Card) : null;
    if (card) setGame(publicHand(score, starter, card, newDealId()));
    dealing.current = false;
    setBusy(false);
  }

  useEffect(() => {
    if (!ctx || ctx.match.version === 0 || me !== 0 || game.dealId || !sync.canAct) return;
    void deal([0, 0], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.match.version, game.dealId, me, sync.canAct]);

  if (!game.dealId || !hand)
    return (
      <p className="couple-game-state" role="status">
        {error ?? "Embaralhando e distribuindo as cartas…"}
      </p>
    );

  const mine = trucoTurnSeat(game) === me && sync.canAct;
  const canRaise =
    mine &&
    game.phase === "play" &&
    nextRaise(game.handPoints) !== null &&
    game.challenger === null;

  async function playCard(cardId: string) {
    if (!mine || game.phase !== "play" || busy || !hand) return;
    const card = hand.find((item) => item.id === cardId);
    if (!card) return;
    setBusy(true);
    const nextHand = hand.filter((item) => item.id !== cardId);
    if (!(await setHand(nextHand))) return setBusy(false);
    const handCounts = [...game.handCounts] as [number, number];
    handCounts[me] = nextHand.length;
    const table = [...game.table, { player: me, card }];
    if (table.length === 1) {
      setGame({ ...game, table, handCounts, turn: other(me) });
    } else {
      const position = trickWinner(table[0]!.card, table[1]!.card, game.manilha);
      const result: TrickWinner = position === "tie" ? "tie" : table[position]!.player;
      const tricks = [...game.tricks, result];
      const winner = decideHand(tricks, game.handStarter);
      const base: TrucoShared = {
        ...game,
        table,
        tricks,
        handCounts,
        lastTrick: result,
        lastTable: table,
      };
      if (winner !== null) {
        setGame({
          ...(endHand(base, winner, `A mão valeu ${game.handPoints} ponto(s).`) as TrucoShared),
          table: [],
        });
      } else {
        const decisive = [...tricks].reverse().find((r) => r !== "tie");
        const starter =
          result === "tie" ? ((decisive as Player | undefined) ?? game.handStarter) : result;
        setGame({ ...base, table: [], turn: starter, phase: "play" });
      }
    }
    setBusy(false);
  }

  function callRaise() {
    const raise = nextRaise(game.handPoints);
    if (!canRaise || raise === null) return;
    setGame({ ...game, pendingRaise: raise, challenger: me, phase: "challenge" });
  }
  function answer(accept: boolean) {
    if (
      !mine ||
      game.phase !== "challenge" ||
      game.challenger === null ||
      game.pendingRaise === null
    )
      return;
    if (accept)
      setGame({
        ...game,
        handPoints: game.pendingRaise,
        turn: game.challenger,
        pendingRaise: null,
        challenger: null,
        phase: "play",
      });
    else
      setGame(
        endHand(
          game,
          game.challenger,
          `A outra pessoa correu da chamada. A mão valeu ${game.handPoints} ponto(s).`,
        ) as TrucoShared,
      );
  }

  const seatName = (p: Player) => (p === me ? "Você" : "A outra pessoa");
  return (
    <section className="truco-game">
      <div className="truco-scoreboard">
        <div className={game.turn === 0 ? "is-active" : ""}>
          <span className="truco-player-dot is-one" />
          Pessoa 1<strong>{game.score[0]}</strong>
        </div>
        <span className="truco-score-separator">×</span>
        <div className={game.turn === 1 ? "is-active" : ""}>
          <span className="truco-player-dot is-two" />
          Pessoa 2<strong>{game.score[1]}</strong>
        </div>
      </div>
      <div className="truco-round-meta">
        <span>
          Mão vale <strong>{game.handPoints}</strong>
        </span>
        <span>Rodada {Math.min(game.tricks.length + 1, 3)}/3</span>
        <span>Cartas da outra pessoa: {game.handCounts[other(me)]}</span>
      </div>
      <div className="truco-table">
        <div className="truco-vira">
          <small>VIRA · MANILHA</small>
          <div className="truco-vira-cards">
            <TrucoCard card={game.vira} />
            <span className="truco-manilha">Manilha: {game.manilha}</span>
          </div>
        </div>
        <div className="truco-played-cards">
          {(game.table.length ? game.table : game.lastTable).length === 0 ? (
            <p>As cartas jogadas aparecerão aqui.</p>
          ) : (
            (game.table.length ? game.table : game.lastTable).map((item) => (
              <div key={item.card.id}>
                <small>{seatName(item.player)}</small>
                <TrucoCard card={item.card} />
              </div>
            ))
          )}
          {game.lastTrick !== null && game.table.length === 0 && (
            <strong>
              {game.lastTrick === "tie"
                ? "Rodada empatada."
                : `Rodada: ${seatName(game.lastTrick)}.`}
            </strong>
          )}
        </div>
      </div>
      {game.phase === "challenge" && (
        <div className="truco-result-panel">
          <strong>
            {game.challenger === me
              ? `Você pediu ${raiseLabel(game.pendingRaise ?? 3).toLowerCase()}. Aguardando resposta.`
              : `Pediram ${raiseLabel(game.pendingRaise ?? 3).toLowerCase()}!`}
          </strong>
          {mine && (
            <div className="truco-challenge-actions">
              <button type="button" className="primary-action" onClick={() => answer(true)}>
                Aceitar · {game.pendingRaise}
              </button>
              <button type="button" className="secondary-action" onClick={() => answer(false)}>
                Correr · {game.handPoints} ponto(s)
              </button>
            </div>
          )}
        </div>
      )}
      {game.phase === "play" && (
        <>
          <div className="truco-active-turn">
            <strong>{mine ? "Sua vez: escolha uma carta." : "Vez da outra pessoa."}</strong>
            <small>Só você vê sua mão.</small>
          </div>
          <div className="truco-hand">
            {hand.map((card) => (
              <button
                type="button"
                key={card.id}
                className="truco-hand-card"
                onClick={() => void playCard(card.id)}
                disabled={!mine || busy}
                aria-label={`Jogar ${card.rank} de ${labels[card.suit]}`}
              >
                <TrucoCard card={card} />
              </button>
            ))}
          </div>
          <div className="truco-call-actions">
            <button
              type="button"
              className="truco-call-button"
              onClick={callRaise}
              disabled={!canRaise}
            >
              <Swords aria-hidden="true" /> Pedir {raiseLabel(nextRaise(game.handPoints) ?? 12)}
            </button>
          </div>
        </>
      )}
      {game.phase === "hand-result" && (
        <div className="truco-result-panel is-hand-end">
          <strong>{seatName(game.handWinner ?? 0)} venceu a mão.</strong>
          <p>{game.handReason}</p>
          {mine ? (
            <button
              type="button"
              className="primary-action"
              onClick={() => void deal(game.score, other(game.handStarter))}
              disabled={busy}
            >
              Nova mão
            </button>
          ) : (
            <p>A outra pessoa distribui a próxima mão.</p>
          )}
        </div>
      )}
      {error && (
        <p className="couple-game-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
