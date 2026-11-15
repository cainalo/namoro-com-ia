import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Camera, Check, Circle, ImagePlus, LoaderCircle, Save, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfileMediaUrl, removeProfileMedia, uploadProfileMedia } from "@/lib/profile-media";
import { removeCoupleMedia } from "@/lib/couple-media";
import { AppGeneralSettings } from "@/components/AppGeneralSettings";

type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  banner_path: string | null;
  bio: string | null;
  headline: string | null;
  interests: string[];
  favorite_song: string | null;
  favorite_place: string | null;
  personal_phrase: string | null;
};

async function removeOldProfileImage(path: string, userId: string) {
  if (path.startsWith(userId + "/")) {
    await removeProfileMedia(path);
  } else {
    await removeCoupleMedia(path);
  }
}

export function ProfileAvatarButton({ userId, onClick }: { userId: string; onClick: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const loadAvatar = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
    setAvatarUrl(await getProfileMediaUrl(data?.avatar_path ?? null));
  }, [userId]);
  useEffect(() => {
    void loadAvatar();
    const refresh = () => void loadAvatar();
    window.addEventListener("morados:profile-updated", refresh);
    return () => window.removeEventListener("morados:profile-updated", refresh);
  }, [loadAvatar]);

  return (
    <button type="button" className="topbar-icon-button profile-avatar-trigger" onClick={onClick} aria-label="Abrir meu perfil" title="Meu perfil" data-tour-target="profile-button">
      {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound aria-hidden="true" />}
    </button>
  );
}

export function CoupleProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [favoriteSong, setFavoriteSong] = useState("");
  const [favoritePlace, setFavoritePlace] = useState("");
  const [personalPhrase, setPersonalPhrase] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_path,banner_path,bio,headline,interests,favorite_song,favorite_place,personal_phrase")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!data) throw new Error("O perfil ainda não foi sincronizado. Saia e entre novamente.");
      const next: ProfileRecord = {
        ...data,
        interests: Array.isArray(data.interests) ? data.interests : [],
      };
      setProfile(next);
      setName(next.display_name ?? "");
      setHeadline(next.headline ?? "");
      setBio(next.bio ?? "");
      setInterests(next.interests.join(", "));
      setFavoriteSong(next.favorite_song ?? "");
      setFavoritePlace(next.favorite_place ?? "");
      setPersonalPhrase(next.personal_phrase ?? "");
      const [avatar, banner] = await Promise.all([
        getProfileMediaUrl(next.avatar_path),
        getProfileMediaUrl(next.banner_path),
      ]);
      setAvatarUrl(avatar);
      setBannerUrl(banner);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const profileChecklist = [
    Boolean(name.trim()),
    Boolean(avatarUrl),
    Boolean(bio.trim()),
    Boolean(bannerUrl),
    interests.trim().length > 0,
  ];
  const completedProfileItems = profileChecklist.filter(Boolean).length;
  const profileCompletion = Math.round((completedProfileItems / profileChecklist.length) * 100);

  async function saveProfile() {
    if (!profile || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: updateError } = await supabase.from("profiles").update({
        display_name: name.trim() || null,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        favorite_song: favoriteSong.trim() || null,
        favorite_place: favoritePlace.trim() || null,
        personal_phrase: personalPhrase.trim() || null,
      }).eq("id", userId);
      if (updateError) throw updateError;
      setProfile({
        ...profile,
        display_name: name.trim() || null,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        favorite_song: favoriteSong.trim() || null,
        favorite_place: favoritePlace.trim() || null,
        personal_phrase: personalPhrase.trim() || null,
      });
      setMessage("Perfil atualizado.");
      window.dispatchEvent(new Event("morados:profile-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setUploading(kind);
    setError(null);
    setMessage(null);
    const upload = await uploadProfileMedia(userId, file, kind);
    if (upload.error || !upload.path) {
      setError(upload.error?.message ?? "Não foi possível enviar a imagem.");
      setUploading(null);
      return;
    }

    const oldPath = kind === "avatar" ? profile?.avatar_path : profile?.banner_path;
    const update = kind === "avatar"
      ? await supabase.from("profiles").update({ avatar_path: upload.path }).eq("id", userId)
      : await supabase.from("profiles").update({ banner_path: upload.path }).eq("id", userId);

    if (update.error) {
      await removeProfileMedia(upload.path);
      setError(update.error.message);
      setUploading(null);
      return;
    }

    const url = await getProfileMediaUrl(upload.path);
    setProfile((current) => current
      ? { ...current, ...(kind === "avatar" ? { avatar_path: upload.path } : { banner_path: upload.path }) }
      : current);
    if (kind === "avatar") setAvatarUrl(url);
    else setBannerUrl(url);
    if (oldPath && oldPath !== upload.path) await removeOldProfileImage(oldPath, userId);
    setMessage(kind === "avatar" ? "Foto de perfil atualizada." : "Banner atualizado.");
    window.dispatchEvent(new Event("morados:profile-updated"));
    setUploading(null);
  }

  return (
    <section className="profile-page" aria-busy={loading}>
      <div className="mb-4"><AppGeneralSettings /></div>
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando perfil…</div>
      ) : profile ? (
        <>
          <div className="profile-cover">
            {bannerUrl && <img src={bannerUrl} alt="" />}
            <label className="profile-upload-button profile-edit-cover"><ImagePlus className="h-4 w-4" aria-hidden="true" /> Alterar banner
              <input className="sr-only" type="file" accept="image/*" disabled={uploading !== null} onChange={(event) => void uploadImage("banner", event)} />
            </label>
          </div>
          <div className="profile-main-card">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 items-end gap-3">
                <div className="profile-avatar-large -mt-12 shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="Foto de perfil" /> : <span className="profile-avatar-placeholder"><UserRound className="h-9 w-9" aria-hidden="true" /></span>}
                </div>
                <div className="min-w-0 pb-1">
                  <h1 className="truncate font-display text-xl font-bold">{name.trim() || "Seu perfil"}</h1>
                  <p className="profile-note">{headline.trim() || "Seu espaço pessoal no Morados"}</p>
                </div>
              </div>
              <label className="profile-upload-button"><Camera className="h-4 w-4" aria-hidden="true" /> Alterar foto
                <input className="sr-only" type="file" accept="image/*" disabled={uploading !== null} onChange={(event) => void uploadImage("avatar", event)} />
              </label>
            </div>

            <div className="profile-completion-card" aria-label={"Perfil preenchido em " + profileCompletion + "%"}>
              <div className="profile-completion-copy">
                <div><span className="profile-section-kicker">Identidade pessoal</span><strong>Seu perfil</strong></div>
                <span className="profile-completion-value">{profileCompletion}%</span>
              </div>
              <div className="profile-completion-track" aria-hidden="true"><span style={{ width: profileCompletion + "%" }} /></div>
              <div className="profile-completion-items">
                {["Nome", "Foto", "Sobre mim", "Banner", "Interesses"].map((label, index) => (
                  <span key={label} className={profileChecklist[index] ? "is-complete" : ""}>
                    <span aria-hidden="true">{profileChecklist[index] ? <Check /> : <Circle />}</span>{label}
                  </span>
                ))}
              </div>
            </div>

            <div className="profile-editor-grid">
              <label>Nome exibido<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Como a outra pessoa verá seu nome" /></label>
              <label>Uma frase para se apresentar<input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={100} placeholder="Uma pequena apresentação" /></label>
              <label>Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} placeholder="Escreva algo sobre você…" /></label>
              <label>Interesses e coisas de que gosto<input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={300} placeholder="Música, livros, viagens, jogos…" /></label>
              <div className="profile-editor-two-columns">
                <label>Música especial<input value={favoriteSong} onChange={(event) => setFavoriteSong(event.target.value)} maxLength={100} placeholder="Uma música importante" /></label>
                <label>Lugar favorito<input value={favoritePlace} onChange={(event) => setFavoritePlace(event.target.value)} maxLength={100} placeholder="Um lugar especial" /></label>
              </div>
              <label>Uma frase que é sua<input value={personalPhrase} onChange={(event) => setPersonalPhrase(event.target.value)} maxLength={180} placeholder="Um lema, frase ou lembrança" /></label>
              {uploading && <p className="profile-note">Enviando {uploading === "avatar" ? "foto de perfil" : "banner"}…</p>}
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              {message && <p className="text-sm text-primary" role="status">{message}</p>}
              <div className="flex justify-end"><button type="button" className="profile-save-button" disabled={saving || loading} onClick={() => void saveProfile()}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Salvar perfil
              </button></div>
            </div>
          </div>
        </>
      ) : (
        <p className="profile-note mt-4" role="alert">{error ?? "Não foi possível carregar seu perfil."}</p>
      )}
    </section>
  );
}
