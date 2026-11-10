import { supabase } from "@/integrations/supabase/client";

export type CoupleMessage = {
  id: string;
  couple_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type CoupleMessageError = {
  code?: string;
  message: string;
};

type MessageListResponse = {
  data: CoupleMessage[] | null;
  error: CoupleMessageError | null;
};

type MessageInsertResponse = {
  error: CoupleMessageError | null;
};

type MessageSelection = {
  eq: (column: "couple_id", value: string) => MessageSelection;
  order: (
    column: "created_at",
    options: { ascending: boolean },
  ) => MessageSelection;
  limit: (count: number) => PromiseLike<MessageListResponse>;
};

type MessageTable = {
  select: (columns: string) => MessageSelection;
  insert: (values: {
    couple_id: string;
    sender_id: string;
    body: string;
  }) => PromiseLike<MessageInsertResponse>;
};

type CoupleMessageClient = {
  from: (table: "couple_messages") => MessageTable;
};

// Adapter temporário e estrito: a tabela já existe na migration, mas os
// tipos gerados do Supabase serão atualizados em uma etapa própria.
const messageClient = supabase as unknown as CoupleMessageClient;

export async function listCoupleMessages(coupleId: string) {
  return messageClient
    .from("couple_messages")
    .select("id, couple_id, sender_id, body, created_at")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(100);
}

export async function sendCoupleMessage(input: {
  coupleId: string;
  senderId: string;
  body: string;
}) {
  return messageClient.from("couple_messages").insert({
    couple_id: input.coupleId,
    sender_id: input.senderId,
    body: input.body,
  });
}
