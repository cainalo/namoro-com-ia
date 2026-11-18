import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThisOrThatResults } from "./ThisOrThatResults";

const entries = [
  { id: "one", prompt: "Para viajar, vocês preferem…", firstChoice: "Praia", secondChoice: "Praia", matched: true },
  { id: "two", prompt: "Uma noite a dois…", firstChoice: "Filme", secondChoice: "Jogos", matched: false },
  { id: "three", prompt: "Um dia livre…", firstChoice: "Passear", secondChoice: "Passear", matched: true },
];

describe("ThisOrThatResults", () => {
  it("presents the complete round in an accessible full-screen result", () => {
    render(<ThisOrThatResults mode="local" entries={entries} onExit={vi.fn()} onReplay={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "O que vocês têm em comum?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-result-mode", "local");
    expect(dialog).toHaveTextContent("2/3");
    expect(dialog).toHaveTextContent("67%");
    expect(dialog).toHaveTextContent("2 iguais");
    expect(dialog).toHaveTextContent("1 diferentes");
    expect(dialog.querySelectorAll(".this-or-that-result-list > li")).toHaveLength(3);
    expect(dialog).toHaveTextContent("Pessoa 1");
    expect(dialog).toHaveTextContent("Pessoa 2");
    expect(dialog).toHaveTextContent("Para viajar, vocês preferem…");
  });

  it("explains that the solo opponent is a game profile, not a personality assessment", () => {
    render(<ThisOrThatResults mode="solo" entries={[entries[0]]} onExit={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Você e Morados" })).toHaveTextContent(
      "perfil de respostas criado pelo próprio jogo",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("não uma avaliação real de personalidade");
    expect(screen.getByText("Morados")).toBeInTheDocument();
  });

  it("exits or starts another round through the supplied actions", () => {
    const onExit = vi.fn();
    const onReplay = vi.fn();
    render(<ThisOrThatResults mode="local" entries={entries} onExit={onExit} onReplay={onReplay} />);

    fireEvent.click(screen.getByRole("button", { name: "Jogar outra rodada" }));
    expect(onReplay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Voltar aos jogos" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
