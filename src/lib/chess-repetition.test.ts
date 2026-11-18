import { describe, expect, it } from "vitest";
import {
  chessPositionKey,
  countChessPositionRepetitions,
  type ChessPositionIdentity,
} from "./chess-repetition";

function position(overrides: Partial<ChessPositionIdentity> = {}): ChessPositionIdentity {
  const board: ChessPositionIdentity["board"] = Array(64).fill(null);
  const pieces = [
    [60, { color: "w", kind: "K" }],
    [4, { color: "b", kind: "K" }],
    [62, { color: "w", kind: "N" }],
    [6, { color: "b", kind: "N" }],
  ] as const;
  for (const [square, piece] of pieces) {
    (board as Array<ChessPositionIdentity["board"][number]>)[square] = piece;
  }

  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    ...overrides,
  };
}

describe("chess repetition identity", () => {
  it("counts the current position and its two previous occurrences as a threefold repetition", () => {
    const repeated = position();

    expect(countChessPositionRepetitions([repeated, position()], repeated)).toBe(3);
    expect(countChessPositionRepetitions([repeated], repeated)).toBe(2);
  });

  it("distinguishes positions with a different side to move", () => {
    const current = position();

    expect(chessPositionKey(current)).not.toBe(
      chessPositionKey(position({ turn: "b" })),
    );
    expect(countChessPositionRepetitions([position({ turn: "b" })], current)).toBe(1);
  });

  it("distinguishes positions with different castling rights", () => {
    const current = position();

    expect(chessPositionKey(current)).not.toBe(
      chessPositionKey(position({ castling: { wK: false, wQ: true, bK: true, bQ: true } })),
    );
  });

  it("distinguishes positions with different en passant rights", () => {
    const current = position();

    expect(chessPositionKey(current)).not.toBe(
      chessPositionKey(position({ enPassant: 20 })),
    );
  });

  it("does not include move counters in the repetition identity", () => {
    const current = position();

    expect(chessPositionKey(current)).toBe(chessPositionKey(position()));
  });
});
