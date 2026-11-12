import { supabase } from "@/integrations/supabase/client";

export type CouplePost = {
  id: string;
  couple_id: string;
  author_id: string;
  body: string;
  media_path: string | null;
  media_name: string | null;
  media_mime: string | null;
  created_at: string;
  updated_at: string;
};

type FeedError = { message: string; code?: string };
type FeedListResponse = { data: CouplePost[] | null; error: FeedError | null };
type FeedInsertResponse = { error: FeedError | null };

type PostQuery = {
  eq: (column: "couple_id", value: string) => PostQuery;
  order: (
    column: "created_at",
    options: { ascending: boolean },
  ) => PostQuery;
  limit: (count: number) => PromiseLike<FeedListResponse>;
};

type CouplePostTable = {
  select: (columns: string) => PostQuery;
  insert: (values: {
    couple_id: string;
    author_id: string;
    body: string;
    media_path: string | null;
    media_name: string | null;
    media_mime: string | null;
  }) => PromiseLike<FeedInsertResponse>;
};

const feedClient = supabase as unknown as {
  from: (table: "couple_posts") => CouplePostTable;
};

export function listCouplePosts(coupleId: string) {
  return feedClient
    .from("couple_posts")
    .select("id, couple_id, author_id, body, media_path, media_name, media_mime, created_at, updated_at")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(80);
}

export function createCouplePost(input: {
  coupleId: string;
  authorId: string;
  body: string;
  mediaPath: string | null;
  mediaName: string | null;
  mediaMime: string | null;
}) {
  return feedClient.from("couple_posts").insert({
    couple_id: input.coupleId,
    author_id: input.authorId,
    body: input.body,
    media_path: input.mediaPath,
    media_name: input.mediaName,
    media_mime: input.mediaMime,
  });
}
