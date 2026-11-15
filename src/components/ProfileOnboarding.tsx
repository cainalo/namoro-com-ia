import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import { MoradosMark } from "@/components/MoradosMark";
import { supabase } from "@/integrations/supabase/client";
import { getProfileMediaUrl, removeProfileMedia, uploadProfileMedia } from "@/lib/profile-media";

type ProfileOnboardingProps = {
  userId: string;
  onComplete: () => void;
};

export function ProfileOnboarding({ userId, onComplete }: ProfileOnboardingProps) {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [favoriteSong, setFavoriteSong] = useState("");
  const [favoritePlace, setFavoritePlace] = useState("");
  const [personalPhrase, setPersonalPhrase] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("display_name,bio,headline,interests,favorite_song,favorite_place,personal_phrase,avatar_path,banner_path")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (loadError || !data) {
        setError("Não foi possível carregar seu perfil. Confira a conexão e tente novamente.");
        setLoading(false);
        return;
      }
      setName(data.display_name ?? "");
      setHeadline(data.headline ?? "");
      setBio(data.bio ?? "");
      setInterests(Array.isArray(data.interests) ? data.interests.join(", ") : "");
      setFavoriteSong(data.favorite_song ?? "");
      setFavoritePlace(data.favorite_place ?? "");
      setPersonalPhrase(data.personal_phrase ?? "");
      setAvatarPath(data.avatar_path ?? null);
      setBannerPath(data.banner_path ?? null);
      const [avatar, banner] = await Promise.all([
        getProfileMediaUrl(data.avatar_path ?? null),
        getProfileMediaUrl(data.banner_path ?? null),
      ]);
      if (active) {
        setAvatarUrl(avatar);
        setBannerUrl(banner);
        setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!bannerFile) { setBannerPreview(null); return; }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  function selectImage(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma foto em formato de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Cada imagem deve ter no máximo 10 MB.");
      return;
    }
    setError(null);
    if (kind === "avatar") setAvatarFile(file);
    else setBannerFile(file);
  }

  async function saveProfile() {
    if (saving || loading) return;
    if (!name.trim()) {
      setError("Informe o nome que será exibido no seu perfil.");
      return;
    }

    setSaving(true);
    setError(null);
    let nextAvatarPath = avatarPath;
    let nextBannerPath = bannerPath;
    let newAvatarPath: string | null = null;
    let newBannerPath: string | null = null;

    try {
      if (avatarFile) {
        const upload = await uploadProfileMedia(userId, avatarFile, "avatar");
        if (upload.error || !upload.path) throw upload.error ?? new Error("Não foi possível enviar sua foto.");
        newAvatarPath = upload.path;
        nextAvatarPath = upload.path;
      }
      if (bannerFile) {
        const upload = await uploadProfileMedia(userId, bannerFile, "banner");
        if (upload.error || !upload.path) throw upload.error ?? new Error("Não foi possível enviar sua capa.");
        newBannerPath = upload.path;
        nextBannerPath = upload.path;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim(),
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
          favorite_song: favoriteSong.trim() || null,
          favorite_place: favoritePlace.trim() || null,
          personal_phrase: personalPhrase.trim() || null,
          avatar_path: nextAvatarPath,
          banner_path: nextBannerPath,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      if (avatarPath && avatarPath !== nextAvatarPath) await removeProfileMedia(avatarPath);
      if (bannerPath && bannerPath !== nextBannerPath) await removeProfileMedia(bannerPath);
      window.dispatchEvent(new Event("morados:profile-updated"));
      onComplete();
    } catch (cause) {
      if (newAvatarPath) await removeProfileMedia(newAvatarPath);
      if (newBannerPath) await removeProfileMedia(newBannerPath);
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar seu perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-onboarding" aria-busy={loading || saving}>
      <div className="profile-onboarding-shell">
        <header className="profile-onboarding-brand">
          <span className="profile-onboarding-brand-mark"><MoradosMark size={31} /></span>
          <span>morados</span>
        </header>
        <section className="profile-onboarding-card">
          <div className="profile-onboarding-heading">
            <span className="profile-onboarding-kicker"><Sparkles size={14} /> SEU ESPAÇO COMEÇA AQUI</span>
            <h1>Vamos criar seu perfil.</h1>
            <p>Antes de entrar, escolha como deseja ser visto. Você poderá mudar tudo isso depois.</p>
          </div>

          {loading ? (
            <div className="profile-onboarding-loading"><LoaderCircle className="animate-spin" /> Preparando seu perfil…</div>
          ) : (
            <>
              <label className="profile-onboarding-banner" style={bannerPreview || bannerUrl ? { backgroundImage: "url(" + (bannerPreview ?? bannerUrl) + ")" } : undefined}>
                <span className="profile-onboarding-banner-action"><ImagePlus size={17} /> Escolher foto do banner</span>
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => selectImage("banner", event)} />
              </label>

              <div className="profile-onboarding-identity">
                <label className="profile-onboarding-avatar">
                  {avatarPreview || avatarUrl
                    ? <img src={avatarPreview ?? avatarUrl ?? undefined} alt="Prévia da foto de perfil" />
                    : <UserRound size={38} aria-hidden="true" />}
                  <span><Camera size={14} /> Foto de perfil</span>
                  <input className="sr-only" type="file" accept="image/*" onChange={(event) => selectImage("avatar", event)} />
                </label>
                <div className="profile-onboarding-identity-copy">
                  <strong>{name.trim() || "Seu nome"}</strong>
                  <span>{headline.trim() || "Uma frase que apresenta você"}</span>
                  <small>Foto e banner podem ser trocados a qualquer momento.</small>
                </div>
              </div>

              <div className="profile-onboarding-fields">
                <label>Como devemos chamar você?
                  <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} placeholder="Seu nome ou apelido" />
                </label>
                <label>Uma frase para se apresentar
                  <input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={100} placeholder="Ex.: Um curioso que ama descobrir coisas" />
                </label>
                <label>Sobre mim
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} placeholder="Conte um pouco sobre você…" />
                </label>
                <label>O que você gosta?
                  <input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={300} placeholder="Música, livros, viagens, jogos…" />
                </label>
                <div className="profile-onboarding-two-columns">
                  <label>Música especial
                    <input value={favoriteSong} onChange={(event) => setFavoriteSong(event.target.value)} maxLength={100} placeholder="Uma música que te representa" />
                  </label>
                  <label>Lugar favorito
                    <input value={favoritePlace} onChange={(event) => setFavoritePlace(event.target.value)} maxLength={100} placeholder="Um lugar importante para você" />
                  </label>
                </div>
                <label>Uma frase que é sua
                  <input value={personalPhrase} onChange={(event) => setPersonalPhrase(event.target.value)} maxLength={180} placeholder="Uma frase, lema ou lembrança" />
                </label>
              </div>

              {error && <p className="profile-onboarding-error" role="alert">{error}</p>}
              <button type="button" className="profile-onboarding-submit" onClick={() => void saveProfile()} disabled={saving || !name.trim()}>
                {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {saving ? "Salvando seu perfil…" : "Concluir e entrar"}
              </button>
              <p className="profile-onboarding-footnote">Suas informações e imagens ficam privadas e são compartilhadas apenas dentro do espaço de vocês quando o pareamento for concluído.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
