import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: true,
  showTextInputDialog: vi.fn(),
  updates: [] as Record<string, unknown>[],
  pendingUpdate: false,
  pendingTourUpdate: false,
  navigate: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
}));

vi.mock("@/lib/native-auth", () => ({
  NativeAuth: { showTextInputDialog: mocks.showTextInputDialog },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/lib/profile-media", () => ({
  uploadUserProfileMedia: vi.fn(),
  removeUserProfileMedia: vi.fn(),
}));

import { FirstAccessGate } from "./FirstAccessFlow";

function setupProfileQuery() {
  mocks.from.mockImplementation(() => {
    let updating = false;
    const builder: any = {
      select: vi.fn(() => builder),
      update: vi.fn((values: Record<string, unknown>) => {
        updating = true;
        mocks.updates.push(values);
        return builder;
      }),
      eq: vi.fn(() => builder),
      then: (resolve: (value: { error: null }) => unknown, reject: (reason: unknown) => unknown) => {
        const request = updating && mocks.pendingTourUpdate
          ? new Promise<{ error: null }>(() => {})
          : Promise.resolve({ error: null });
        return request.then(resolve, reject);
      },
      maybeSingle: vi.fn(() => {
        if (updating) {
          return mocks.pendingUpdate
            ? new Promise(() => {})
            : Promise.resolve({ data: { id: "user-1" }, error: null });
        }
        return Promise.resolve({
          data: {
            id: "user-1",
            app_onboarding_completed_at: null,
            app_tour_completed_at: null,
          },
          error: null,
        });
      }),
    };
    return builder;
  });
}

function renderFirstAccess() {
  return render(
    <FirstAccessGate userId="user-1" initialName="Nome inicial" onNavigate={mocks.navigate}>
      <p>Área principal</p>
    </FirstAccessGate>,
  );
}

describe("FirstAccessGate native profile form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updates.length = 0;
    mocks.native = true;
    mocks.pendingUpdate = false;
    mocks.pendingTourUpdate = false;
    setupProfileQuery();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens Android-native editors and saves the entered values", async () => {
    mocks.showTextInputDialog.mockResolvedValue({
      cancelled: false,
      text: "Cainã",
    });

    renderFirstAccess();

    const nameField = await screen.findByRole("button", { name: "Como devemos chamar você?" });
    fireEvent.click(nameField);

    await waitFor(() => expect(nameField).toHaveTextContent("Cainã"));
    expect(mocks.showTextInputDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: "Como devemos chamar você?",
      initialValue: "Nome inicial",
      maxLength: 60,
      singleLine: true,
      allowEmpty: false,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil e continuar" }));

    await waitFor(() => {
      expect(mocks.updates).toHaveLength(1);
    });
    expect(mocks.updates[0]).toMatchObject({
      display_name: "Cainã",
      bio: null,
      interests: [],
      app_onboarding_completed_at: expect.any(String),
    });
    expect(await screen.findByRole("dialog", { name: "O ponto de encontro" })).toBeInTheDocument();
  });

  it("allows optional native profile fields to be cleared", async () => {
    mocks.showTextInputDialog.mockResolvedValue({
      cancelled: false,
      text: "",
    });

    renderFirstAccess();

    fireEvent.click(await screen.findByRole("button", { name: "Sobre mim" }));

    expect(mocks.showTextInputDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: "Sobre mim",
      allowEmpty: true,
      singleLine: false,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil e continuar" }));

    await waitFor(() => expect(mocks.updates).toHaveLength(1));
    expect(mocks.updates[0]).toMatchObject({ bio: null });
  });

  it("keeps tutorial steps lightweight and opens the app immediately when the progress save hangs", async () => {
    mocks.pendingTourUpdate = true;

    renderFirstAccess();

    fireEvent.click(await screen.findByRole("button", { name: "Salvar perfil e continuar" }));

    const tutorial = await screen.findByRole("dialog", { name: "O ponto de encontro" });
    expect(tutorial).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Próxima etapa" }));
    expect(screen.getByRole("dialog", { name: "Registre um momento" })).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Pular tutorial" }));

    expect(await screen.findByText("Área principal")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith("home");
  });

  it("shows the web text inputs outside the Android app", async () => {
    mocks.native = false;

    renderFirstAccess();

    expect(await screen.findByPlaceholderText("Seu nome")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Como devemos chamar você?" })).not.toBeInTheDocument();
  });

  it("releases the saving state and shows a retry message when the request hangs", async () => {
    mocks.pendingUpdate = true;

    renderFirstAccess();

    const saveButton = await screen.findByRole("button", { name: "Salvar perfil e continuar" });
    vi.useFakeTimers();
    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_001);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "O salvamento do perfil está demorando. Verifique sua conexão e tente novamente.",
    );
    expect(saveButton).toBeEnabled();
  });
});
