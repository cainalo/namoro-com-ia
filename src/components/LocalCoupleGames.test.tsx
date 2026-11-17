import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalConnectFourGame } from "./LocalCoupleGames";

function drop(column: number) {
  fireEvent.click(screen.getByRole("button", { name: `Soltar peça na coluna ${column}` }));
}

describe("LocalConnectFourGame", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a dedicated full-screen result when player one wins and can restart", () => {
    const { container } = render(<LocalConnectFourGame />);

    [1, 2, 1, 2, 1, 2, 1].forEach(drop);

    const result = screen.getByRole("dialog", { name: "Pessoa 1 venceu!" });
    expect(result).toHaveAttribute("data-outcome", "victory");
    expect(result).toHaveClass("morados-connect-four-result");
    expect(result).toHaveTextContent("Quatro peças em linha.");
    expect(result.querySelector(".morados-connect-four-result-stats")).toHaveTextContent(/7\\s*jogadas/);
    expect(screen.getByRole("button", { name: "Voltar à biblioteca" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jogar novamente" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Vez de Pessoa 1");
    expect(container.querySelectorAll('.connect-four-cell[aria-label$="vazia"]')).toHaveLength(42);
  });

  it("identifies a player-two win without changing the winner order", () => {
    render(<LocalConnectFourGame />);

    [1, 2, 1, 2, 1, 2, 3, 2].forEach(drop);

    expect(screen.getByRole("dialog", { name: "Pessoa 2 venceu!" })).toHaveAttribute("data-outcome", "defeat");
  });

  it("returns to the game library through the existing game-exit event", () => {
    render(<LocalConnectFourGame />);
    const onExit = vi.fn();
    window.addEventListener("morados:game-exit", onExit);

    [1, 2, 1, 2, 1, 2, 1].forEach(drop);
    fireEvent.click(screen.getByRole("button", { name: "Voltar à biblioteca" }));

    expect(onExit).toHaveBeenCalledTimes(1);
    window.removeEventListener("morados:game-exit", onExit);
  });
});
