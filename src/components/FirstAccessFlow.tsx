import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeAuth } from "@/lib/native-auth";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadUserProfileMedia, removeUserProfileMedia } from "@/lib/profile-media";
import "./FirstAccessFlow.css";

type AppSection = "home" | "messages" | "memories" | "organize" | "universe" | "games" | "profile";

type FirstAccessGateProps = {
  userId: string;
  initialName?: string;
  onNavigate: (section: AppSection) => void;
  children: ReactNode;
};

type FirstRunMode = "loading" | "profile" | "tour" | "ready" | "error";

function profileTable() {
  return (supabase as unknown as { from: (table: string) => any }).from("profiles");
}

const FIRST_ACCESS_REQUEST_TIMEOUT_MS = 20_000;

function withFirstAccessTimeout<T>(request: PromiseLike<T>, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), FIRST_ACCESS_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([Promise.resolve(request), timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

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

export function FirstAccessGate({ userId, initialName = "", onNavigate, children }: FirstAccessGateProps) {
  const [mode, setMode] = useState<FirstRunMode>("loading");
  const [error, setError] = useState("");

  async function loadStatus() {
    setMode("loading");
    setError("");
    const { data, error: queryError } = await profileTable()
      .select("id,app_onboarding_completed_at,app_tour_completed_at")
      .eq("id", userId)
      .maybeSingle();

    if (queryError || !data) {
      setError(queryError?.message ?? "O perfil desta conta ainda não foi criado.");
      setMode("error");
      return;
    }
    if (!data.app_onboarding_completed_at) setMode("profile");
    else if (!data.app_tour_completed_at) setMode("tour");
    else setMode("ready");
  }

  useEffect(() => { void loadStatus(); }, [userId]);

  useEffect(() => {
    const replay = () => {
      onNavigate("home");
      setMode("tour");
    };
    window.addEventListener("morados:show-tour", replay);
    return () => window.removeEventListener("morados:show-tour", replay);
  }, [onNavigate]);

  function finishTour() {
    // Libera o aplicativo imediatamente. A gravação do progresso não pode prender
    // a navegação caso a conexão esteja lenta ou a API não responda.
    setMode("ready");
    onNavigate("home");

    try {
      const saveRequest = profileTable()
        .update({ app_tour_completed_at: new Date().toISOString() })
        .eq("id", userId);

      void withFirstAccessTimeout(
        saveRequest,
        "O registro do tutorial está demorando.",
      ).then(({ error: saveError }) => {
        if (saveError) {
          console.warn("Não foi possível registrar o fim do tutorial.", saveError);
        }
      }).catch((cause: unknown) => {
        console.warn("O aplicativo continuou normalmente, mas o progresso do tutorial não foi salvo.", cause);
      });
    } catch (cause) {
      console.warn("O aplicativo continuou normalmente, mas o progresso do tutorial não foi salvo.", cause);
    }
  }

  if (mode === "loading") {
    return <main className="first-access-loading"><div className="first-access-loading-mark"><Sparkles /></div><p>Preparando seu espaço…</p></main>;
  }

  if (mode === "error") {
    return <main className="first-access-loading"><div className="first-access-error"><h1>Não foi possível preparar seu perfil.</h1><p>{error}</p><button type="button" onClick={() => void loadStatus()}>Tentar novamente</button></div></main>;
  }

  if (mode === "profile") {
    return <FirstAccessProfile userId={userId} initialName={initialName} onComplete={() => setMode("tour")} />;
  }

  return (
    <>
      {children}
      {mode === "tour" && <AppTour onFinish={finishTour} />}
    </>
  );
}

function FirstAccessProfile({
  userId,
  initialName,
  onComplete,
}: {
  userId: string;
  initialName: string;
  onComplete: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [interests, setInterests] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteSong, setFavoriteSong] = useState("");
  const [favoritePlace, setFavoritePlace] = useState("");
  const [personalPhrase, setPersonalPhrase] = useState("");
  const [favoriteFilm, setFavoriteFilm] = useState("");
  const [profileQuote, setProfileQuote] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const avatarUrl = avatar ? URL.createObjectURL(avatar) : "";
    const bannerUrl = banner ? URL.createObjectURL(banner) : "";
    setAvatarPreview(avatarUrl);
    setBannerPreview(bannerUrl);
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      if (bannerUrl) URL.revokeObjectURL(bannerUrl);
    };
  }, [avatar, banner]);

  function chooseImage(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (kind === "avatar") setAvatar(file);
    else setBanner(file);
    setError("");
  }

  async function editNativeField(
    field: "name" | "headline" | "bio" | "interests" | "hobbies" | "favoriteFood" | "favoriteMusic" | "favoriteSong" | "favoritePlace" | "favoriteFilm" | "personalPhrase" | "profileQuote",
  ) {
    if (!Capacitor.isNativePlatform() || busy) return;

    const config = {
      name: { title: "Como devemos chamar você?", hint: "Seu nome", value: name, maxLength: 60, singleLine: true, allowEmpty: false },
      headline: { title: "Frase de apresentação", hint: "Uma frase curta sobre você", value: headline, maxLength: 100, singleLine: true, allowEmpty: true },
      bio: { title: "Sobre mim", hint: "Conte um pouco sobre você…", value: bio, maxLength: 500, singleLine: false, allowEmpty: true },
      interests: { title: "Seus interesses", hint: "Música, cinema, viagens, leitura…", value: interests, maxLength: 240, singleLine: false, allowEmpty: true },
      hobbies: { title: "Seus hobbies", hint: "O que você gosta de fazer no tempo livre?", value: hobbies, maxLength: 300, singleLine: false, allowEmpty: true },
      favoriteFood: { title: "Comida favorita", hint: "Sua comida favorita", value: favoriteFood, maxLength: 80, singleLine: true, allowEmpty: true },
      favoriteMusic: { title: "Música ou artista favorito", hint: "Uma música ou artista", value: favoriteMusic, maxLength: 100, singleLine: true, allowEmpty: true },
      favoriteSong: { title: "Canção favorita", hint: "Uma música especial", value: favoriteSong, maxLength: 120, singleLine: true, allowEmpty: true },
      favoritePlace: { title: "Lugar favorito", hint: "Um lugar importante para você", value: favoritePlace, maxLength: 100, singleLine: true, allowEmpty: true },
      favoriteFilm: { title: "Filme ou série favorito", hint: "Um filme ou série", value: favoriteFilm, maxLength: 100, singleLine: true, allowEmpty: true },
      personalPhrase: { title: "Uma frase pessoal", hint: "Um lema ou lembrança sua", value: personalPhrase, maxLength: 180, singleLine: false, allowEmpty: true },
      profileQuote: { title: "Uma frase sua", hint: "Uma frase que combina com você", value: profileQuote, maxLength: 180, singleLine: false, allowEmpty: true },
    }[field];

    try {
      const result = await NativeAuth.showTextInputDialog({
        title: config.title,
        description: "O texto será salvo no seu perfil pessoal. Você poderá alterá-lo depois.",
        hint: config.hint,
        initialValue: config.value,
        confirmText: "Confirmar",
        maxLength: config.maxLength,
        singleLine: config.singleLine,
        allowEmpty: config.allowEmpty,
      });

      if (result.cancelled) return;
      const value = result.text ?? "";
      if (field === "name" && !value.trim()) {
        setError("Informe como você quer aparecer no seu perfil.");
        return;
      }

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
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o campo de edição.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Informe como você quer aparecer no seu perfil.");
      return;
    }
    setBusy(true);
    setError("");
    let avatarPath: string | null = null;
    let bannerPath: string | null = null;
    try {
      if (avatar) {
        const uploaded = await withFirstAccessTimeout(
          uploadUserProfileMedia(userId, avatar),
          "O envio da foto está demorando. Verifique sua conexão e tente novamente.",
        );
        if (uploaded.error || !uploaded.path) throw uploaded.error ?? new Error("Não foi possível enviar a foto de perfil.");
        avatarPath = uploaded.path;
      }
      if (banner) {
        const uploaded = await withFirstAccessTimeout(
          uploadUserProfileMedia(userId, banner),
          "O envio do banner está demorando. Verifique sua conexão e tente novamente.",
        );
        if (uploaded.error || !uploaded.path) throw uploaded.error ?? new Error("Não foi possível enviar a capa.");
        bannerPath = uploaded.path;
      }

      const { data: updatedProfile, error: updateError } = await withFirstAccessTimeout(
        profileTable().update({
          display_name: name.trim(),
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          hobbies: hobbies.trim() || null,
          interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
          favorite_food: favoriteFood.trim() || null,
          favorite_music: favoriteMusic.trim() || null,
          favorite_song: favoriteSong.trim() || null,
          favorite_place: favoritePlace.trim() || null,
          personal_phrase: personalPhrase.trim() || null,
          favorite_film: favoriteFilm.trim() || null,
          profile_quote: profileQuote.trim() || null,
          ...(avatarPath ? { avatar_path: avatarPath } : {}),
          ...(bannerPath ? { banner_path: bannerPath } : {}),
          app_onboarding_completed_at: new Date().toISOString(),
        }).eq("id", userId).select("id").maybeSingle(),
        "O salvamento do perfil está demorando. Verifique sua conexão e tente novamente.",
      );

      if (updateError) throw updateError;
      if (!updatedProfile) throw new Error("Não foi possível confirmar a atualização do seu perfil. Tente novamente.");
      window.dispatchEvent(new Event("morados:profile-updated"));
      onComplete();
    } catch (cause) {
      if (avatarPath) void removeUserProfileMedia(avatarPath).catch(() => undefined);
      if (bannerPath) void removeUserProfileMedia(bannerPath).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar seu perfil.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="first-access-page">
      <div className="first-access-shell">
        <div className="first-access-brand"><span><Sparkles /></span><strong>Morados</strong><small>SEU ESPAÇO, DO SEU JEITO</small></div>
        <div className="first-access-heading">
          <span className="first-access-kicker">PRIMEIRO ACESSO · 1 DE 2</span>
          <h1>Vamos criar seu perfil.</h1>
          <p>Este é o seu espaço pessoal. Sua namorada também poderá montar o perfil dela quando confirmar o próprio e-mail.</p>
        </div>

        <form className="first-access-form" onSubmit={submit}>
          <div className="first-access-cover" style={bannerPreview ? { backgroundImage: `linear-gradient(90deg, rgba(24,39,30,.2), rgba(24,39,30,.04)), url("${bannerPreview}")` } : undefined}>
            <label className="first-access-banner-button"><ImagePlus /> {banner ? "Trocar banner" : "Adicionar foto do banner"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => chooseImage("banner", event)} /></label>
            <span>Imagem horizontal para a capa do perfil</span>
          </div>

          <div className="first-access-avatar-row">
            <label className="first-access-avatar">
              {avatarPreview ? <img src={avatarPreview} alt="Prévia da foto de perfil" /> : <UserRound />}
              <span><Camera /> Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => chooseImage("avatar", event)} /></span>
            </label>
            <div><strong>Comece por você</strong><p>Foto e banner podem ser adicionados agora ou depois, no seu perfil.</p></div>
          </div>

          <div className="first-access-fields">
            {Capacitor.isNativePlatform() ? (
              <>
                <NativeProfileField label="Como devemos chamar você?" value={name} placeholder="Seu nome" disabled={busy} onEdit={() => void editNativeField("name")} />
                <NativeProfileField label="Frase de apresentação" value={headline} placeholder="Uma frase curta sobre você" disabled={busy} onEdit={() => void editNativeField("headline")} />
                <NativeProfileField label="Sobre mim" value={bio} placeholder="Conte um pouco sobre você…" multiline disabled={busy} onEdit={() => void editNativeField("bio")} />
                <NativeProfileField label="Interesses, separados por vírgula" value={interests} placeholder="Música, cinema, viagens, leitura…" disabled={busy} onEdit={() => void editNativeField("interests")} />
                <NativeProfileField label="Hobbies" value={hobbies} placeholder="O que você gosta de fazer no tempo livre?" multiline disabled={busy} onEdit={() => void editNativeField("hobbies")} />
                <div className="first-access-field-grid">
                  <NativeProfileField label="Comida favorita" value={favoriteFood} placeholder="Sua comida favorita" disabled={busy} onEdit={() => void editNativeField("favoriteFood")} />
                  <NativeProfileField label="Música ou artista favorito" value={favoriteMusic} placeholder="Uma música ou artista" disabled={busy} onEdit={() => void editNativeField("favoriteMusic")} />
                  <NativeProfileField label="Canção favorita" value={favoriteSong} placeholder="Uma música especial" disabled={busy} onEdit={() => void editNativeField("favoriteSong")} />
                  <NativeProfileField label="Lugar favorito" value={favoritePlace} placeholder="Um lugar importante para você" disabled={busy} onEdit={() => void editNativeField("favoritePlace")} />
                  <NativeProfileField label="Filme ou série favorito" value={favoriteFilm} placeholder="Um filme ou série" disabled={busy} onEdit={() => void editNativeField("favoriteFilm")} />
                  <NativeProfileField label="Uma frase pessoal" value={personalPhrase} placeholder="Um lema ou lembrança sua" multiline disabled={busy} onEdit={() => void editNativeField("personalPhrase")} />
                  <NativeProfileField label="Uma frase sua" value={profileQuote} placeholder="Uma frase que combina com você" multiline disabled={busy} onEdit={() => void editNativeField("profileQuote")} />
                </div>
              </>
            ) : (
              <>
                <label>Como devemos chamar você?<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="nickname" placeholder="Seu nome" required /></label>
                <label>Frase de apresentação<input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={100} placeholder="Uma frase curta sobre você" /></label>
                <label>Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} placeholder="Conte um pouco sobre você…" rows={3} /></label>
                <label>Interesses, separados por vírgula<input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={240} placeholder="Música, cinema, viagens, leitura…" /></label>
                <label>Hobbies<textarea value={hobbies} onChange={(event) => setHobbies(event.target.value)} maxLength={300} rows={2} placeholder="O que você gosta de fazer no tempo livre?" /></label>
                <div className="first-access-field-grid">
                  <label>Comida favorita<input value={favoriteFood} onChange={(event) => setFavoriteFood(event.target.value)} maxLength={80} placeholder="Sua comida favorita" /></label>
                  <label>Música ou artista favorito<input value={favoriteMusic} onChange={(event) => setFavoriteMusic(event.target.value)} maxLength={100} placeholder="Uma música ou artista" /></label>
                  <label>Canção favorita<input value={favoriteSong} onChange={(event) => setFavoriteSong(event.target.value)} maxLength={120} placeholder="Uma música especial" /></label>
                  <label>Lugar favorito<input value={favoritePlace} onChange={(event) => setFavoritePlace(event.target.value)} maxLength={100} placeholder="Um lugar importante para você" /></label>
                  <label>Uma frase pessoal<input value={personalPhrase} onChange={(event) => setPersonalPhrase(event.target.value)} maxLength={180} placeholder="Um lema ou lembrança sua" /></label>
                  <label>Filme ou série favorito<input value={favoriteFilm} onChange={(event) => setFavoriteFilm(event.target.value)} maxLength={100} placeholder="Um filme ou série" /></label>
                  <label>Uma frase sua<input value={profileQuote} onChange={(event) => setProfileQuote(event.target.value)} maxLength={180} placeholder="Uma frase que combina com você" /></label>
                </div>
              </>
            )}
          </div>

          {error && <p className="first-access-error-text" role="alert">{error}</p>}
          <div className="first-access-submit-row"><span>Você poderá editar tudo depois.</span><button type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" /> Salvando…</> : <>Salvar perfil e continuar <ArrowRight /></>}</button></div>
        </form>
      </div>
    </main>
  );
}

const TOUR_STEPS: Array<{ eyebrow: string; title: string; body: string }> = [
  { eyebrow: "01 · FEED", title: "O ponto de encontro", body: "Aqui ficam as publicações, fotos e lembranças compartilhadas. Use o botão de criar publicação para registrar um momento ou escrever algo para vocês." },
  { eyebrow: "02 · PUBLICAR", title: "Registre um momento", body: "O botão com o símbolo de mais abre o editor de publicação. Você pode compartilhar um texto, uma foto ou uma lembrança no Feed." },
  { eyebrow: "03 · MENU", title: "Atalhos e navegação", body: "O menu reúne acesso rápido a Jogos, Memórias, Planos e Casa, além das opções de instalação e saída da conta." },
  { eyebrow: "04 · MENSAGENS", title: "Um espaço só de vocês", body: "A conversa reúne as mensagens privadas. Envie textos, áudios e anexos e use a barra superior para voltar ao restante do aplicativo." },
  { eyebrow: "05 · JOGOS", title: "Brinquem juntos", body: "A área de jogos reúne experiências para jogar em dupla. Abra um jogo para conhecer as regras e iniciar uma partida compartilhada." },
  { eyebrow: "06 · MEMÓRIAS", title: "Guardem o que importa", body: "Aqui vocês organizam fotos, vídeos, textos e momentos importantes em uma coleção particular." },
  { eyebrow: "07 · PLANOS", title: "Organizem a vida a dois", body: "Registrem compromissos, ideias, datas especiais e planos para acompanhar o que vem pela frente." },
  { eyebrow: "08 · CASA", title: "O universo de vocês", body: "A Casa é o espaço visual do casal. Explorem os elementos disponíveis e acompanhem a construção desse ambiente compartilhado." },
  { eyebrow: "09 · PERFIL", title: "Sua identidade no Morados", body: "Edite sua foto, banner, descrição e preferências. Cada pessoa tem seu próprio perfil e pode personalizá-lo independentemente." },
];

function AppTour({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];

  // O tutorial permanece isolado em um único painel leve: trocar a etapa não
  // navega nem monta/desmonta telas pesadas por baixo do diálogo.
  return (
    <div className="morados-tour-layer" role="dialog" aria-modal="true" aria-labelledby="morados-tour-title">
      <div className="morados-tour-card">
        <div className="morados-tour-top"><span>{step.eyebrow}</span><span>{index + 1} / {TOUR_STEPS.length}</span></div>
        <div className="morados-tour-progress"><span style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }} /></div>
        <h2 id="morados-tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="morados-tour-actions">
          <button type="button" className="morados-tour-skip" onClick={onFinish}>Pular tutorial</button>
          <div>
            <button type="button" className="morados-tour-prev" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}><ArrowLeft /> Anterior</button>
            {index === TOUR_STEPS.length - 1
              ? <button type="button" className="morados-tour-next" onClick={onFinish}>Concluir <Check /></button>
              : <button type="button" className="morados-tour-next" onClick={() => setIndex((value) => Math.min(TOUR_STEPS.length - 1, value + 1))}>Próxima etapa <ArrowRight /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
