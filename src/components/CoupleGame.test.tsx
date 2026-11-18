import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDailyThisOrThatRound } from "@/lib/this-or-that";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  listCoupleGameChoices: vi.fn(),
  saveCoupleGameChoice: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock("@/lib/couple-game", () => ({
  listCoupleGameChoices: mocks.listCoupleGameChoices,
  saveCoupleGameChoice: mocks.saveCoupleGameChoice,
}));

import { CoupleGame } from "./CoupleGame";

function makeChoices(questionCount: number) {
  return getDailyThisOrThatRound().slice(0, questionCount).flatMap((question, index) => [
    {
      couple_id: "couple-1",
      question_id: question.id,
      user_id: "user-1",
      choice: "a" as const,
      answered_at: new Date(2026, 10, 17, 12, index).toISOString(),
    },
    {
      couple_id: "couple-1",
      question_id: question.id,
      user_id: "user-2",
      choice: "b" as const,
      answered_at: new Date(2026, 10, 17, 12, index + 1).toISOString(),
    },
  ]);
}

describe("CoupleGame online results", () => {
  let realtimeChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => {
      const data = table === "couple_members"
        ? { couple_id: "couple-1" }
        : { id: "couple-1", status: "active" };
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      };
      return builder;
    });

    realtimeChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback?: (status: string) => void) => {
        callback?.("SUBSCRIBED");
        return realtimeChannel;
      }),
    };
    mocks.channel.mockReturnValue(realtimeChannel);
    mocks.removeChannel.mockResolvedValue(undefined);
    mocks.saveCoupleGameChoice.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the full-screen review only after both accounts answered every question", async () => {
    mocks.listCoupleGameChoices.mockResolvedValue({ data: makeChoices(15), error: null });
    const { unmount } = render(<CoupleGame userId="user-1" />);

    const result = await screen.findByRole("dialog", { name: "O que vocês têm em comum?" });
    expect(result).toHaveAttribute("data-result-mode", "online");
    expect(result.querySelectorAll(".this-or-that-result-list > li")).toHaveLength(15);
    expect(result).toHaveTextContent("Você");
    expect(result).toHaveTextContent("Outra pessoa");
    expect(result).toHaveTextContent("15 perguntas");

    const onExit = vi.fn();
    window.addEventListener("morados:game-exit", onExit);
    fireEvent.click(screen.getByRole("button", { name: "Voltar aos jogos" }));
    expect(onExit).toHaveBeenCalledTimes(1);
    window.removeEventListener("morados:game-exit", onExit);
    unmount();
  });

  it("keeps the game active while even one question is missing a second answer", async () => {
    mocks.listCoupleGameChoices.mockResolvedValue({ data: makeChoices(14), error: null });
    render(<CoupleGame userId="user-1" />);

    expect(await screen.findByRole("heading", { name: "Isto ou aquilo?" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "O que vocês têm em comum?" })).not.toBeInTheDocument();
    expect(screen.getByText("14/15")).toBeInTheDocument();
  });
});
