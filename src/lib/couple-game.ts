import { supabase } from "@/integrations/supabase/client";

export type CoupleGameChoice = {
  couple_id: string;
  question_id: string;
  user_id: string;
  choice: "a" | "b";
  answered_at: string;
};

export type CoupleGameError = {
  code?: string;
  message: string;
};

type ChoiceListResponse = {
  data: CoupleGameChoice[] | null;
  error: CoupleGameError | null;
};

type ChoiceSelection = {
  eq: (column: "couple_id", value: string) => ChoiceSelection;
  order: (
    column: "question_id",
    options: { ascending: boolean },
  ) => ChoiceSelection;
  limit: (count: number) => PromiseLike<ChoiceListResponse>;
};

type ChoiceTable = {
  select: (columns: string) => ChoiceSelection;
  upsert: (
    values: {
      couple_id: string;
      question_id: string;
      user_id: string;
      choice: "a" | "b";
    },
    options: { onConflict: string },
  ) => PromiseLike<{ error: CoupleGameError | null }>;
};

type CoupleGameClient = {
  from: (table: "couple_game_choices") => ChoiceTable;
};

// Adapter temporário e estrito até a regeneração oficial dos tipos do Supabase.
const gameClient = supabase as unknown as CoupleGameClient;

export async function listCoupleGameChoices(coupleId: string) {
  return gameClient
    .from("couple_game_choices")
    .select("couple_id, question_id, user_id, choice, answered_at")
    .eq("couple_id", coupleId)
    .order("question_id", { ascending: true })
    .limit(60);
}

export async function saveCoupleGameChoice(input: {
  coupleId: string;
  questionId: string;
  userId: string;
  choice: "a" | "b";
}) {
  return gameClient.from("couple_game_choices").upsert(
    {
      couple_id: input.coupleId,
      question_id: input.questionId,
      user_id: input.userId,
      choice: input.choice,
    },
    { onConflict: "couple_id,question_id,user_id" },
  );
}
