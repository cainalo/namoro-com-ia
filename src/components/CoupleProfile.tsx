import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Camera, Check, Circle, ImagePlus, LoaderCircle, Save, UserRound, Heart, Music2, Utensils, Film, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createProfileImageUrl, createUserProfileMediaUrl, removeProfileImage, removeUserProfileMedia, uploadUserProfileMedia } from "@/lib/profile-media";
import { AppGeneralSettings } from "@/components/AppGeneralSettings";

type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  banner_path: string | null;
  bio: string | null;
  interests: string[] | null;
  hobbies: string | null;
  favorite_food: string | null;
  favorite_music: string | null;
  favorite_film: string | null;
  profile_quote: string | null;
};

function profileTable() {
  return (supabase as unknown as { from: (table: string) => any }).from("profiles");
}

export function ProfileAvatarButton({ userId, onClick }: { userId: string; onClick: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const loadAvatar = useCallback(async () => {
    const { data } = await profileTable().select("avatar_path").eq("id", userId).maybeSingle();
    setAvatarUrl(await createProfileImageUrl(data?.avatar_path ?? null, userId));
  }, [userId]);
  useEffect(() => {
    void loadAvatar();
    const refresh = () => void loadAvatar();
    window.addEventListener("morados:profile-updated", refresh);
    return () => window.removeEventListener("morados:profile-updated", refresh);
  }, [loadAvatar]);
  return <button type="button" data-tour-target="tour-profile-button" className="topbar-icon-button profile-avatar-trigger" onClick={onClick} aria-label="Abrir meu perfil" title="Meu perfil">
    {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound aria-hidden="true" />}
  </button>;
}

export function CoupleProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteFilm, setFavoriteFilm] = useState("");
  const [profileQuote, setProfileQuote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: row, error: profileError } = await profileTable()
        .select("id,display_name,avatar_path,banner_path,bio,interests,hobbies,favorite_food,favorite_music,favorite_film,profile_quote")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!row) throw new Error("O perfil desta conta ainda não foi criado. Tente sair e entrar novamente.");
      const next = row as ProfileRecord;
      setProfile(next);
      setName(next.display_name ?? "");
      setBio(next.bio ?? "");
      setInterests((next.interests ?? []).join(", "));
      setHobbies(next.hobbies ?? "");
      setFavoriteFood(next.favorite_food ?? "");
      setFavoriteMusic(next.favorite_music ?? "");
      setFavoriteFilm(next.favorite_film ?? "");
      setProfileQuote(next.profile_quote ?? "");
      const [avatar, banner] = await Promise.all([
        createProfileImageUrl(next.avatar_path, userId),
        createProfileImageUrl(next.banner_path, userId),
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
    Boolean(interests.trim()),
    Boolean(hobbies.trim()),
  ];
  const profileCompletion = Math.round((profileChecklist.filter(Boolean).length / profileChecklist.length) * 100);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: updateError } = await profileTable().update({
        display_name: name.trim() || null,
        bio: bio.trim() || null,
        interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        hobbies: hobbies.trim() || null,
        favorite_food: favoriteFood.trim() || null,
        favorite_music: favoriteMusic.trim() || null,
        favorite_film: favoriteFilm.trim() || null,
        profile_quote: profileQuote.trim() || null,
      }).eq("id", userId);
      if (updateError) throw updateError;
      setProfile({
        ...profile,
        display_name: name.trim() || null,
        bio: bio.trim() || null,
        interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        hobbies: hobbies.trim() || null,
        favorite_food: favoriteFood.trim() || null,
        favorite_music: favoriteMusic.trim() || null,
        favorite_film: favoriteFilm.trim() || null,
        profile_quote: profileQuote.trim() || null,
      });
      setMessage("Seu perfil foi atualizado.");
      window.dispatchEvent(new Event("morados:profile-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadProfileImage(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    setUploading(kind);
    setError(null);
    setMessage(null);
    const uploaded = await uploadUserProfileMedia(userId, file);
    if (uploaded.error || !uploaded.path) {
      setError(uploaded.error?.message ?? "Não foi possível enviar a imagem.");
      setUploading(null);
      return;
    }
    const previousPath = kind === "avatar" ? profile?.avatar_path : profile?.banner_path;
    const update = kind === "avatar"
      ? await profileTable().update({ avatar_path: uploaded.path }).eq("id", userId)
      : await profileTable().update({ banner_path: uploaded.path }).eq("id", userId);
    if (update.error) {
      await removeUserProfileMedia(uploaded.path);
      setError(update.error.message);
      setUploading(null);
      return;
    }
    const { url } = await createUserProfileMediaUrl(uploaded.path);
    setProfile((current) => current ? { ...current, ...(kind === "avatar" ? { avatar_path: uploaded.path } : { banner_path: uploaded.path }) } : current);
    if (kind === "avatar") setAvatarUrl(url); else setBannerUrl(url);
    if (previousPath && previousPath !== uploaded.path) await removeProfileImage(previousPath, userId);
    setMessage(kind === "avatar" ? "Foto de perfil atualizada." : "Banner atualizado.");
    window.dispatchEvent(new Event("morados:profile-updated"));
    setUploading(null);
  }

  return <section className="profile-page" data-tour-target="tour-profile" aria-busy={loading}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <AppGeneralSettings />
      <button type="button" className="profile-upload-button" onClick={() => window.dispatchEvent(new Event("morados:show-tour"))}><RotateCcw className="h-4 w-4" /> Ver tutorial novamente</button>
    </div>
    {loading ? (
      <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando perfil…</div>
    ) : (
      <>
        <div className="profile-cover">
          {bannerUrl && <img src={bannerUrl} alt="" />}
          <label className="profile-upload-button profile-edit-cover"><ImagePlus className="h-4 w-4" aria-hidden="true" /> {bannerUrl ? "Alterar banner" : "Adicionar banner"}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => void uploadProfileImage("banner", event)} />
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
                <p className="profile-note">Seu espaço pessoal no Morados</p>
              </div>
            </div>
            <label className="profile-upload-button"><Camera className="h-4 w-4" aria-hidden="true" /> {avatarUrl ? "Alterar foto" : "Adicionar foto"}
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => void uploadProfileImage("avatar", event)} />
            </label>
          </div>

          <div className="profile-completion-card" aria-label={`Perfil preenchido em ${profileCompletion}%`}>
            <div className="profile-completion-copy">
              <div><span className="profile-section-kicker">Identidade pessoal</span><strong>Seu perfil</strong></div>
              <span className="profile-completion-value">{profileCompletion}%</span>
            </div>
            <div className="profile-completion-track" aria-hidden="true"><span style={{ width: `${profileCompletion}%` }} /></div>
            <div className="profile-completion-items">
              {["Nome", "Foto", "Sobre mim", "Banner", "Interesses", "Hobbies"].map((label, index) => (
                <span key={label} className={profileChecklist[index] ? "is-complete" : ""}>
                  <span aria-hidden="true">{profileChecklist[index] ? <Check /> : <Circle />}</span>{label}
                </span>
              ))}
            </div>
          </div>

          <div className="profile-editor-grid">
            <label>Nome exibido<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Como a outra pessoa verá seu nome" /></label>
            <label>Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} placeholder="Conte um pouco sobre você…" /></label>
            <label>Interesses<input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={240} placeholder="Música, cinema, viagens, leitura…" /></label>
            <label>Hobbies<textarea value={hobbies} onChange={(event) => setHobbies(event.target.value)} maxLength={300} rows={3} placeholder="O que você gosta de fazer no tempo livre?" /></label>
            <div className="profile-favorites-grid">
              <label><Utensils /> Comida favorita<input value={favoriteFood} onChange={(event) => setFavoriteFood(event.target.value)} maxLength={80} placeholder="Um prato ou sabor" /></label>
              <label><Music2 /> Música ou artista favorito<input value={favoriteMusic} onChange={(event) => setFavoriteMusic(event.target.value)} maxLength={100} placeholder="Uma música ou artista" /></label>
              <label><Film /> Filme ou série favorito<input value={favoriteFilm} onChange={(event) => setFavoriteFilm(event.target.value)} maxLength={100} placeholder="Um filme ou série" /></label>
              <label><Heart /> Uma frase sua<input value={profileQuote} onChange={(event) => setProfileQuote(event.target.value)} maxLength={180} placeholder="Uma frase que combina com você" /></label>
            </div>
            {uploading && <p className="profile-note">Enviando {uploading === "avatar" ? "foto de perfil" : "banner"}…</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {message && <p className="text-sm text-primary" role="status">{message}</p>}
            <div className="flex justify-end"><button type="button" className="profile-save-button" disabled={saving || loading || uploading !== null} onClick={() => void saveProfile()}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Salvar perfil
            </button></div>
          </div>
        </div>
      </>
    )}
    {error && !profile && !loading && <p className="profile-note mt-4" role="alert">{error}</p>}
  </section>;
}
