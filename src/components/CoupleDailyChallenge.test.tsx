import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  listDailyChallengeProgress: vi.fn(),
  saveDailyChallengeCompletion: vi.fn(),
  realtimeHandler: null as null | ((payload: { new: unknown }) => void),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock("@/lib/couple-daily-challenge", () => ({
  listDailyChallengeProgress: mocks.listDailyChallengeProgress,
  saveDailyChallengeCompletion: mocks.saveDailyChallengeCompletion,
}));

import { CoupleDailyChallenge } from "./CoupleDailyChallenge";

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

describe("CoupleDailyChallenge online completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtimeHandler = null;
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
    const channel = {
      on: vi.fn((event: string, _filter: unknown, handler: (payload: { new: unknown }) => void) => {
        if (event === "postgres_changes") mocks.realtimeHandler = handler;
        return channel;
      }),
      subscribe: vi.fn((callback?: (status: string) => void) => {
        callback?.("SUBSCRIBED");
        return channel;
      }),
    };
    mocks.channel.mockReturnValue(channel);
    mocks.removeChannel.mockResolvedValue(undefined);
    mocks.listDailyChallengeProgress.mockResolvedValue({ data: [], error: null });
    mocks.saveDailyChallengeCompletion.mockResolvedValue({ error: null });
  });

  it("only shows the full-screen couple result after the partner completion arrives", async () => {
    render(<CoupleDailyChallenge userId="user-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como concluído" }));
    await waitFor(() => expect(screen.getByLabelText("Você: Concluído")).toBeInTheDocument());

    expect(screen.queryByRole("dialog", { name: "Vocês conseguiram!" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Outra pessoa: Pendente")).toBeInTheDocument();

    const saved = mocks.saveDailyChallengeCompletion.mock.calls[0][0] as {
      coupleId: string;
      challengeDate: string;
      challengeId: string;
      userId: string;
    };
    expect(saved).toMatchObject({
      coupleId: "couple-1",
      challengeDate: todayInSaoPaulo(),
      userId: "user-1",
    });
    expect(saved.challengeId).toBeTruthy();
    expect(mocks.realtimeHandler).toBeTypeOf("function");

    act(() => {
      mocks.realtimeHandler?.({
        new: {
          couple_id: "couple-1",
          challenge_date: saved.challengeDate,
          challenge_id: saved.challengeId,
          user_id: "user-2",
          completed_at: new Date().toISOString(),
        },
      });
    });

    const result = await screen.findByRole("dialog", { name: "Vocês conseguiram!" });
    expect(result).toHaveAttribute("aria-modal", "true");
    expect(result).toHaveTextContent("2/2");
    expect(result).toHaveTextContent("DESAFIO DO DIA");

    fireEvent.click(screen.getByRole("button", { name: "Ver desafio" }));
    expect(screen.queryByRole("dialog", { name: "Vocês conseguiram!" })).not.toBeInTheDocument();
    expect(screen.getByText(/Missão concluída pelos dois/)).toBeInTheDocument();
  });

  it("does not show the victory screen when the partner answered a different date or challenge", async () => {
    render(<CoupleDailyChallenge userId="user-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como concluído" }));
    await waitFor(() => expect(screen.getByLabelText("Você: Concluído")).toBeInTheDocument());
    const saved = mocks.saveDailyChallengeCompletion.mock.calls[0][0] as {
      challengeDate: string;
      challengeId: string;
    };

    act(() => {
      mocks.realtimeHandler?.({
        new: {
          couple_id: "couple-1",
          challenge_date: saved.challengeDate,
          challenge_id: "another-challenge",
          user_id: "user-2",
          completed_at: new Date().toISOString(),
        },
      });
    });

    expect(screen.queryByRole("dialog", { name: "Vocês conseguiram!" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Outra pessoa: Pendente")).toBeInTheDocument();
  });
});
