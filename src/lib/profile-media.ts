import { supabase } from "@/integrations/supabase/client";

export const PROFILE_MEDIA_BUCKET = "morados-profile-media";
export const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadProfileMedia(userId: string, file: File, kind: "avatar" | "banner") {
  if (!file.type.startsWith("image/")) {
    return { path: null, error: new Error("Escolha um arquivo de imagem.") };
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return { path: null, error: new Error("A imagem deve ter no máximo 10 MB.") };
  }

  const extension = (file.name.split(".").pop() ?? "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8) || "jpg";
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now().toString(36)) + "-" + Math.random().toString(36).slice(2);
  const path = userId + "/" + kind + "/" + id + "." + extension;

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  return { path: error ? null : path, error };
}

export async function createProfileMediaUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return { url: error ? null : data.signedUrl, error };
}

export async function removeProfileMedia(path: string) {
  return supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
}

export async function getProfileMediaUrl(path: string | null) {
  if (!path) return null;
  const current = await createProfileMediaUrl(path);
  if (current.url) return current.url;

  // Compatibilidade com fotos antigas que ainda estão no bucket couple-media.
  const legacy = await supabase.storage.from("couple-media").createSignedUrl(path, 60 * 60);
  return legacy.error ? null : legacy.data.signedUrl;
}
