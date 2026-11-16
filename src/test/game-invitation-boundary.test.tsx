import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameInvitationBoundary } from "@/components/GameInvitationBoundary";

function BrokenOptionalFeature(): never {
  throw new Error("simulated invitation initialization failure");
}

describe("GameInvitationBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("isolates an invitation feature crash and keeps the main app rendered", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <main>
        <p>Feed carregado</p>
        <GameInvitationBoundary>
          <BrokenOptionalFeature />
        </GameInvitationBoundary>
        <button type="button">Navegação principal</button>
      </main>,
    );

    expect(screen.getByText("Feed carregado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Navegação principal" })).toBeInTheDocument();
    expect(error).toHaveBeenCalled();
  });

  it("does not remount the broken feature after later app updates", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { rerender } = render(
      <div>
        <p>Estado normal</p>
        <GameInvitationBoundary><BrokenOptionalFeature /></GameInvitationBoundary>
      </div>,
    );
    rerender(
      <div>
        <p>Estado atualizado</p>
        <GameInvitationBoundary><BrokenOptionalFeature /></GameInvitationBoundary>
      </div>,
    );
    expect(screen.getByText("Estado atualizado")).toBeInTheDocument();
  });
});
