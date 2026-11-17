import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  play: vi.fn(),
  createGameInvitation: vi.fn(),
}));

vi.mock("@/components/CheckersGame", () => ({
  CheckersGame: ({ solo }: { solo?: boolean }) => <div data-testid="checkers-game">{solo ? "individual" : "shared"}</div>,
}));
vi.mock("@/components/ConnectFourGame", () => ({
  ConnectFourGame: () => <div data-testid="connect-four-game">Lig 4</div>,
}));
vi.mock("@/components/CoupleDailyChallenge", () => ({
  CoupleDailyChallenge: () => <div data-testid="online-daily">Desafio online</div>,
}));
vi.mock("@/components/CoupleGame", () => ({
  CoupleGame: () => <div data-testid="online-choice">Isto ou aquilo online</div>,
}));
vi.mock("@/components/CoupleInvestigationGame", () => ({
  CoupleInvestigationGame: ({ solo }: { solo?: boolean }) => <div data-testid="investigation-game">{solo ? "individual" : "shared"}</div>,
}));
vi.mock("@/components/CoupleInvestigationTrainGame", () => ({
  CoupleInvestigationTrainGame: () => <div data-testid="train-game">Trem</div>,
}));
vi.mock("@/components/ChessGame", () => ({
  ChessGame: () => <div data-testid="chess-game">Xadrez</div>,
}));
vi.mock("@/components/BattleshipGame", () => ({
  BattleshipGame: () => <div data-testid="battleship-game">Batalha Naval</div>,
}));
vi.mock("@/components/DominoGame", () => ({
  DominoGame: () => <div data-testid="domino-game">Dominó</div>,
}));
vi.mock("@/components/TrucoGame", () => ({
  TrucoGame: () => <div data-testid="truco-game">Truco</div>,
}));
vi.mock("@/components/QuizGame", () => ({
  QuizGame: () => <div data-testid="quiz-game">Quiz em partida</div>,
}));
vi.mock("@/components/EscapeRoomGame", () => ({
  EscapeRoomGame: () => <div data-testid="escape-game">Escape room</div>,
}));
vi.mock("@/components/IslandSurvivalGame", () => ({
  IslandSurvivalGame: () => <div data-testid="survival-game">Sobrevivência</div>,
}));
vi.mock("@/components/CaveExpeditionGame", () => ({
  CaveExpeditionGame: () => <div data-testid="cave-game">Ruínas</div>,
}));
vi.mock("@/components/InlineMenu", () => ({
  InlineMenu: ({ trigger }: { trigger: ReactNode }) => <div>{trigger}</div>,
}));
vi.mock("@/components/GameExperience", () => ({
  GameAudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GameAudioToggle: () => <button type="button">Áudio</button>,
  useGameAudio: () => ({ play: mocks.play }),
}));
vi.mock("@/components/OnlineGameHost", () => ({
  OnlineGameHost: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/OnlineBattleshipGame", () => ({
  OnlineBattleshipGame: () => <div>Batalha naval online</div>,
}));
vi.mock("@/components/OnlineDominoGame", () => ({
  OnlineDominoGame: () => <div>Dominó online</div>,
}));
vi.mock("@/components/OnlineTrucoGame", () => ({
  OnlineTrucoGame: () => <div>Truco online</div>,
}));
vi.mock("@/components/LocalCoupleGames", () => ({
  LocalConnectFourGame: ({ solo }: { solo?: boolean }) => <div data-testid="local-connect-four">{solo ? "individual" : "shared"}</div>,
  LocalDailyChallengeGame: () => <div data-testid="local-daily">Desafio local</div>,
  LocalThisOrThatGame: () => <div data-testid="local-choice">Escolhas locais</div>,
}));
vi.mock("@/lib/game-invitations", () => ({
  createGameInvitation: mocks.createGameInvitation,
  onlineGameInvitationError: () => "Não foi possível enviar o convite.",
}));

import { CoupleGames } from "./CoupleGames";

function renderLibrary() {
  return render(<CoupleGames userId="user-1" onNavigate={vi.fn()} />);
}

describe("CoupleGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createGameInvitation.mockResolvedValue({ data: "invitation-1", error: null });
  });

  it("shows the real catalogue and reports the active filter result count", () => {
    renderLibrary();

    expect(screen.getByRole("heading", { name: "Jogos" })).toBeInTheDocument();
    expect(screen.getByLabelText("14 experiências disponíveis")).toBeInTheDocument();
    expect(document.querySelector(".games-hub-result-count")).toHaveTextContent("14 experiências disponíveis");

    fireEvent.click(screen.getByRole("button", { name: "Investigação" }));

    expect(screen.getByRole("button", { name: "Abrir A Hospedagem dos Ausentes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir O Último Trem de Santa Íria" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir A sala do relógio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir Xadrez" })).not.toBeInTheDocument();
    expect(document.querySelector(".games-hub-result-count")).toHaveTextContent("3 experiências disponíveis");
  });

  it("opens an individual story briefing with premise, objective and expandable instructions", () => {
    renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Abrir A Hospedagem dos Ausentes" }));

    expect(screen.getByRole("heading", { name: "A Hospedagem dos Ausentes" })).toBeInTheDocument();
    expect(screen.getByText("O cenário")).toBeInTheDocument();
    expect(screen.getByText(/Hotel Orfeu encerrou as atividades/)).toBeInTheDocument();
    expect(screen.getByText("Objetivo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Como funciona"));
    expect(screen.getByText(/Leiam os capítulos como uma história policial/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Começar experiência" }));
    expect(screen.getByRole("heading", { name: "Como você quer jogar?" })).toBeInTheDocument();
    expect(screen.getByText(/compartilham a tela/)).toBeInTheDocument();
    expect(screen.getByText(/convite privado/)).toBeInTheDocument();
  });

  it("opens the chosen game mode and allows pausing without unmounting the game", () => {
    renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Abrir Quiz dos dois" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar experiência" }));
    fireEvent.click(screen.getByRole("button", { name: /Jogar sozinho/ }));

    expect(screen.getByTestId("quiz-game")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar uma etapa" }));
    expect(screen.getByRole("heading", { name: "Partida pausada" })).toBeInTheDocument();
    expect(screen.getByTestId("quiz-game")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuar jogando" }));
    expect(screen.queryByRole("heading", { name: "Partida pausada" })).not.toBeInTheDocument();
    expect(screen.getByTestId("quiz-game")).toBeInTheDocument();
  });
});
