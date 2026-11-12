import { supabase } from "@/integrations/supabase/client";

export type CoupleMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "sticker"
  | "gift";

export type CoupleMessage = {
  id: string;
  couple_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  message_type: CoupleMessageType;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  metadata: Record<string, unknown>;
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
  lt: (column: "created_at", value: string) => MessageSelection;
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
    message_type: CoupleMessageType;
    attachment_path: string | null;
    attachment_name: string | null;
    attachment_mime: string | null;
    metadata: Record<string, unknown>;
  }) => PromiseLike<MessageInsertResponse>;
};

type CoupleMessageClient = {
  from: (table: "couple_messages") => MessageTable;
};

const messageClient = supabase as unknown as CoupleMessageClient;

const MESSAGE_COLUMNS =
  "id, couple_id, sender_id, body, created_at, message_type, attachment_path, attachment_name, attachment_mime, metadata";

export async function listCoupleMessages(coupleId: string, before?: string) {
  let query = messageClient
    .from("couple_messages")
    .select(MESSAGE_COLUMNS)
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false });

  if (before) query = query.lt("created_at", before);
  return query.limit(100);
}

export async function sendCoupleMessage(input: {
  coupleId: string;
  senderId: string;
  body: string;
  messageType?: CoupleMessageType;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return messageClient.from("couple_messages").insert({
    couple_id: input.coupleId,
    sender_id: input.senderId,
    body: input.body,
    message_type: input.messageType ?? "text",
    attachment_path: input.attachmentPath ?? null,
    attachment_name: input.attachmentName ?? null,
    attachment_mime: input.attachmentMime ?? null,
    metadata: input.metadata ?? {},
  });
}
