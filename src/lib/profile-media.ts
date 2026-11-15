import { supabase } from "@/integrations/supabase/client";

export const PROFILE_MEDIA_BUCKET = "profiles-media";
export const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  return byType[file.type] ?? "jpg";
}

export async function uploadUserProfileMedia(userId: string, file: File) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    return { path: null, error: new Error("Use uma imagem JPG, PNG, WebP ou AVIF.") };
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return { path: null, error: new Error("A imagem deve ter no máximo 10 MB.") };
  }

  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${id}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  return { path: error ? null : path, error };
}

export async function createUserProfileMediaUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return { url: error ? null : data.signedUrl, error };
}

export async function removeUserProfileMedia(path: string) {
  return supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
}

export async function createProfileImageUrl(path: string | null, userId: string) {
  if (!path) return null;
  if (path.startsWith(`${userId}/`)) {
    return (await createUserProfileMediaUrl(path)).url;
  }
  // Compatibilidade com imagens antigas, que permanecem no bucket do casal.
  const { createCoupleMediaUrl } = await import("@/lib/couple-media");
  return (await createCoupleMediaUrl(path)).url;
}

export async function removeProfileImage(path: string, userId: string) {
  if (path.startsWith(`${userId}/`)) return removeUserProfileMedia(path);
  const { removeCoupleMedia } = await import("@/lib/couple-media");
  return removeCoupleMedia(path);
}
