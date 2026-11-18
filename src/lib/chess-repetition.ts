export type ChessIdentityColor = "w" | "b";
export type ChessIdentityKind = "K" | "Q" | "R" | "B" | "N" | "P";
export type ChessPositionIdentity = {
  board: ReadonlyArray<{ color: ChessIdentityColor; kind: ChessIdentityKind } | null>;
  turn: ChessIdentityColor;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: number | null;
};

/**
 * Identifies the rule-relevant parts of a position. Move counters are
 * deliberately excluded: they affect the 50/75-move rules, not repetition.
 */
export function chessPositionKey(position: ChessPositionIdentity): string {
  const board = position.board
    .map((piece) => piece ? piece.color + piece.kind : "--")
    .join("");
  const castling = [
    position.castling.wK,
    position.castling.wQ,
    position.castling.bK,
    position.castling.bQ,
  ].map((right) => right ? "1" : "0").join("");
  const enPassant = position.enPassant === null ? "-" : String(position.enPassant);

  return `${board}|${position.turn}|${castling}|${enPassant}`;
}

/** Counts the current occurrence plus every matching position before it. */
export function countChessPositionRepetitions(
  history: readonly ChessPositionIdentity[],
  current: ChessPositionIdentity,
): number {
  const currentKey = chessPositionKey(current);
  return 1 + history.reduce(
    (count, previous) => count + Number(chessPositionKey(previous) === currentKey),
    0,
  );
}
