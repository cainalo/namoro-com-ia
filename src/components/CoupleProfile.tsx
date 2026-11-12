import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, LoaderCircle, Save, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createCoupleMediaUrl, removeCoupleMedia, uploadCoupleMedia } from "@/lib/couple-media";

type ProfileRecord = { id: string; display_name: string | null; avatar_path: string | null; banner_path: string | null; bio: string | null };
async function signedMedia(path: string | null) {
  if (!path) return null;
  return (await createCoupleMediaUrl(path)).url;
}
export function ProfileAvatarButton({ userId, onClick }: { userId: string; onClick: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const loadAvatar = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
    setAvatarUrl(await signedMedia(data?.avatar_path ?? null));
  }, [userId]);
  useEffect(() => {
    void loadAvatar();
    const refresh = () => void loadAvatar();
    window.addEventListener("morados:profile-updated", refresh);
    return () => window.removeEventListener("morados:profile-updated", refresh);
  }, [loadAvatar]);
  return <button type="button" className="topbar-icon-button profile-avatar-trigger" onClick={onClick} aria-label="Abrir meu perfil" title="Meu perfil">
    {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound aria-hidden="true" />}
  </button>;
}

export function CoupleProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [profileExtrasAvailable, setProfileExtrasAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data: membership, error: membershipError }, { data: row, error: profileError }] = await Promise.all([
        supabase.from("couple_members").select("couple_id").eq("user_id", userId).is("ended_at", null).maybeSingle(),
        supabase.from("profiles").select("id,display_name,avatar_path").eq("id", userId).maybeSingle(),
      ]);
      if (membershipError) throw membershipError;
      if (profileError) throw profileError;
      if (!row) throw new Error("O perfil da conta ainda não foi criado. Saia e entre novamente para sincronizar sua conta.");
      const { data: extraFields, error: extraFieldsError } = await supabase
        .from("profiles")
        .select("bio,banner_path")
        .eq("id", userId)
        .maybeSingle();
      const next: ProfileRecord = {
        ...row,
        bio: extraFieldsError ? null : extraFields?.bio ?? null,
        banner_path: extraFieldsError ? null : extraFields?.banner_path ?? null,
      };
      setProfileExtrasAvailable(!extraFieldsError);
      setProfile(next); setCoupleId(membership?.couple_id ?? null);
      setName(next.display_name ?? ""); setBio(next.bio ?? "");
      const [avatar, banner] = await Promise.all([signedMedia(next.avatar_path), signedMedia(next.banner_path)]);
      setAvatarUrl(avatar); setBannerUrl(banner);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.");
    } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const profileChecklist = [
    Boolean(name.trim()),
    Boolean(avatarUrl),
    Boolean(bio.trim()),
    Boolean(bannerUrl),
  ];
  const completedProfileItems = profileChecklist.filter(Boolean).length;
  const profileCompletion = Math.round((completedProfileItems / profileChecklist.length) * 100);


  async function saveProfile() {
    if (!profile) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const update = profileExtrasAvailable
        ? await supabase.from("profiles").update({ display_name: name.trim() || null, bio: bio.trim() || null }).eq("id", userId)
        : await supabase.from("profiles").update({ display_name: name.trim() || null }).eq("id", userId);
      const updateError = update.error;
      if (updateError) throw updateError;
      setProfile({ ...profile, display_name: name.trim() || null, ...(profileExtrasAvailable ? { bio: bio.trim() || null } : {}) });
      setMessage(profileExtrasAvailable ? "Perfil atualizado." : "Nome atualizado. A descrição e a capa serão liberadas após a migração do perfil.");
      window.dispatchEvent(new Event("morados:profile-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.");
    } finally { setSaving(false); }
  }

  async function uploadProfileImage(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null; event.target.value = "";
    if (!file) return;
    if (!coupleId) { setError("Vincule a outra pessoa antes de adicionar imagens privadas ao perfil."); return; }
    if (kind === "banner" && !profileExtrasAvailable) { setError("A capa será liberada após a migração de personalização do perfil."); return; }
    if (!file.type.startsWith("image/")) { setError("Escolha um arquivo de imagem."); return; }
    setUploading(kind); setError(null); setMessage(null);
    const uploaded = await uploadCoupleMedia({ coupleId, userId, scope: "profile", file });
    if (uploaded.error || !uploaded.path) {
      setError(uploaded.error?.message ?? "Não foi possível enviar a imagem."); setUploading(null); return;
    }
    const previousPath = kind === "avatar" ? profile?.avatar_path : profile?.banner_path;
    const update = kind === "avatar"
      ? await supabase.from("profiles").update({ avatar_path: uploaded.path }).eq("id", userId)
      : await supabase.from("profiles").update({ banner_path: uploaded.path }).eq("id", userId);
    if (update.error) {
      await removeCoupleMedia(uploaded.path); setError(update.error.message); setUploading(null); return;
    }
    const url = await signedMedia(uploaded.path);
    setProfile((current) => current ? { ...current, ...(kind === "avatar" ? { avatar_path: uploaded.path } : { banner_path: uploaded.path }) } : current);
    if (kind === "avatar") setAvatarUrl(url); else setBannerUrl(url);
    if (previousPath && previousPath !== uploaded.path) await removeCoupleMedia(previousPath);
    setMessage(kind === "avatar" ? "Foto de perfil atualizada." : "Capa atualizada.");
    window.dispatchEvent(new Event("morados:profile-updated")); setUploading(null);
  }

  return <section className="profile-page" aria-busy={loading}>
    {loading ? (
      <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando perfil…</div>
    ) : (
      <>
        <div className="profile-cover">
          {bannerUrl && <img src={bannerUrl} alt="" />}
          <label className="profile-upload-button profile-edit-cover"><ImagePlus className="h-4 w-4" aria-hidden="true" /> Alterar capa
            <input className="sr-only" type="file" accept="image/*" disabled={!coupleId || !profileExtrasAvailable || uploading !== null} onChange={(event) => void uploadProfileImage("banner", event)} />
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
            <label className="profile-upload-button"><Camera className="h-4 w-4" aria-hidden="true" /> Alterar foto
              <input className="sr-only" type="file" accept="image/*" disabled={!coupleId || uploading !== null} onChange={(event) => void uploadProfileImage("avatar", event)} />
            </label>
          </div>
          <div className="profile-completion-card" aria-label={`Perfil preenchido em ${profileCompletion}%`}>
            <div className="profile-completion-copy">
              <div>
                <span className="profile-section-kicker">Identidade pessoal</span>
                <strong>Seu perfil</strong>
              </div>
              <span className="profile-completion-value">{profileCompletion}%</span>
            </div>
            <div className="profile-completion-track" aria-hidden="true">
              <span style={{ width: `${profileCompletion}%` }} />
            </div>
            <div className="profile-completion-items">
              {["Nome", "Foto", "Sobre mim", "Capa"].map((label, index) => (
                <span key={label} className={profileChecklist[index] ? "is-complete" : ""}>
                  <span aria-hidden="true">{profileChecklist[index] ? "✓" : "•"}</span>{label}
                </span>
              ))}
            </div>
          </div>
          <div className="profile-editor-grid">
            <label>Nome exibido<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Como a outra pessoa verá seu nome" /></label>
            <label>Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value)} disabled={!profileExtrasAvailable} maxLength={500} placeholder="Escreva algo sobre você…" /></label>
            {!coupleId && <p className="profile-note">Você pode editar seu nome agora. Depois de vincular a outra pessoa, poderá adicionar foto e capa ao armazenamento privado do casal.</p>}
            {!profileExtrasAvailable && <p className="profile-note">A descrição e a capa estão preparadas na interface, mas dependem da migração de perfil ainda não aplicada ao banco conectado.</p>}
            {uploading && <p className="profile-note">Enviando {uploading === "avatar" ? "foto de perfil" : "capa"}…</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {message && <p className="text-sm text-primary" role="status">{message}</p>}
            <div className="flex justify-end"><button type="button" className="profile-save-button" disabled={saving || loading} onClick={() => void saveProfile()}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Salvar perfil
            </button></div>
          </div>
        </div>
      </>
    )}
    {error && !profile && !loading && <p className="profile-note mt-4" role="alert">{error}</p>}
  </section>;
}
