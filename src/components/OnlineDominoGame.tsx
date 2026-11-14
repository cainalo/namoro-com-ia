import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useGameState, useOnlineGame } from "@/components/OnlineGameHost";
import { DominoTileView, pipCount, placeTile, playable, type DominoState, type Placed, type Tile } from "@/components/DominoGame";
import { useOnlineHand } from "@/components/useOnlineHand";
import { newDealId, resetPile, type Seat } from "@/lib/online-game";

/** Estado público do dominó: nenhuma mão nem o monte aparecem aqui, só contagens. */
export type DominoShared = {
  dealId: string | null;
  line: Placed[];
  left: number | null;
  right: number | null;
  turn: Seat;
  passes: number;
  stockCount: number;
  handCounts: [number, number];
  pips: [number | null, number | null];
  winner: Seat | "draw" | null;
  reason: string | null;
};

export function allDominoTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push({ id: `${a}-${b}`, a, b });
  return tiles;
}

export function blockedWinner(pips: [number, number]): Seat | "draw" {
  return pips[0] === pips[1] ? "draw" : pips[0] < pips[1] ? 0 : 1;
}

export function OnlineDominoGame() {
  const ctx = useOnlineGame();
  const [game, setGame, sync] = useGameState<DominoShared>(
    () => ({ dealId: null, line: [], left: null, right: null, turn: 0, passes: 0, stockCount: 28, handCounts: [0, 0], pips: [null, null], winner: null, reason: null }),
    {
      turnSeat: (s) => s.turn,
      outcome: (s) => (s.winner === null ? null : s.winner === "draw" ? { kind: "draw" } : { kind: "win", winnerSeat: s.winner }),
    },
  );
  const me = (sync.mySeat ?? 0) as Seat;
  const opp: Seat = me === 0 ? 1 : 0;
  const { hand, setHand, draw, error } = useOnlineHand<Tile>(game.dealId, 7);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dealt = useRef(false);

  // A primeira pessoa embaralha no servidor e abre a mesa.
  useEffect(() => {
    if (!ctx || ctx.match.version === 0 || me !== 0 || game.dealId || !sync.canAct || dealt.current) return;
    dealt.current = true;
    const dealId = newDealId();
    void resetPile(ctx.match.id, allDominoTiles()).then((result) => {
      if (result.error) {
        dealt.current = false;
        return;
      }
      setGame({ ...game, dealId, stockCount: 14, handCounts: [7, 7] });
    });
  }, [ctx, game, me, setGame, sync.canAct]);

  if (!game.dealId || !hand) return <p className="couple-game-state" role="status">{error ?? "Embaralhando e distribuindo as peças…"}</p>;

  const myTurn = sync.canAct && game.turn === me && game.winner === null;
  const canPlayAny = hand.some((tile) => playable(tile, game.left, game.right));
  const current = hand.find((tile) => tile.id === selected) ?? null;
  const canLeft = Boolean(current && (game.left === null || current.a === game.left || current.b === game.left));
  const canRight = Boolean(current && (game.right === null || current.a === game.right || current.b === game.right));

  async function place(side: "left" | "right") {
    if (!myTurn || !selected || busy || !hand) return;
    const pseudo: DominoState = {
      hands: (me === 0 ? [hand, []] : [[], hand]) as [Tile[], Tile[]],
      stock: [], line: game.line, turn: me, left: game.left, right: game.right, selected, passes: 0, winner: null, reason: null,
    };
    const next = placeTile(pseudo, side);
    if (!next) return;
    setBusy(true);
    const nextHand = next.hands[me];
    if (await setHand(nextHand)) {
      const handCounts = [...game.handCounts] as [number, number];
      handCounts[me] = nextHand.length;
      const won = nextHand.length === 0;
      setGame({ ...game, line: next.line, left: next.left, right: next.right, turn: won ? me : opp, passes: 0, handCounts, winner: won ? me : null, reason: won ? "Um jogador ficou sem peças." : null });
      setSelected(null);
    }
    setBusy(false);
  }

  async function buy() {
    if (!myTurn || canPlayAny || game.stockCount <= 0 || busy) return;
    setBusy(true);
    const next = await draw(1);
    if (next) {
      const handCounts = [...game.handCounts] as [number, number];
      handCounts[me] = next.length;
      setGame({ ...game, stockCount: game.stockCount - 1, handCounts });
    }
    setBusy(false);
  }

  function pass() {
    if (!myTurn || canPlayAny || game.stockCount > 0 || !hand) return;
    const pips = [...game.pips] as [number | null, number | null];
    pips[me] = pipCount(hand);
    const passes = game.passes + 1;
    if (passes >= 2 && pips[0] !== null && pips[1] !== null) {
      setGame({ ...game, pips, passes, winner: blockedWinner([pips[0], pips[1]]), reason: "Mesa bloqueada. Vence quem terminou com menos pontos na mão." });
    } else {
      setGame({ ...game, pips, passes, turn: opp });
    }
  }

  return (
    <section className="domino-game">
      <div className="domino-scorebar">
        <div className={game.turn === 0 ? "is-active" : ""}><span className="domino-token is-one" />Pessoa 1 <strong>{game.handCounts[0]}</strong><small>peças</small></div>
        <div className={game.turn === 1 ? "is-active" : ""}><span className="domino-token is-two" />Pessoa 2 <strong>{game.handCounts[1]}</strong><small>peças</small></div>
      </div>
      <div className="domino-table-status" role="status" aria-live="polite">
        <strong>{myTurn ? "Sua vez" : "Vez da outra pessoa"}</strong>
        <span>{game.stockCount} peças na compra · {game.line.length} na mesa</span>
      </div>
      <div className="domino-line-wrap">
        <div className="domino-end-labels"><span>← {game.left ?? "Esquerda"}</span><span>{game.right ?? "Direita"} →</span></div>
        <div className="domino-line">
          {game.line.length ? game.line.map((placed, index) => <DominoTileView key={placed.tile.id + "-" + index} a={placed.a} b={placed.b} />) : <p>Escolha uma peça para abrir a partida.</p>}
        </div>
      </div>
      <div className="domino-turn-call">Sua mão · {pipCount(hand)} pontos</div>
      <div className="domino-hand" aria-label="Sua mão">
        {hand.map((tile) => (
          <button key={tile.id} type="button" className={"domino-hand-tile" + (selected === tile.id ? " is-selected" : "")} onClick={() => setSelected(selected === tile.id ? null : tile.id)} aria-pressed={selected === tile.id} disabled={!myTurn}>
            <DominoTileView a={tile.a} b={tile.b} />
          </button>
        ))}
      </div>
      <div className="domino-play-actions">
        <button type="button" className="primary-action" onClick={() => void place("left")} disabled={!myTurn || !canLeft || busy}>Colocar à esquerda</button>
        <button type="button" className="primary-action" onClick={() => void place("right")} disabled={!myTurn || !canRight || busy}>Colocar à direita</button>
      </div>
      <div className="domino-table-actions">
        <button type="button" className="inline-action" onClick={() => void buy()} disabled={!myTurn || canPlayAny || game.stockCount === 0 || busy}><ShoppingCart /> Comprar peça ({game.stockCount})</button>
        <button type="button" className="inline-action" onClick={pass} disabled={!myTurn || canPlayAny || game.stockCount > 0}>Passar</button>
      </div>
      {error && <p className="couple-game-error" role="alert">{error}</p>}
    </section>
  );
}
