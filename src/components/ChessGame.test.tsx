import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: null as unknown,
  setChess: vi.fn(),
  sync: { online: false, mySeat: null, canAct: true },
}));

vi.mock("@/components/OnlineGameHost", () => ({
  useGameState: () => [mocks.state, mocks.setChess, mocks.sync],
}));

import { ChessGame } from "./ChessGame";

function makePosition(overrides: Record<string, unknown> = {}) {
  const board: Array<{ color: "w" | "b"; kind: "K" | "Q" | "R" | "B" | "N" | "P" } | null> = Array(64).fill(null);
  board[60] = { color: "w", kind: "K" };
  board[4] = { color: "b", kind: "K" };
  board[62] = { color: "w", kind: "N" };
  board[6] = { color: "b", kind: "N" };
  return {
    board,
    turn: "w" as const,
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    enPassant: null,
    halfMoves: 0,
    fullMoves: 1,
    ...overrides,
  };
}

function setGameState(position = makePosition(), history = [] as ReturnType<typeof makePosition>[], extra: Record<string, unknown> = {}) {
  mocks.state = {
    position,
    history,
    notation: [],
    drawClaimed: null,
    ...extra,
  };
}

describe("ChessGame draw rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sync = { online: false, mySeat: null, canAct: true };
    setGameState();
  });

  it("offers a threefold-repetition claim only after the same position has appeared three times", () => {
    const repeated = makePosition();
    setGameState(repeated, [makePosition(), makePosition()]);

    render(<ChessGame />);

    expect(screen.getByRole("button", { name: "Reivindicar empate por repetição" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Empate!" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("A mesma posição apareceu três vezes");

    fireEvent.click(screen.getByRole("button", { name: "Reivindicar empate por repetição" }));

    expect(mocks.setChess).toHaveBeenCalledTimes(1);
    const update = mocks.setChess.mock.calls[0][0] as (current: typeof mocks.state) => { drawClaimed: string };
    expect(update(mocks.state).drawClaimed).toBe("threefold-repetition");
  });

  it("offers the 50-move draw claim at 100 half-moves without making it automatic", () => {
    setGameState(makePosition({ halfMoves: 100 }));

    render(<ChessGame />);

    expect(screen.getByRole("button", { name: "Reivindicar empate pelos 50 lances" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Empate!" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reivindicar empate pelos 50 lances" }));

    const update = mocks.setChess.mock.calls[0][0] as (current: typeof mocks.state) => { drawClaimed: string };
    expect(update(mocks.state).drawClaimed).toBe("fifty-move-rule");
  });

  it("ends automatically after fivefold repetition", () => {
    const repeated = makePosition();

    setGameState(repeated, [makePosition(), makePosition(), makePosition(), makePosition()]);

    render(<ChessGame />);

    const result = screen.getByRole("dialog", { name: "Empate!" });
    expect(result).toHaveClass("game-victory-screen", "is-draw");
    expect(result).toHaveTextContent("a mesma posição apareceu cinco vezes");
    expect(screen.queryByRole("button", { name: "Reivindicar empate por repetição" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova partida" })).toBeInTheDocument();
  });

  it("ends automatically after 75 moves without a pawn move or capture", () => {
    setGameState(makePosition({ halfMoves: 150 }));

    render(<ChessGame />);

    const result = screen.getByRole("dialog", { name: "Empate!" });
    expect(result).toHaveTextContent("regra dos 75 lances");
    expect(result).toHaveTextContent("Peças no tabuleiro");
  });

  it("keeps checkmate ahead of the automatic 75-move draw", () => {
    const board: Array<{ color: "w" | "b"; kind: "K" | "Q" | "R" | "B" | "N" | "P" } | null> = Array(64).fill(null);
    board[63] = { color: "w", kind: "K" };
    board[45] = { color: "b", kind: "K" };
    board[54] = { color: "b", kind: "Q" };
    setGameState(makePosition({ board, turn: "w", halfMoves: 150 }));

    render(<ChessGame solo />);

    const result = screen.getByRole("dialog", { name: "Morados venceram!" });
    expect(result).toHaveClass("is-defeat");
    expect(result).toHaveTextContent("Xeque-mate!");
    expect(screen.queryByRole("dialog", { name: "Empate!" })).not.toBeInTheDocument();
  });

  it("keeps an online board locked when it is not this player's turn", () => {
    mocks.sync = { online: true, mySeat: 1, canAct: false };

    render(<ChessGame />);

    expect(screen.queryByRole("button", { name: /Reivindicar empate/ })).not.toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "g1: branca cavalo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Desfazer/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Reiniciar/ })).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
