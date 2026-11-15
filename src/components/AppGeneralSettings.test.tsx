import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppGeneralSettings } from "./AppGeneralSettings";

vi.mock("@/lib/account-lifecycle", () => ({
  deleteCoupleAccount: vi.fn(),
}));

describe("AppGeneralSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens and closes settings in the page flow without a modal overlay", () => {
    render(<AppGeneralSettings />);
    const trigger = screen.getByRole("button", { name: /configurações gerais do app/i });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Configurações gerais do app" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /excluir conta do casal/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Configurações gerais do app" })).not.toBeInTheDocument();
  });

  it("requires the explicit confirmation word before enabling account deletion", () => {
    render(<AppGeneralSettings />);
    fireEvent.click(screen.getByRole("button", { name: /configurações gerais do app/i }));
    fireEvent.click(screen.getByRole("button", { name: /excluir conta do casal/i }));

    const removeButton = screen.getByRole("button", { name: /excluir definitivamente/i });
    expect(removeButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Digite EXCLUIR"), { target: { value: "EXCLUIR" } });
    expect(removeButton).toBeEnabled();
  });
});
