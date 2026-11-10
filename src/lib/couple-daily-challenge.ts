import { supabase } from "@/integrations/supabase/client";

export type DailyChallengeCompletion = {
  couple_id: string;
  challenge_date: string;
  challenge_id: string;
  user_id: string;
  completed_at: string;
};

export type DailyChallengeError = {
  code?: string;
  message: string;
};

type CompletionListResponse = {
  data: DailyChallengeCompletion[] | null;
  error: DailyChallengeError | null;
};

type CompletionQuery = {
  eq: (column: "couple_id", value: string) => CompletionQuery;
  gte: (column: "challenge_date", value: string) => CompletionQuery;
  order: (
    column: "challenge_date",
    options: { ascending: boolean },
  ) => CompletionQuery;
  limit: (count: number) => PromiseLike<CompletionListResponse>;
};

type CompletionTable = {
  select: (columns: string) => CompletionQuery;
  insert: (values: {
    couple_id: string;
    challenge_date: string;
    challenge_id: string;
    user_id: string;
  }) => PromiseLike<{ error: DailyChallengeError | null }>;
};

type DailyChallengeClient = {
  from: (table: "couple_daily_challenge_progress") => CompletionTable;
};

// Adapter temporário até a regeneração oficial dos tipos Supabase.
const challengeClient = supabase as unknown as DailyChallengeClient;

export async function listDailyChallengeProgress(
  coupleId: string,
  sinceDate: string,
) {
  return challengeClient
    .from("couple_daily_challenge_progress")
    .select("couple_id, challenge_date, challenge_id, user_id, completed_at")
    .eq("couple_id", coupleId)
    .gte("challenge_date", sinceDate)
    .order("challenge_date", { ascending: false })
    .limit(60);
}

export async function saveDailyChallengeCompletion(input: {
  coupleId: string;
  challengeDate: string;
  challengeId: string;
  userId: string;
}) {
  return challengeClient.from("couple_daily_challenge_progress").insert({
    couple_id: input.coupleId,
    challenge_date: input.challengeDate,
    challenge_id: input.challengeId,
    user_id: input.userId,
  });
}
