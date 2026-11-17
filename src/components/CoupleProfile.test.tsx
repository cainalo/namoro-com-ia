import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  nativePlatform: false,
  showTextInputDialog: vi.fn(),
  mediaResolvers: [] as Array<(value: string | null) => void>,
  row: {
    id: "user-1",
    display_name: "Cainã",
    avatar_path: "user-1/avatar.webp",
    banner_path: "user-1/banner.webp",
    bio: "Sobre mim",
    interests: ["Leitura"],
    hobbies: "Música",
    favorite_food: null,
    favorite_music: null,
    favorite_film: null,
    profile_quote: null,
  },
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => mocks.nativePlatform } }));

vi.mock("@/lib/native-auth", () => ({ NativeAuth: { showTextInputDialog: mocks.showTextInputDialog } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/lib/profile-media", () => ({
  createProfileImageUrl: vi.fn(() => new Promise<string | null>((resolve) => {
    mocks.mediaResolvers.push(resolve);
  })),
  createUserProfileMediaUrl: vi.fn(),
  removeProfileImage: vi.fn(),
  removeUserProfileMedia: vi.fn(),
  uploadUserProfileMedia: vi.fn(),
}));

vi.mock("@/components/AppGeneralSettings", () => ({
  AppGeneralSettings: () => null,
}));

import { CoupleProfile } from "./CoupleProfile";

describe("CoupleProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.nativePlatform = false;
    mocks.showTextInputDialog.mockReset();
    mocks.mediaResolvers.length = 0;
    mocks.update.mockReset();
    mocks.from.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        update: mocks.update.mockImplementation(() => builder),
        maybeSingle: vi.fn().mockResolvedValue({ data: mocks.row, error: null }),
      };
      return builder;
    });
  });

  it("keeps the editable form available while avatar and banner URLs are still loading", async () => {
    render(<CoupleProfile userId="user-1" />);

    expect(await screen.findByLabelText("Nome exibido")).toHaveValue("Cainã");
    expect(screen.getByLabelText("Sobre mim")).toHaveValue("Sobre mim");
    expect(screen.getByRole("button", { name: "Salvar perfil" })).toBeEnabled();
    expect(mocks.mediaResolvers).toHaveLength(2);

    await act(async () => {
      mocks.mediaResolvers.forEach((resolve) => resolve(null));
    });
  });
  it("uses the native Android text editor for profile fields", async () => {
    mocks.nativePlatform = true;
    mocks.showTextInputDialog.mockResolvedValue({ cancelled: false, text: "Novo nome" });

    render(<CoupleProfile userId="user-1" />);

    const nameField = await screen.findByRole("button", { name: "Nome exibido" });
    expect(nameField).toHaveTextContent("Cainã");

    await act(async () => {
      fireEvent.click(nameField);
    });

    expect(mocks.showTextInputDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: "Nome exibido",
      initialValue: "Cainã",
      singleLine: true,
    }));
    expect(screen.getByRole("button", { name: "Nome exibido" })).toHaveTextContent("Novo nome");

    await act(async () => {
      mocks.mediaResolvers.forEach((resolve) => resolve(null));
    });
  });
  it("saves profile edits through the existing profile row and announces success", async () => {
    render(<CoupleProfile userId="user-1" />);

    const nameField = await screen.findByLabelText("Nome exibido");
    fireEvent.change(nameField, { target: { value: "Nome atualizado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Seu perfil foi atualizado.");
    });

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      display_name: "Nome atualizado",
      bio: "Sobre mim",
      interests: ["Leitura"],
      hobbies: "Música",
    }));
  });

  it("keeps the personal editing controls visible in the new portrait layout", async () => {
    const { container } = render(<CoupleProfile userId="user-1" />);

    expect(await screen.findByRole("heading", { name: "Detalhes sobre você" })).toBeInTheDocument();
    expect(container.querySelector(".morados-profile-cover")).toBeInTheDocument();
    expect(container.querySelector(".morados-profile-progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome exibido")).toHaveValue("Cainã");
    expect(screen.getByLabelText("Sobre mim")).toHaveValue("Sobre mim");
    expect(screen.getByLabelText("Interesses")).toHaveValue("Leitura");
    expect(screen.getByLabelText("Hobbies")).toHaveValue("Música");
    expect(screen.getByRole("button", { name: "Salvar perfil" })).toBeEnabled();

    await act(async () => {
      mocks.mediaResolvers.forEach((resolve) => resolve(null));
    });
  });


});