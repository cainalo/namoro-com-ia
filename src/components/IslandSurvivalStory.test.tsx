import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IslandSurvivalStory } from "./IslandSurvivalStory";

const mockSurvivalState = vi.hoisted(() => ({
  game: {
    node: "day1-beach" as string,
    resources: { food: 4, water: 5, wood: 1, cloth: 1, metal: 0, medicine: 0, rope: 0, battery: 0 },
    inventory: ["transmissor quebrado", "chave de latão de Noah"],
    decisions: {} as Record<string, string>,
    flags: [] as string[],
    puzzleAnswers: {} as Record<string, string>,
    day: 1,
    health: 5,
    trust: 0,
    finished: false,
    ending: "",
  },
  setGame: vi.fn(),
}));

vi.mock("@/components/OnlineGameHost", () => ({
  useGameState: () => [mockSurvivalState.game, mockSurvivalState.setGame, { online: false, mySeat: null, canAct: true }],
}));

describe("IslandSurvivalStory", () => {
  beforeEach(() => {
    mockSurvivalState.game.node = "day1-beach";
    mockSurvivalState.game.day = 1;
    mockSurvivalState.setGame.mockClear();
    window.localStorage.clear();
  });

  it("opens the journal modal and renders its choices without a page error", () => {
    render(<IslandSurvivalStory />);
    fireEvent.click(screen.getByRole("button", { name: /abrir caderno de bordo/i }));

    expect(screen.getByRole("dialog", { name: "Caderno de bordo" })).toBeInTheDocument();
    expect(screen.getByText(/decisão desta cena/i)).toBeInTheDocument();
    expect(screen.getByText("Seguir as pegadas até a enseada")).toBeInTheDocument();
  });

  it("moves to the next story page without calling an undefined notice setter", () => {
    mockSurvivalState.game.node = "day1-cove";
    render(<IslandSurvivalStory />);
    fireEvent.click(screen.getByRole("button", { name: /virar a página/i }));

    expect(mockSurvivalState.setGame).toHaveBeenCalledTimes(1);
    expect(mockSurvivalState.setGame.mock.calls[0][0]).toMatchObject({ node: "day1-night" });
  });
});
