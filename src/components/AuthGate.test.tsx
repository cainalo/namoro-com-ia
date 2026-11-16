import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: false,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  completeCouplePairing: vi.fn(),
  showCredentialsDialog: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
}));

vi.mock("@/lib/native-auth", () => ({
  NativeAuth: { showCredentialsDialog: mocks.showCredentialsDialog },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock("@/lib/couple-registration", () => ({
  completeCouplePairing: mocks.completeCouplePairing,
  registerCouple: vi.fn(),
}));

vi.mock("@/components/MoradosLoadingScreen", () => ({
  MoradosLoadingScreen: ({ message }: { message: string }) => <div role="status">{message}</div>,
}));

vi.mock("@/components/MoradosMark", () => ({
  MoradosMark: () => <span aria-hidden="true">mark</span>,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

import { AuthGate } from "./AuthGate";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("AuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.native = false;
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.completeCouplePairing.mockResolvedValue({ error: null, connected: false });
  });

  it("waits for session restoration and never passes null to the authenticated route", async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    mocks.getSession.mockReturnValue(pending.promise);
    const authenticatedChild = vi.fn((session: Session) => <p>Usuário: {session.user.id}</p>);

    render(<AuthGate>{authenticatedChild}</AuthGate>);

    expect(screen.getByRole("status")).toHaveTextContent("Verificando seu acesso");
    expect(authenticatedChild).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ data: { session: null }, error: null });
      await pending.promise;
    });

    expect(screen.getByRole("heading", { name: "Entre no seu espaço." })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /seu e-mail/i })).toBeInTheDocument();
    expect(authenticatedChild).not.toHaveBeenCalled();
  });

  it("uses the Android-native sign-in screen when no session exists in the APK", async () => {
    mocks.native = true;
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<AuthGate>{(session) => <p>{session.user.id}</p>}</AuthGate>);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Entrar no Morados" })).toBeInTheDocument();
    });
    expect(screen.getByText(/janela própria do Android/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders the authenticated route only after a real session is restored", async () => {
    const session = { user: { id: "user-123" } } as Session;
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    const authenticatedChild = vi.fn((currentSession: Session) => <p>Usuário: {currentSession.user.id}</p>);

    render(<AuthGate>{authenticatedChild}</AuthGate>);

    await waitFor(() => {
      expect(screen.getByText("Usuário: user-123")).toBeInTheDocument();
    });
    expect(authenticatedChild).toHaveBeenCalledWith(session);
  });
});
