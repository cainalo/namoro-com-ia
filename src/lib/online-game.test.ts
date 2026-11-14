import { describe, expect, it } from "vitest";
import { canAct, classifyOnlineError, isNewer, outcomeArgs, seatOf } from "./online-game";

const match = {
  id: "m",
  player_one_id: "a",
  player_two_id: "b",
  mode: "competitive" as const,
  status: "active" as const,
  current_turn: "a",
  version: 3,
};

describe("online game rules", () => {
  it("maps players to seats", () => {
    expect(seatOf(match, "a")).toBe(0);
    expect(seatOf(match, "b")).toBe(1);
    expect(seatOf(match, "x")).toBeNull();
  });
  it("only the player with the turn can act in competitive games", () => {
    expect(canAct(match, "a")).toBe(true);
    expect(canAct(match, "b")).toBe(false);
  });
  it("both players can act in cooperative games", () => {
    expect(canAct({ ...match, mode: "cooperative" }, "b")).toBe(true);
  });
  it("nobody can act after the match ends", () => {
    expect(canAct({ ...match, status: "finished" }, "a")).toBe(false);
  });
  it("ignores older or equal versions of the same match", () => {
    expect(isNewer(match, { id: "m", version: 3 })).toBe(false);
    expect(isNewer(match, { id: "m", version: 2 })).toBe(false);
    expect(isNewer(match, { id: "m", version: 4 })).toBe(true);
    expect(isNewer(match, { id: "other", version: 1 })).toBe(true);
  });
  it("classifies concurrency and turn errors", () => {
    expect(classifyOnlineError({ code: "40001", message: "stale_version" })).toBe("stale");
    expect(classifyOnlineError({ code: "42501", message: "not_your_turn" })).toBe("not-your-turn");
    expect(classifyOnlineError({ code: "PGRST202", message: "x" })).toBe("database-pending");
  });
  it("encodes outcomes for the server", () => {
    expect(outcomeArgs({ kind: "win", winnerSeat: 1 })).toEqual({
      p_outcome: "win",
      p_winner_seat: 1,
    });
    expect(outcomeArgs({ kind: "complete" })).toEqual({
      p_outcome: "complete",
      p_winner_seat: null,
    });
    expect(outcomeArgs(null)).toEqual({ p_outcome: null, p_winner_seat: null });
  });
});
