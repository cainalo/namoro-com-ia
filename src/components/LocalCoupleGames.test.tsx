import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalConnectFourGame, LocalDailyChallengeGame, LocalThisOrThatGame } from "./LocalCoupleGames";

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
    const moveStats = result.querySelector(".morados-connect-four-result-stats");
    expect(moveStats?.querySelector("strong")).toHaveTextContent("7");
    expect(moveStats?.querySelector("span")).toHaveTextContent("jogadas");
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


describe("LocalThisOrThatGame", () => {
  function choose(container: HTMLElement, option: 0 | 1) {
    const buttons = container.querySelectorAll<HTMLButtonElement>(".local-choice-options > button");
    const button = buttons[option];
    if (!button) throw new Error("The current question does not expose both choices.");
    fireEvent.click(button);
  }

  it("finishes solo mode with a dedicated result and starts a fresh round", () => {
    const { container } = render(<LocalThisOrThatGame solo />);

    for (let question = 0; question < 15; question += 1) {
      choose(container, 0);
    }

    const result = screen.getByRole("dialog", { name: "Você e Morados" });
    expect(result).toHaveAttribute("data-result-mode", "solo");
    expect(result.querySelectorAll(".this-or-that-result-list > li")).toHaveLength(15);
    expect(result).toHaveTextContent("Você");
    expect(result).toHaveTextContent("Morados");
    expect(result).toHaveTextContent("perfil de respostas criado pelo próprio jogo");

    fireEvent.click(screen.getByRole("button", { name: "Jogar outra rodada" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Pergunta 1 de 15")).toBeInTheDocument();
  });

  it("keeps each player's answers hidden during handoff and reveals the full comparison at the end", () => {
    const { container } = render(<LocalThisOrThatGame />);
    const onExit = vi.fn();
    window.addEventListener("morados:game-exit", onExit);

    for (let question = 0; question < 15; question += 1) {
      choose(container, 0);
      expect(screen.getByRole("heading", { name: "Passe o aparelho para a Pessoa 2." })).toBeInTheDocument();
      expect(container.querySelector(".local-choice-results")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Estou com o aparelho" }));
      choose(container, 0);
    }

    const result = screen.getByRole("dialog", { name: "O que vocês têm em comum?" });
    expect(result).toHaveAttribute("data-result-mode", "local");
    expect(result.querySelectorAll(".this-or-that-result-list > li.is-matched")).toHaveLength(15);
    expect(result.querySelectorAll(".this-or-that-result-list > li.is-different")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Voltar aos jogos" }));
    expect(onExit).toHaveBeenCalledTimes(1);
    window.removeEventListener("morados:game-exit", onExit);
  });
});


describe("LocalDailyChallengeGame", () => {
  it("completes the solo mission with a full-screen result and can retry", () => {
    render(<LocalDailyChallengeGame solo />);

    expect(screen.getByText(/DESAFIO INDIVIDUAL/)).toBeInTheDocument();
    expect(screen.getByText(/[0-9]+ minutos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Marcar conclusão/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Marcar conclusão/ }));

    const result = screen.getByRole("dialog", { name: "Missão cumprida!" });
    expect(result).toHaveAttribute("aria-modal", "true");
    expect(result).toHaveTextContent("1/1");

    fireEvent.click(screen.getByRole("button", { name: "Refazer missão" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Marcar conclusão/ })).toBeInTheDocument();
  });

  it("does not show the shared victory until both local players complete", () => {
    render(<LocalDailyChallengeGame />);
    const onExit = vi.fn();
    window.addEventListener("morados:game-exit", onExit);

    const buttons = screen.getAllByRole("button", { name: /Marcar conclusão/ });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(screen.queryByRole("dialog", { name: "Vocês conseguiram!" })).not.toBeInTheDocument();
    expect(screen.getByText(/Uma pessoa já concluiu/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Marcar conclusão/ }));
    const result = screen.getByRole("dialog", { name: "Vocês conseguiram!" });
    expect(result).toHaveTextContent("2/2");

    fireEvent.click(screen.getByRole("button", { name: "Voltar aos jogos" }));
    expect(onExit).toHaveBeenCalledTimes(1);
    window.removeEventListener("morados:game-exit", onExit);
  });
});
