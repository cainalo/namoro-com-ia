import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectFourMatch } from "@/lib/connect-four";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  onRealtime: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  play: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock("@/lib/connect-four", () => ({
  listConnectFourMatches: mocks.list,
  createConnectFourMatch: mocks.create,
  playConnectFourMove: mocks.play,
}));

import { ConnectFourGame } from "./ConnectFourGame";

const USER_ID = "user-1";
const COUPLE_ID = "couple-1";

function makeMatch(overrides: Partial<ConnectFourMatch> = {}): ConnectFourMatch {
  return {
    id: "match-finished",
    couple_id: COUPLE_ID,
    game_key: "connect-four",
    player_one_id: USER_ID,
    player_two_id: "user-2",
    board: Array(42).fill(0),
    current_turn: "user-2",
    status: "finished",
    winner_id: USER_ID,
    is_draw: false,
    turn_number: 7,
    created_at: "2026-11-16T19:00:00.000Z",
    updated_at: "2026-11-16T19:08:00.000Z",
    finished_at: "2026-11-16T19:08:00.000Z",
    ...overrides,
  };
}

function configureSupabaseMocks() {
  const membershipBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { couple_id: COUPLE_ID },
      error: null,
    }),
  };
  membershipBuilder.select.mockReturnValue(membershipBuilder);
  membershipBuilder.eq.mockReturnValue(membershipBuilder);
  membershipBuilder.is.mockReturnValue(membershipBuilder);

  const coupleBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: COUPLE_ID, status: "active" },
      error: null,
    }),
  };
  coupleBuilder.select.mockReturnValue(coupleBuilder);
  coupleBuilder.eq.mockReturnValue(coupleBuilder);

  mocks.from.mockImplementation((table: string) => ({
    select: vi.fn(() => table === "couple_members" ? membershipBuilder : coupleBuilder),
  }));

  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockImplementation((_event: string, _filter: unknown, callback: (payload: unknown) => void) => {
    mocks.onRealtime(callback);
    return channel;
  });
  channel.subscribe.mockImplementation((callback?: (status: string) => void) => {
    callback?.("SUBSCRIBED");
    return channel;
  });
  mocks.channel.mockReturnValue(channel);
  mocks.removeChannel.mockResolvedValue(undefined);
}

describe("ConnectFourGame online result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureSupabaseMocks();
    mocks.list.mockResolvedValue({ data: [makeMatch()], error: null });
    mocks.create.mockResolvedValue({ data: "match-new", error: null });
    mocks.play.mockResolvedValue({ data: null, error: null });
  });

  it.each([
    ["victory", makeMatch({ winner_id: USER_ID }), "Você venceu!"],
    ["defeat", makeMatch({ winner_id: "user-2" }), "Adversário venceu"],
    ["draw", makeMatch({ winner_id: null, is_draw: true, turn_number: 42 }), "Empate!"],
  ] as const)("shows a dedicated full-screen %s result and allows reviewing the board", async (outcome, match, title) => {
    mocks.list.mockResolvedValue({ data: [match], error: null });
    render(<ConnectFourGame userId={USER_ID} />);

    const dialog = await screen.findByRole("dialog", { name: title });
    expect(dialog).toHaveAttribute("data-outcome", outcome);
    expect(dialog).toHaveClass("morados-connect-four-result");
    expect(within(dialog).getByText("jogadas")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Rever tabuleiro" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Tabuleiro de Lig 4" })).toBeInTheDocument();
  });

  it("opens the result automatically when Realtime reports a finished match", async () => {
    const active = makeMatch({
      id: "match-active",
      status: "active",
      winner_id: null,
      current_turn: "user-2",
      turn_number: 6,
      finished_at: null,
    });
    const finished = makeMatch({
      id: "match-active",
      winner_id: USER_ID,
      current_turn: "user-2",
      turn_number: 7,
    });
    mocks.list.mockResolvedValue({ data: [active], error: null });

    render(<ConnectFourGame userId={USER_ID} />);
    await screen.findByRole("grid", { name: "Tabuleiro de Lig 4" });
    await waitFor(() => expect(mocks.onRealtime).toHaveBeenCalledTimes(1));

    const listener = mocks.onRealtime.mock.calls[0][0] as (payload: { new: ConnectFourMatch }) => void;
    act(() => listener({ new: finished }));

    expect(await screen.findByRole("dialog", { name: "Você venceu!" })).toHaveAttribute("data-outcome", "victory");
  });

  it("reopens an older result from history and can return to the ongoing match", async () => {
    const ongoing = makeMatch({
      id: "match-active",
      status: "active",
      winner_id: null,
      turn_number: 4,
      finished_at: null,
      current_turn: USER_ID,
      created_at: "2026-11-17T00:00:00.000Z",
    });
    const finished = makeMatch();
    mocks.list.mockResolvedValue({ data: [ongoing, finished], error: null });

    render(<ConnectFourGame userId={USER_ID} />);

    const history = await screen.findByRole("region", { name: "Partidas anteriores" });
    fireEvent.click(within(history).getByRole("button", { name: /Você venceu/ }));

    const dialog = await screen.findByRole("dialog", { name: "Você venceu!" });
    expect(dialog).toHaveAttribute("data-outcome", "victory");

    fireEvent.click(within(dialog).getByRole("button", { name: "Voltar à partida em andamento" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("grid", { name: "Tabuleiro de Lig 4" })).toBeInTheDocument();
    expect(screen.getByText("Sua vez")).toBeInTheDocument();
  });

  it("starts a new match without deleting the previous result from history", async () => {
    const finished = makeMatch();
    const nextMatch = makeMatch({
      id: "match-new",
      status: "active",
      winner_id: null,
      is_draw: false,
      turn_number: 0,
      current_turn: USER_ID,
      created_at: "2026-11-17T00:10:00.000Z",
      updated_at: "2026-11-17T00:10:00.000Z",
      finished_at: null,
    });
    mocks.list
      .mockResolvedValueOnce({ data: [finished], error: null })
      .mockResolvedValue({ data: [nextMatch, finished], error: null });

    render(<ConnectFourGame userId={USER_ID} />);

    const dialog = await screen.findByRole("dialog", { name: "Você venceu!" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Jogar novamente" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(COUPLE_ID));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    await screen.findByRole("grid", { name: "Tabuleiro de Lig 4" });
    const history = screen.getByRole("region", { name: "Partidas anteriores" });
    expect(within(history).getByRole("button", { name: /Você venceu/ })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Tabuleiro de Lig 4" })).toBeInTheDocument();
  });
});
