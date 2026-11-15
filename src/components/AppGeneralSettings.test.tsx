import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppGeneralSettings } from "./AppGeneralSettings";

const nativePlatform = vi.hoisted(() => ({ enabled: false }));
const nativeTextInput = vi.hoisted(() => vi.fn());

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => nativePlatform.enabled },
}));

vi.mock("@/lib/native-auth", () => ({
  NativeAuth: { showTextInputDialog: nativeTextInput },
}));

vi.mock("@/lib/account-lifecycle", () => ({
  deleteCoupleAccount: vi.fn(),
}));

describe("AppGeneralSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativePlatform.enabled = false;
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

  it("uses the Android native text dialog instead of focusing an HTML input in the APK", async () => {
    nativePlatform.enabled = true;
    nativeTextInput.mockResolvedValue({ cancelled: false, text: "EXCLUIR" });

    render(<AppGeneralSettings />);
    fireEvent.click(screen.getByRole("button", { name: /configurações gerais do app/i }));
    fireEvent.click(screen.getByRole("button", { name: /excluir conta do casal/i }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const removeButton = screen.getByRole("button", { name: /excluir definitivamente/i });
    expect(removeButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Digitar EXCLUIR" }));

    await waitFor(() => expect(removeButton).toBeEnabled());
    expect(nativeTextInput).toHaveBeenCalledWith(expect.objectContaining({
      title: "Confirmar exclusão da conta",
      hint: "EXCLUIR",
      maxLength: 7,
      singleLine: true,
    }));
    expect(screen.getByRole("button", { name: "EXCLUIR" })).toBeInTheDocument();
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
