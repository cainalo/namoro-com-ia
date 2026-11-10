import { supabase } from "@/integrations/supabase/client";

export type ConnectFourMatch = {
  id: string;
  couple_id: string;
  game_key: "connect-four";
  player_one_id: string;
  player_two_id: string;
  board: number[];
  current_turn: string;
  status: "active" | "finished";
  winner_id: string | null;
  is_draw: boolean;
  turn_number: number;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type ConnectFourError = {
  code?: string;
  message: string;
};

type MatchQuery = {
  eq: (column: "couple_id", value: string) => MatchQuery;
  order: (
    column: "created_at",
    options: { ascending: boolean },
  ) => MatchQuery;
  limit: (count: number) => PromiseLike<{
    data: ConnectFourMatch[] | null;
    error: ConnectFourError | null;
  }>;
};

type ConnectFourClient = {
  from: (table: "couple_game_matches") => {
    select: (columns: string) => MatchQuery;
  };
  rpc: (
    name: "create_connect_four_match" | "play_connect_four_move",
    args: Record<string, string | number>,
  ) => PromiseLike<{
    data: string | ConnectFourMatch[] | null;
    error: ConnectFourError | null;
  }>;
};

// Adapter temporário até a regeneração oficial dos tipos Supabase.
const gameClient = supabase as unknown as ConnectFourClient;

export async function listConnectFourMatches(coupleId: string) {
  return gameClient
    .from("couple_game_matches")
    .select(
      "id, couple_id, game_key, player_one_id, player_two_id, board, current_turn, status, winner_id, is_draw, turn_number, created_at, updated_at, finished_at",
    )
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(20);
}

export async function createConnectFourMatch(coupleId: string) {
  const result = await gameClient.rpc("create_connect_four_match", {
    p_couple_id: coupleId,
  });

  return {
    data: typeof result.data === "string" ? result.data : null,
    error: result.error,
  };
}

export async function playConnectFourMove(input: {
  matchId: string;
  column: number;
  expectedTurn: number;
}) {
  const result = await gameClient.rpc("play_connect_four_move", {
    p_match_id: input.matchId,
    p_column: input.column,
    p_expected_turn: input.expectedTurn,
  });

  const matches = Array.isArray(result.data) ? result.data : [];
  return {
    data: matches[0] ?? null,
    error: result.error,
  };
}
