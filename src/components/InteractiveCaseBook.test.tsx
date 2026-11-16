import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CoupleInvestigationGame, CoupleInvestigationTrainGame } from "./CoupleInvestigationGame";
import { CoupleTrainInvestigationBook } from "./CoupleInvestigationTrainGame";

describe("Interactive investigation casebooks", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders the hotel case and its document index without a constructor error", () => {
    render(<CoupleInvestigationGame solo />);
    expect(screen.getByRole("heading", { name: "O telefone atrás da parede" })).toBeInTheDocument();
    expect(screen.getByText(/ARQUIVO DE INVESTIGAÇÃO/)).toBeInTheDocument();
  });

  it("renders the train casebook through its public game entry point", () => {
    render(<CoupleInvestigationTrainGame solo />);
    expect(screen.getByRole("heading", { name: /Santa Íria|plataforma/i })).toBeInTheDocument();
  });
});
