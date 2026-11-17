import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialCheckersGame, type CheckersGameState } from "@/lib/checkers";

const mocks = vi.hoisted(() => ({
  useGameState: vi.fn(),
  setGame: vi.fn(),
}));

vi.mock("@/components/OnlineGameHost", () => ({
  useGameState: mocks.useGameState,
}));

import { CheckersGame } from "./CheckersGame";

function finishedGame(
  winner: CheckersGameState["winner"],
  drawReason?: CheckersGameState["drawReason"],
): CheckersGameState {
  return {
    ...createInitialCheckersGame(),
    status: "finished",
    winner,
    drawReason,
  };
}

describe("CheckersGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the draw as a dedicated full-screen result with the official reason", () => {
    mocks.useGameState.mockReturnValue([
      finishedGame(null, "threefold-repetition"),
      mocks.setGame,
      { online: false, canAct: true },
    ]);

    render(<CheckersGame />);

    const result = screen.getByRole("dialog", { name: "Empate!" });
    expect(result).toHaveClass("game-victory-screen", "is-draw");
    expect(result).toHaveTextContent("A mesma posição apareceu pela terceira vez");
    expect(result).toHaveTextContent("DAMAS BRASILEIRAS · RESULTADO");
    expect(screen.getByRole("button", { name: /Jogar novamente/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voltar aos jogos/ })).toBeInTheDocument();
  });

  it("distinguishes an AI victory from a player victory in solo mode", () => {
    mocks.useGameState.mockReturnValue([
      finishedGame("black"),
      mocks.setGame,
      { online: false, canAct: true },
    ]);

    render(<CheckersGame solo />);

    const result = screen.getByRole("dialog", { name: "Morados venceram!" });
    expect(result).toHaveClass("is-defeat");
    expect(result).toHaveTextContent("Morados venceram!");
  });

  it("identifies the online mode and locks board controls when it is the other player's turn", () => {
    mocks.useGameState.mockReturnValue([
      createInitialCheckersGame(),
      mocks.setGame,
      { online: true, canAct: false },
    ]);

    render(<CheckersGame />);

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Casa B8, peça verde" })).toBeDisabled();
    expect(screen.getByText(/As jogadas são sincronizadas com a outra conta/)).toBeInTheDocument();
  });

  it("starts a clean game from the full-screen result", () => {
    mocks.useGameState.mockReturnValue([
      finishedGame("white"),
      mocks.setGame,
      { online: false, canAct: true },
    ]);

    render(<CheckersGame />);
    fireEvent.click(screen.getByRole("button", { name: /Jogar novamente/ }));

    expect(mocks.setGame).toHaveBeenCalledTimes(1);
    const nextState = mocks.setGame.mock.calls[0][0] as CheckersGameState;
    expect(nextState.status).toBe("active");
    expect(nextState.turn).toBe("white");
    expect(nextState.positionCounts).toBeDefined();
  });
});
