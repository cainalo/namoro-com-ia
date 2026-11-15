import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCoupleAccount } from "./account-lifecycle";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  invoke: vi.fn(),
  isNativePlatform: vi.fn(() => false),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));

describe("deleteCoupleAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not make a request unless the exact confirmation word is supplied", async () => {
    await expect(deleteCoupleAccount("excluir")).rejects.toThrow("Digite EXCLUIR para confirmar.");
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("requires an active session before invoking the secure deletion function", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(deleteCoupleAccount("EXCLUIR")).rejects.toThrow("Entre novamente para excluir a conta.");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("shows the server's actionable error instead of a generic fetch failure", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    });
    const response = new Response(
      JSON.stringify({ ok: false, error: "Não foi possível concluir a exclusão. Tente novamente." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "Edge Function returned a non-2xx status code", context: response },
    });

    await expect(deleteCoupleAccount("EXCLUIR"))
      .rejects.toThrow("Não foi possível concluir a exclusão. Tente novamente.");
    expect(mocks.invoke).toHaveBeenCalledWith("delete-couple", {
      body: { confirmation: "EXCLUIR" },
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("translates network failures into a useful message", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    });
    mocks.invoke.mockResolvedValue({ data: null, error: new Error("Failed to fetch") });

    await expect(deleteCoupleAccount("EXCLUIR"))
      .rejects.toThrow("Não foi possível conectar ao serviço seguro de exclusão.");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
