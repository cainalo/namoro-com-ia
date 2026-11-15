import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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
    const replay = () => setMode("tour");
    window.addEventListener("morados:show-tour", replay);
    return () => window.removeEventListener("morados:show-tour", replay);
  }, []);

  async function finishTour() {
    const { error: saveError } = await profileTable()
      .update({ app_tour_completed_at: new Date().toISOString() })
      .eq("id", userId);
    if (saveError) {
      console.error("Não foi possível registrar o fim do tutorial.", saveError);
    }
    setMode("ready");
    onNavigate("home");
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
      {mode === "tour" && <AppTour onNavigate={onNavigate} onFinish={() => void finishTour()} />}
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
  const [bio, setBio] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [interests, setInterests] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
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
        const uploaded = await uploadUserProfileMedia(userId, avatar);
        if (uploaded.error || !uploaded.path) throw uploaded.error ?? new Error("Não foi possível enviar a foto de perfil.");
        avatarPath = uploaded.path;
      }
      if (banner) {
        const uploaded = await uploadUserProfileMedia(userId, banner);
        if (uploaded.error || !uploaded.path) throw uploaded.error ?? new Error("Não foi possível enviar a capa.");
        bannerPath = uploaded.path;
      }

      const { error: updateError } = await profileTable().update({
        display_name: name.trim(),
        bio: bio.trim() || null,
        hobbies: hobbies.trim() || null,
        interests: interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        favorite_food: favoriteFood.trim() || null,
        favorite_music: favoriteMusic.trim() || null,
        favorite_film: favoriteFilm.trim() || null,
        profile_quote: profileQuote.trim() || null,
        ...(avatarPath ? { avatar_path: avatarPath } : {}),
        ...(bannerPath ? { banner_path: bannerPath } : {}),
        app_onboarding_completed_at: new Date().toISOString(),
      }).eq("id", userId);

      if (updateError) throw updateError;
      window.dispatchEvent(new Event("morados:profile-updated"));
      onComplete();
    } catch (cause) {
      if (avatarPath) await removeUserProfileMedia(avatarPath);
      if (bannerPath) await removeUserProfileMedia(bannerPath);
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
            <label>Como devemos chamar você?<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="nickname" placeholder="Seu nome" required /></label>
            <label>Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} placeholder="Conte um pouco sobre você…" rows={3} /></label>
            <label>Interesses, separados por vírgula<input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={240} placeholder="Música, cinema, viagens, leitura…" /></label>
            <label>Hobbies<textarea value={hobbies} onChange={(event) => setHobbies(event.target.value)} maxLength={300} rows={2} placeholder="O que você gosta de fazer no tempo livre?" /></label>
            <div className="first-access-field-grid">
              <label>Comida favorita<input value={favoriteFood} onChange={(event) => setFavoriteFood(event.target.value)} maxLength={80} placeholder="Sua comida favorita" /></label>
              <label>Música ou artista favorito<input value={favoriteMusic} onChange={(event) => setFavoriteMusic(event.target.value)} maxLength={100} placeholder="Uma música ou artista" /></label>
              <label>Filme ou série favorito<input value={favoriteFilm} onChange={(event) => setFavoriteFilm(event.target.value)} maxLength={100} placeholder="Um filme ou série" /></label>
              <label>Uma frase sua<input value={profileQuote} onChange={(event) => setProfileQuote(event.target.value)} maxLength={180} placeholder="Uma frase que combina com você" /></label>
            </div>
          </div>

          {error && <p className="first-access-error-text" role="alert">{error}</p>}
          <div className="first-access-submit-row"><span>Você poderá editar tudo depois.</span><button type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" /> Salvando…</> : <>Salvar perfil e continuar <ArrowRight /></>}</button></div>
        </form>
      </div>
    </main>
  );
}

const TOUR_STEPS: Array<{ section: AppSection; target: string; eyebrow: string; title: string; body: string }> = [
  { section: "home", target: "tour-feed", eyebrow: "01 · FEED", title: "O ponto de encontro", body: "Aqui ficam as publicações, fotos e lembranças compartilhadas. Use o botão de criar publicação para registrar um momento ou escrever algo para vocês." },
  { section: "home", target: "tour-create-post", eyebrow: "02 · PUBLICAR", title: "Registre um momento", body: "O botão com o símbolo de mais abre o editor de publicação. Você pode compartilhar um texto, uma foto ou uma lembrança no Feed." },
  { section: "home", target: "tour-menu", eyebrow: "03 · MENU", title: "Atalhos e navegação", body: "Este botão abre o menu com acesso rápido a Jogos, Memórias, Planos e Casa, além das opções de instalação e saída da conta." },
  { section: "messages", target: "tour-messages", eyebrow: "04 · CONVERSA", title: "Um espaço só de vocês", body: "A conversa é privada. Envie mensagens, áudios e anexos; use a barra superior para voltar ao restante do aplicativo ou abrir as configurações da conversa." },
  { section: "games", target: "tour-games", eyebrow: "05 · JOGOS", title: "Brinquem juntos", body: "A área de jogos reúne experiências para jogar em dupla. Abra um jogo para conhecer as regras e iniciar uma partida compartilhada." },
  { section: "memories", target: "tour-memories", eyebrow: "06 · MEMÓRIAS", title: "Guardem o que importa", body: "Aqui vocês organizam fotos, vídeos, textos e momentos importantes em uma coleção particular." },
  { section: "organize", target: "tour-plans", eyebrow: "07 · PLANOS", title: "Organizem a vida a dois", body: "Registrem compromissos, ideias, datas especiais e planos para acompanhar o que vem pela frente." },
  { section: "universe", target: "tour-house", eyebrow: "08 · CASA", title: "O universo de vocês", body: "A Casa é o espaço visual do casal. Explorem os elementos disponíveis e acompanhem a construção desse ambiente compartilhado." },
  { section: "profile", target: "tour-profile", eyebrow: "09 · PERFIL", title: "Sua identidade no Morados", body: "Edite sua foto, banner, descrição e preferências. Cada pessoa tem seu próprio perfil e pode personalizá-lo independentemente." },
];

function AppTour({ onNavigate, onFinish }: { onNavigate: (section: AppSection) => void; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];

  useEffect(() => {
    onNavigate(step.section);
    const timer = window.setTimeout(() => {
      document.querySelectorAll(".morados-tour-target").forEach((element) => element.classList.remove("morados-tour-target"));
      const target = document.querySelector(`[data-tour-target="${step.target}"]`);
      if (target instanceof HTMLElement) {
        target.classList.add("morados-tour-target");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 160);
    return () => {
      window.clearTimeout(timer);
      document.querySelectorAll(".morados-tour-target").forEach((element) => element.classList.remove("morados-tour-target"));
    };
  }, [index, step.section, step.target, onNavigate]);

  return (
    <div className="morados-tour-layer" role="dialog" aria-modal="true" aria-labelledby="morados-tour-title">
      <div className="morados-tour-card">
        <div className="morados-tour-top"><span>{step.eyebrow}</span><span>{index + 1} / {TOUR_STEPS.length}</span></div>
        <div className="morados-tour-progress"><span style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }} /></div>
        <h2 id="morados-tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="morados-tour-actions">
          <button type="button" className="morados-tour-skip" onClick={onFinish}>Encerrar tutorial</button>
          <div>
            <button type="button" className="morados-tour-prev" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}><ArrowLeft /> Anterior</button>
            {index === TOUR_STEPS.length - 1
              ? <button type="button" className="morados-tour-next" onClick={onFinish}>Concluir <Check /></button>
              : <button type="button" className="morados-tour-next" onClick={() => setIndex((value) => Math.min(TOUR_STEPS.length - 1, value + 1))}>Próxima tela <ArrowRight /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
