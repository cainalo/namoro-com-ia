import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CoupleInvestigationGame } from "./CoupleInvestigationGame";
import { CoupleInvestigationTrainGame } from "./CoupleInvestigationTrainGame";

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
    expect(screen.getByRole("heading", { name: "O painel anunciou um trem vazio" })).toBeInTheDocument();
  });
});
