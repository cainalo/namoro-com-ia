import { supabase } from "@/integrations/supabase/client";

export type Seat = 0 | 1;
export type OnlineGameMode = "competitive" | "cooperative";
export type GameOutcome =
  { kind: "win"; winnerSeat: Seat } | { kind: "draw" } | { kind: "complete" };

export type OnlineMatch = {
  id: string;
  couple_id: string;
  game_key: string;
  mode: OnlineGameMode;
  player_one_id: string;
  player_two_id: string;
  current_turn: string;
  status: "active" | "finished" | "abandoned";
  winner_id: string | null;
  is_draw: boolean;
  state: { data?: unknown };
  version: number;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export const ONLINE_MATCH_COLUMNS =
  "id, couple_id, game_key, mode, player_one_id, player_two_id, current_turn, status, winner_id, is_draw, state, version, created_at, updated_at, finished_at";

type RpcError = { code?: string; message: string };
type Loose = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose adapter until types are regenerated
  from: (table: string) => any;
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
};
// Adaptador até a regeneração oficial dos tipos após a migration genérica.
export const looseClient = supabase as unknown as Loose;

export function seatOf(
  match: Pick<OnlineMatch, "player_one_id" | "player_two_id">,
  userId: string,
): Seat | null {
  if (match.player_one_id === userId) return 0;
  if (match.player_two_id === userId) return 1;
  return null;
}

export function seatUser(match: Pick<OnlineMatch, "player_one_id" | "player_two_id">, seat: Seat) {
  return seat === 0 ? match.player_one_id : match.player_two_id;
}

/** Quem pode agir agora. Cooperativos: qualquer membro; competitivos: só quem tem a vez. */
export function canAct(
  match: Pick<OnlineMatch, "mode" | "status" | "current_turn">,
  userId: string,
) {
  if (match.status !== "active") return false;
  return match.mode === "cooperative" || match.current_turn === userId;
}

/** Aceita somente atualizações mais novas (evita regressão por eventos fora de ordem). */
export function isNewer(
  current: Pick<OnlineMatch, "id" | "version"> | null,
  incoming: Pick<OnlineMatch, "id" | "version">,
) {
  if (!current || current.id !== incoming.id) return true;
  return incoming.version > current.version;
}

export function outcomeArgs(outcome: GameOutcome | null | undefined) {
  if (!outcome) return { p_outcome: null, p_winner_seat: null };
  if (outcome.kind === "win") return { p_outcome: "win", p_winner_seat: outcome.winnerSeat };
  return { p_outcome: outcome.kind, p_winner_seat: null };
}

export type OnlineFailure = "stale" | "not-your-turn" | "finished" | "database-pending" | "unknown";
export function classifyOnlineError(
  error: { code?: string; message?: string } | null | undefined,
): OnlineFailure {
  const message = error?.message ?? "";
  if (message.includes("stale_version") || error?.code === "40001") return "stale";
  if (message.includes("not_your_turn")) return "not-your-turn";
  if (message.includes("match_already_finished")) return "finished";
  if (["PGRST202", "PGRST204", "42703", "42883", "PGRST205", "42P01"].includes(error?.code ?? ""))
    return "database-pending";
  return "unknown";
}

export async function loadActiveMatch(coupleId: string, gameKey: string) {
  return looseClient
    .from("couple_game_matches")
    .select(ONLINE_MATCH_COLUMNS)
    .eq("couple_id", coupleId)
    .eq("game_key", gameKey)
    .eq("status", "active")
    .maybeSingle() as PromiseLike<{ data: OnlineMatch | null; error: RpcError | null }>;
}

export async function loadMatch(matchId: string) {
  return looseClient
    .from("couple_game_matches")
    .select(ONLINE_MATCH_COLUMNS)
    .eq("id", matchId)
    .maybeSingle() as PromiseLike<{
    data: OnlineMatch | null;
    error: RpcError | null;
  }>;
}

export function startMatch(coupleId: string, gameKey: string, mode: OnlineGameMode) {
  return looseClient.rpc("start_game_match", {
    p_couple_id: coupleId,
    p_game_key: gameKey,
    p_mode: mode,
  });
}

export function submitState(input: {
  matchId: string;
  expectedVersion: number;
  data: unknown;
  nextSeat: Seat | null;
  outcome?: GameOutcome | null;
}) {
  return looseClient.rpc("submit_game_state", {
    p_match_id: input.matchId,
    p_expected_version: input.expectedVersion,
    p_state: { data: input.data },
    p_next_turn_seat: input.nextSeat,
    ...outcomeArgs(input.outcome),
  });
}

export function abandonMatch(matchId: string) {
  return looseClient.rpc("abandon_game_match", { p_match_id: matchId });
}

export async function loadPrivate<T>(matchId: string, userId: string) {
  const result = (await looseClient
    .from("couple_game_private_state")
    .select("data")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .maybeSingle()) as { data: { data: T } | null; error: RpcError | null };
  return { data: result.data?.data ?? null, error: result.error };
}

export function setPrivate(matchId: string, data: unknown) {
  return looseClient.rpc("set_game_private_state", { p_match_id: matchId, p_data: data });
}

export function resetPile(matchId: string, items: unknown[]) {
  return looseClient.rpc("reset_game_pile", { p_match_id: matchId, p_items: items });
}

export function drawPile(matchId: string, count: number, dealId: string | null, toHand: boolean) {
  return looseClient.rpc("draw_game_pile", {
    p_match_id: matchId,
    p_count: count,
    p_deal_id: dealId,
    p_to_hand: toHand,
  });
}

export function newDealId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
