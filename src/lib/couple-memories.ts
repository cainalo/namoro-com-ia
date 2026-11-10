import { supabase } from "@/integrations/supabase/client";

export type MemoryVisibility = "private" | "shared";

export type CoupleMemory = {
  id: string;
  owner_id: string;
  couple_id: string | null;
  visibility: MemoryVisibility;
  title: string | null;
  body: string;
  memory_date: string;
  created_at: string;
  updated_at: string;
};

export type MemoryError = {
  code?: string;
  message: string;
};

type MemoryListResponse = {
  data: CoupleMemory[] | null;
  error: MemoryError | null;
};

type MemoryInsertResponse = {
  error: MemoryError | null;
};

type MemoryUpdateResponse = {
  error: MemoryError | null;
};

type MemoryDeleteResponse = {
  error: MemoryError | null;
};

type MemoryDeleteFilter = {
  eq: (column: "id", value: string) => PromiseLike<MemoryDeleteResponse>;
};

type MemoryUpdateFilter = {
  eq: (column: "id", value: string) => PromiseLike<MemoryUpdateResponse>;
};

type MemorySelection = {
  order: (
    column: "memory_date" | "created_at",
    options: { ascending: boolean },
  ) => MemorySelection;
  limit: (count: number) => PromiseLike<MemoryListResponse>;
};

type MemoryTable = {
  select: (columns: string) => MemorySelection;
  insert: (values: {
    owner_id: string;
    couple_id: string | null;
    visibility: MemoryVisibility;
    title: string | null;
    body: string;
    memory_date: string;
  }) => PromiseLike<MemoryInsertResponse>;
  update: (values: {
    title: string | null;
    body: string;
    memory_date: string;
  }) => MemoryUpdateFilter;
  delete: () => MemoryDeleteFilter;
};

type MemoryClient = {
  from: (table: "couple_memories") => MemoryTable;
};

// Adapter temporário até que os tipos do Supabase sejam regenerados oficialmente.
const memoryClient = supabase as unknown as MemoryClient;

export async function listCoupleMemories(limit = 100) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  return memoryClient
    .from("couple_memories")
    .select("id, owner_id, couple_id, visibility, title, body, memory_date, created_at, updated_at")
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);
}

export async function createCoupleMemory(input: {
  ownerId: string;
  coupleId: string | null;
  visibility: MemoryVisibility;
  title: string | null;
  body: string;
  memoryDate: string;
}) {
  return memoryClient.from("couple_memories").insert({
    owner_id: input.ownerId,
    couple_id: input.coupleId,
    visibility: input.visibility,
    title: input.title,
    body: input.body,
    memory_date: input.memoryDate,
  });
}

export async function updateCoupleMemory(input: {
  id: string;
  title: string | null;
  body: string;
  memoryDate: string;
}) {
  return memoryClient
    .from("couple_memories")
    .update({
      title: input.title,
      body: input.body,
      memory_date: input.memoryDate,
    })
    .eq("id", input.id);
}

export async function deleteCoupleMemory(id: string) {
  return memoryClient
    .from("couple_memories")
    .delete()
    .eq("id", id);
}
