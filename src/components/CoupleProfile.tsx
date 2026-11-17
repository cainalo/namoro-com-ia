import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeAuth } from "@/lib/native-auth";
import { Camera, Check, Circle, ImagePlus, LoaderCircle, Save, UserRound, Heart, Music2, Utensils, Film, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createProfileImageUrl, createUserProfileMediaUrl, removeProfileImage, removeUserProfileMedia, uploadUserProfileMedia } from "@/lib/profile-media";
import { AppGeneralSettings } from "@/components/AppGeneralSettings";
import "./ProfileExtras.css";
import "@/styles/morados-profile.css";

type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  banner_path: string | null;
  bio: string | null;
  headline: string | null;
  favorite_song: string | null;
  favorite_place: string | null;
  personal_phrase: string | null;
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

const PROFILE_REQUEST_TIMEOUT_MS = 10_000;

function withProfileTimeout<T>(request: PromiseLike<T>, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), PROFILE_REQUEST_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(request), timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

type ProfileTextField = "name" | "headline" | "bio" | "interests" | "hobbies" | "favoriteFood" | "favoriteMusic" | "favoriteSong" | "favoritePlace" | "favoriteFilm" | "personalPhrase" | "profileQuote";

function NativeProfileField({
  label,
  value,
  placeholder,
  multiline = false,
  disabled = false,
  onEdit,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  disabled?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="first-access-native-field">
      <span className="first-access-native-label">{label}</span>
      <button
        type="button"
        className={multiline ? "first-access-native-input is-multiline" : "first-access-native-input"}
        data-empty={!value ? "true" : "false"}
        disabled={disabled}
        onClick={onEdit}
        aria-label={label}
      >
        <span>{value || placeholder}</span>
        <span className="first-access-native-edit-hint">Toque para editar</span>
      </button>
    </div>
  );
}

export function ProfileAvatarButton({ userId, onClick }: { userId: string; onClick: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const loadAvatar = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const { data, error } = await withProfileTimeout(
        profileTable().select("avatar_path").eq("id", userId).maybeSingle(),
        "A foto do perfil está demorando para responder.",
      );
      if (error) throw error;
      const url = await withProfileTimeout(
        createProfileImageUrl(data?.avatar_path ?? null, userId),
        "A foto do perfil está demorando para carregar.",
      );
      if (isActive()) setAvatarUrl(url);
    } catch (cause) {
      console.warn("Não foi possível atualizar a foto do cabeçalho.", cause);
      if (isActive()) setAvatarUrl(null);
    }
  }, [userId]);
  useEffect(() => {
    let active = true;
    void loadAvatar(() => active);
    const refresh = () => void loadAvatar(() => active);
    window.addEventListener("morados:profile-updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("morados:profile-updated", refresh);
    };
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
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteSong, setFavoriteSong] = useState("");
  const [favoritePlace, setFavoritePlace] = useState("");
  const [personalPhrase, setPersonalPhrase] = useState("");
  const [favoriteFilm, setFavoriteFilm] = useState("");
  const [profileQuote, setProfileQuote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [editingField, setEditingField] = useState<ProfileTextField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setError(null);
    setMediaError(null);
    try {
      const { data: row, error: profileError } = await withProfileTimeout(
        profileTable()
          .select("id,display_name,avatar_path,banner_path,bio,headline,interests,hobbies,favorite_food,favorite_music,favorite_song,favorite_place,personal_phrase,favorite_film,profile_quote")
          .eq("id", userId)
          .maybeSingle(),
        "O perfil está demorando para responder. Verifique sua conexão e tente novamente.",
      );
      if (!isActive()) return;
      if (profileError) throw profileError;
      if (!row) throw new Error("O perfil desta conta ainda não foi criado. Tente sair e entrar novamente.");

      const next = row as ProfileRecord;
      setProfile(next);
      setName(next.display_name ?? "");
      setHeadline(next.headline ?? "");
      setBio(next.bio ?? "");
      setInterests((next.interests ?? []).join(", "));
      setHobbies(next.hobbies ?? "");
      setFavoriteFood(next.favorite_food ?? "");
      setFavoriteMusic(next.favorite_music ?? "");
      setFavoriteSong(next.favorite_song ?? "");
      setFavoritePlace(next.favorite_place ?? "");
      setPersonalPhrase(next.personal_phrase ?? "");
      setFavoriteFilm(next.favorite_film ?? "");
      setProfileQuote(next.profile_quote ?? "");

      // O formulário é liberado assim que os dados textuais chegam.
      // A assinatura das imagens é independente e nunca bloqueia os campos.
      setAvatarUrl(null);
      setBannerUrl(null);
      setLoading(false);

      const [avatarResult, bannerResult] = await Promise.allSettled([
        withProfileTimeout(
          createProfileImageUrl(next.avatar_path, userId),
          "A foto de perfil está demorando para carregar.",
        ),
        withProfileTimeout(
          createProfileImageUrl(next.banner_path, userId),
          "O banner está demorando para carregar.",
        ),
      ]);
      if (!isActive()) return;

      const avatar = avatarResult.status === "fulfilled" ? avatarResult.value : null;
      const banner = bannerResult.status === "fulfilled" ? bannerResult.value : null;
      setAvatarUrl(avatar);
      setBannerUrl(banner);
      if (avatarResult.status === "rejected" || bannerResult.status === "rejected") {
        console.warn("O texto do perfil foi carregado, mas uma mídia não pôde ser resolvida.", {
          avatar: avatarResult.status === "rejected" ? avatarResult.reason : null,
          banner: bannerResult.status === "rejected" ? bannerResult.reason : null,
        });
        setMediaError("Seu perfil está disponível. Não foi possível carregar uma das imagens; tente atualizar a tela mais tarde.");
      }
    } catch (cause) {
      if (!isActive()) return;
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.");
      setProfile(null);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]);

  async function editNativeField(field: ProfileTextField) {
    if (!Capacitor.isNativePlatform() || saving || uploading !== null || editingField !== null) return;

    const config = {
      name: { title: "Nome exibido", hint: "Como a outra pessoa verá seu nome", value: name, maxLength: 60, singleLine: true },
      headline: { title: "Frase de apresentação", hint: "Uma frase curta sobre você", value: headline, maxLength: 100, singleLine: true },
      bio: { title: "Sobre mim", hint: "Conte um pouco sobre você…", value: bio, maxLength: 500, singleLine: false },
      interests: { title: "Interesses", hint: "Música, cinema, viagens, leitura…", value: interests, maxLength: 240, singleLine: false },
      hobbies: { title: "Hobbies", hint: "O que você gosta de fazer no tempo livre?", value: hobbies, maxLength: 300, singleLine: false },
      favoriteFood: { title: "Comida favorita", hint: "Um prato ou sabor", value: favoriteFood, maxLength: 80, singleLine: true },
      favoriteMusic: { title: "Música ou artista favorito", hint: "Uma música ou artista", value: favoriteMusic, maxLength: 100, singleLine: true },
      favoriteSong: { title: "Canção favorita", hint: "Uma música especial", value: favoriteSong, maxLength: 120, singleLine: true },
      favoritePlace: { title: "Lugar favorito", hint: "Um lugar importante para você", value: favoritePlace, maxLength: 100, singleLine: true },
      favoriteFilm: { title: "Filme ou série favorito", hint: "Um filme ou série", value: favoriteFilm, maxLength: 100, singleLine: true },
      personalPhrase: { title: "Uma frase pessoal", hint: "Um lema ou lembrança sua", value: personalPhrase, maxLength: 180, singleLine: false },
      profileQuote: { title: "Uma frase sua", hint: "Uma frase que combina com você", value: profileQuote, maxLength: 180, singleLine: false },
    }[field];

    setEditingField(field);
    setError(null);
    try {
      const result = await NativeAuth.showTextInputDialog({
        title: config.title,
        description: "O texto será salvo no seu perfil pessoal. Você poderá alterá-lo depois.",
        hint: config.hint,
        initialValue: config.value,
        confirmText: "Confirmar",
        maxLength: config.maxLength,
        singleLine: config.singleLine,
        allowEmpty: true,
      });
      if (result.cancelled) return;
      const value = (result.text ?? "").slice(0, config.maxLength);
      switch (field) {
        case "name": setName(value); break;
        case "headline": setHeadline(value); break;
        case "bio": setBio(value); break;
        case "interests": setInterests(value); break;
        case "hobbies": setHobbies(value); break;
        case "favoriteFood": setFavoriteFood(value); break;
        case "favoriteMusic": setFavoriteMusic(value); break;
        case "favoriteSong": setFavoriteSong(value); break;
        case "favoritePlace": setFavoritePlace(value); break;
        case "favoriteFilm": setFavoriteFilm(value); break;
        case "personalPhrase": setPersonalPhrase(value); break;
        case "profileQuote": setProfileQuote(value); break;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o campo de edição.");
    } finally {
      setEditingField(null);
    }
  }

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
      const { error: updateError } = await withProfileTimeout(
        profileTable().update({
          display_name: name.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
          hobbies: hobbies.trim() || null,
          favorite_food: favoriteFood.trim() || null,
          favorite_music: favoriteMusic.trim() || null,
          favorite_song: favoriteSong.trim() || null,
          favorite_place: favoritePlace.trim() || null,
          personal_phrase: personalPhrase.trim() || null,
          favorite_film: favoriteFilm.trim() || null,
          profile_quote: profileQuote.trim() || null,
        }).eq("id", userId),
        "O salvamento do perfil está demorando. Verifique sua conexão e tente novamente.",
      );
      if (updateError) throw updateError;
      setProfile({
        ...profile,
        display_name: name.trim() || null,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        hobbies: hobbies.trim() || null,
        favorite_food: favoriteFood.trim() || null,
        favorite_music: favoriteMusic.trim() || null,
        favorite_song: favoriteSong.trim() || null,
        favorite_place: favoritePlace.trim() || null,
        personal_phrase: personalPhrase.trim() || null,
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
    setMediaError(null);
    setMessage(null);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await withProfileTimeout(
        uploadUserProfileMedia(userId, file),
        "O envio da imagem está demorando. Verifique sua conexão e tente novamente.",
      );
      if (uploaded.error || !uploaded.path) {
        throw uploaded.error ?? new Error("Não foi possível enviar a imagem.");
      }
      uploadedPath = uploaded.path;

      const previousPath = kind === "avatar" ? profile?.avatar_path : profile?.banner_path;
      const update = kind === "avatar"
        ? await withProfileTimeout(
            profileTable().update({ avatar_path: uploaded.path }).eq("id", userId),
            "A atualização da foto está demorando. Tente novamente.",
          )
        : await withProfileTimeout(
            profileTable().update({ banner_path: uploaded.path }).eq("id", userId),
            "A atualização do banner está demorando. Tente novamente.",
          );
      if (update.error) throw update.error;

      setProfile((current) => current
        ? { ...current, ...(kind === "avatar" ? { avatar_path: uploaded.path } : { banner_path: uploaded.path }) }
        : current);

      try {
        const { url, error: urlError } = await withProfileTimeout(
          createUserProfileMediaUrl(uploaded.path),
          "A imagem foi salva, mas sua prévia está demorando para carregar.",
        );
        if (urlError) throw urlError;
        if (kind === "avatar") setAvatarUrl(url); else setBannerUrl(url);
      } catch (cause) {
        setMediaError("A imagem foi salva, mas a prévia não carregou. Atualize o perfil para tentar novamente.");
        console.warn("A imagem do perfil foi salva, mas não foi possível obter sua URL temporária.", cause);
      }

      if (previousPath && previousPath !== uploaded.path) {
        void withProfileTimeout(
          removeProfileImage(previousPath, userId),
          "A limpeza da imagem anterior está demorando.",
        ).catch((cause: unknown) => console.warn("Não foi possível remover a imagem anterior do perfil.", cause));
      }
      setMessage(kind === "avatar" ? "Foto de perfil atualizada." : "Banner atualizado.");
      window.dispatchEvent(new Event("morados:profile-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
      if (uploadedPath) {
        void withProfileTimeout(
          removeUserProfileMedia(uploadedPath),
          "A limpeza da imagem não utilizada está demorando.",
        ).catch((cleanupError: unknown) => console.warn("Não foi possível limpar a imagem não utilizada.", cleanupError));
      }
    } finally {
      setUploading(null);
    }
  }

  return <section className="profile-page morados-profile" data-tour-target="tour-profile" aria-busy={loading}>
    <div className="morados-profile-toolbar">
      <AppGeneralSettings />
      <button type="button" className="profile-upload-button morados-profile-tour" onClick={() => window.dispatchEvent(new Event("morados:show-tour"))}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Ver tutorial novamente
      </button>
    </div>
    {loading ? (
      <div className="morados-profile-loading" role="status">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>Carregando perfil…</span>
      </div>
    ) : (
      <>
        <div className="profile-cover morados-profile-cover">
          {bannerUrl && <img src={bannerUrl} alt="" />}
          <label className="profile-upload-button profile-edit-cover morados-profile-banner-action">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {bannerUrl ? "Alterar banner" : "Adicionar banner"}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => void uploadProfileImage("banner", event)} />
          </label>
          {!bannerUrl && <span className="morados-profile-cover-caption" aria-hidden="true">Um lugar para guardar o que faz parte de você.</span>}
        </div>

        <div className="profile-main-card morados-profile-sheet">
          <header className="morados-profile-identity">
            <div className="morados-profile-person">
              <div className="profile-avatar-large morados-profile-avatar">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Foto de perfil" />
                  : <span className="profile-avatar-placeholder"><UserRound className="h-9 w-9" aria-hidden="true" /></span>}
              </div>
              <div className="morados-profile-name-block">
                <span className="morados-profile-kicker">Retrato pessoal</span>
                <h1>{name.trim() || "Seu perfil"}</h1>
                {headline.trim() && <p className="morados-profile-headline">{headline}</p>}
                <p className="profile-note">Seu espaço pessoal no Morados</p>
              </div>
            </div>
            <label className="profile-upload-button morados-profile-avatar-action">
              <Camera className="h-4 w-4" aria-hidden="true" />
              {avatarUrl ? "Alterar foto" : "Adicionar foto"}
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => void uploadProfileImage("avatar", event)} />
            </label>
          </header>

          <section className="profile-completion-card morados-profile-progress" aria-label={`Perfil preenchido em ${profileCompletion}%`}>
            <div className="profile-completion-copy">
              <div>
                <span className="profile-section-kicker">Como está seu retrato</span>
                <strong>Perfil preenchido</strong>
              </div>
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
          </section>

          <section className="morados-profile-editor" aria-labelledby="morados-profile-editor-title">
            <header className="morados-profile-editor-heading">
              <span className="morados-profile-kicker">Informações pessoais</span>
              <h2 id="morados-profile-editor-title">Detalhes sobre você</h2>
              <p>Preencha apenas o que quiser compartilhar no seu perfil.</p>
            </header>

            <div className="profile-editor-grid morados-profile-fields">
              {Capacitor.isNativePlatform() ? (
                <>
                  <NativeProfileField label="Nome exibido" value={name} placeholder="Como a outra pessoa verá seu nome" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("name")} />
                  <NativeProfileField label="Frase de apresentação" value={headline} placeholder="Uma frase curta sobre você" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("headline")} />
                  <NativeProfileField label="Sobre mim" value={bio} placeholder="Conte um pouco sobre você…" multiline disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("bio")} />
                  <NativeProfileField label="Interesses" value={interests} placeholder="Música, cinema, viagens, leitura…" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("interests")} />
                  <NativeProfileField label="Hobbies" value={hobbies} placeholder="O que você gosta de fazer no tempo livre?" multiline disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("hobbies")} />
                  <div className="profile-favorites-grid morados-profile-favorites">
                    <NativeProfileField label="Comida favorita" value={favoriteFood} placeholder="Um prato ou sabor" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("favoriteFood")} />
                    <NativeProfileField label="Música ou artista favorito" value={favoriteMusic} placeholder="Uma música ou artista" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("favoriteMusic")} />
                    <NativeProfileField label="Canção favorita" value={favoriteSong} placeholder="Uma música especial" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("favoriteSong")} />
                    <NativeProfileField label="Lugar favorito" value={favoritePlace} placeholder="Um lugar importante para você" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("favoritePlace")} />
                    <NativeProfileField label="Uma frase pessoal" value={personalPhrase} placeholder="Um lema ou lembrança sua" multiline disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("personalPhrase")} />
                    <NativeProfileField label="Filme ou série favorito" value={favoriteFilm} placeholder="Um filme ou série" disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("favoriteFilm")} />
                    <NativeProfileField label="Uma frase sua" value={profileQuote} placeholder="Uma frase que combina com você" multiline disabled={saving || uploading !== null || editingField !== null} onEdit={() => void editNativeField("profileQuote")} />
                  </div>
                </>
              ) : (
                <>
                  <label>Nome exibido<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Como a outra pessoa verá seu nome" /></label>
                  <label>Frase de apresentação<input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={100} placeholder="Uma frase curta sobre você" /></label>
                  <label>Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} placeholder="Conte um pouco sobre você…" /></label>
                  <label>Interesses<input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={240} placeholder="Música, cinema, viagens, leitura…" /></label>
                  <label>Hobbies<textarea value={hobbies} onChange={(event) => setHobbies(event.target.value)} maxLength={300} rows={3} placeholder="O que você gosta de fazer no tempo livre?" /></label>
                  <div className="profile-favorites-grid morados-profile-favorites">
                    <label><Utensils aria-hidden="true" /> Comida favorita<input value={favoriteFood} onChange={(event) => setFavoriteFood(event.target.value)} maxLength={80} placeholder="Um prato ou sabor" /></label>
                    <label><Music2 aria-hidden="true" /> Música ou artista favorito<input value={favoriteMusic} onChange={(event) => setFavoriteMusic(event.target.value)} maxLength={100} placeholder="Uma música ou artista" /></label>
                    <label><Music2 aria-hidden="true" /> Canção favorita<input value={favoriteSong} onChange={(event) => setFavoriteSong(event.target.value)} maxLength={120} placeholder="Uma música especial" /></label>
                    <label><Heart aria-hidden="true" /> Lugar favorito<input value={favoritePlace} onChange={(event) => setFavoritePlace(event.target.value)} maxLength={100} placeholder="Um lugar importante para você" /></label>
                    <label><Heart aria-hidden="true" /> Uma frase pessoal<input value={personalPhrase} onChange={(event) => setPersonalPhrase(event.target.value)} maxLength={180} placeholder="Um lema ou lembrança sua" /></label>
                    <label><Film aria-hidden="true" /> Filme ou série favorito<input value={favoriteFilm} onChange={(event) => setFavoriteFilm(event.target.value)} maxLength={100} placeholder="Um filme ou série" /></label>
                    <label><Heart aria-hidden="true" /> Uma frase sua<input value={profileQuote} onChange={(event) => setProfileQuote(event.target.value)} maxLength={180} placeholder="Uma frase que combina com você" /></label>
                  </div>
                </>
              )}
            </div>

            {(uploading || error || mediaError || message) && (
              <div className="morados-profile-feedback" aria-live="polite">
                {uploading && <p className="profile-note">Enviando {uploading === "avatar" ? "foto de perfil" : "banner"}…</p>}
                {error && <p className="morados-profile-error" role="alert">{error}</p>}
                {mediaError && <p className="profile-note" role="status">{mediaError}</p>}
                {message && <p className="morados-profile-success" role="status">{message}</p>}
              </div>
            )}

            <footer className="morados-profile-save-row">
              <button type="button" className="profile-save-button" disabled={saving || loading || uploading !== null || editingField !== null} onClick={() => void saveProfile()}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Salvando…" : "Salvar perfil"}
              </button>
            </footer>
          </section>
        </div>
      </>
    )}
    {error && !profile && !loading && (
      <div className="morados-profile-load-error" role="alert">
        <p>{error}</p>
        <button type="button" className="inline-action" onClick={() => void load()}>Tentar carregar novamente</button>
      </div>
    )}
  </section>;
}
