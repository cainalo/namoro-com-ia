import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
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
    mocks.mediaResolvers.length = 0;
    mocks.from.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
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
});
