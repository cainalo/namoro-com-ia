import { supabase } from "@/integrations/supabase/client";

export type CoupleMediaScope = "chat" | "feed";

export const COUPLE_MEDIA_BUCKET = "couple-media";
export const MAX_COUPLE_MEDIA_BYTES = 35 * 1024 * 1024;

const ALLOWED_MEDIA_PREFIXES = [
  "image/",
  "video/",
  "audio/",
];

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isSupportedCoupleMedia(file: File) {
  return (
    ALLOWED_MEDIA_PREFIXES.some((prefix) => file.type.startsWith(prefix)) ||
    ALLOWED_DOCUMENT_TYPES.has(file.type)
  );
}

export async function uploadCoupleMedia(input: {
  coupleId: string;
  userId: string;
  scope: CoupleMediaScope;
  file: File;
}) {
  if (!isSupportedCoupleMedia(input.file)) {
    return { path: null, error: new Error("Este tipo de arquivo não é aceito.") };
  }

  if (input.file.size > MAX_COUPLE_MEDIA_BYTES) {
    return { path: null, error: new Error("O arquivo ultrapassa o limite de 35 MB.") };
  }

  const rawExtension = input.file.name.split(".").pop() ?? "bin";
  const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const path = [
    input.coupleId,
    input.userId,
    input.scope,
    uniqueId + "." + extension,
  ].join("/");

  const { error } = await supabase.storage
    .from(COUPLE_MEDIA_BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) return { path: null, error };
  return { path, error: null };
}

export async function createCoupleMediaUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(COUPLE_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return {
    url: error ? null : data.signedUrl,
    error,
  };
}

export async function removeCoupleMedia(path: string) {
  return supabase.storage.from(COUPLE_MEDIA_BUCKET).remove([path]);
}
