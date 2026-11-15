import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TourStep = {
  section: string;
  target: string;
  eyebrow: string;
  title: string;
  description: string;
};

const steps: TourStep[] = [
  {
    section: "home",
    target: "screen-home",
    eyebrow: "O PONTO DE PARTIDA",
    title: "Feed de vocês",
    description: "Aqui ficam as publicações do casal: fotos, vídeos, textos, áudios e lembranças do dia a dia. Use os filtros para encontrar cada tipo de conteúdo.",
  },
  {
    section: "create-post",
    target: "screen-create-post",
    eyebrow: "COMPARTILHE UM MOMENTO",
    title: "Criar publicação",
    description: "Toque no botão + da navegação para montar uma publicação. Você pode combinar texto e mídias, organizar a ordem e compartilhar no Feed.",
  },
  {
    section: "messages",
    target: "screen-messages",
    eyebrow: "CONVERSA PRIVADA",
    title: "Mensagens",
    description: "A conversa ocupa a tela inteira. Envie mensagens, fotos, arquivos e áudios; use as opções do cabeçalho para personalizar e organizar a conversa.",
  },
  {
    section: "games",
    target: "screen-games",
    eyebrow: "TEMPO DE QUALIDADE",
    title: "Jogos e desafios",
    description: "Escolham jogos para jogar juntos, acompanhem partidas e descubram desafios. Cada jogo abre sua própria experiência e mostra as regras antes de começar.",
  },
  {
    section: "memories",
    target: "screen-memories",
    eyebrow: "O QUE VALE GUARDAR",
    title: "Memórias",
    description: "Reúnam fotos, vídeos, textos, áudios e documentos importantes. As memórias ficam organizadas no espaço particular de vocês.",
  },
  {
    section: "organize",
    target: "screen-organize",
    eyebrow: "VIDA A DOIS",
    title: "Planos e organização",
    description: "Registrem compromissos, datas e planos. Esta área ajuda vocês a manterem atividades e acontecimentos importantes no mesmo lugar.",
  },
  {
    section: "universe",
    target: "screen-universe",
    eyebrow: "UM LUGAR DE VOCÊS",
    title: "Casa",
    description: "Explore o terreno, visite os ambientes e altere a iluminação. A casa é um espaço visual que cresce junto com a experiência de vocês.",
  },
  {
    section: "profile",
    target: "screen-profile",
    eyebrow: "SUA IDENTIDADE",
    title: "Perfil pessoal",
    description: "Edite sua foto, banner, nome, apresentação, interesses, música, lugar favorito e frase especial. Seu perfil pode ser atualizado sempre que quiser.",
  },
  {
    section: "home",
    target: "menu-button",
    eyebrow: "ATALHOS E CONFIGURAÇÕES",
    title: "Menu de navegação",
    description: "O menu reúne atalhos para as áreas do Morados, acesso ao tutorial, instalação do aplicativo e saída segura da conta.",
  },
];

type ProductTourProps = {
  userId: string;
  activeSection: string;
  onNavigate: (section: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Spotlight = { top: number; left: number; width: number; height: number };

export function ProductTour({ userId, activeSection, onNavigate, open, onOpenChange }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [finished, setFinished] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const current = steps[stepIndex];
  const progress = useMemo(() => finished ? 100 : Math.round(((stepIndex + 1) / steps.length) * 100), [finished, stepIndex]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("tutorial_completed_at")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (!error && !data?.tutorial_completed_at) {
        onOpenChange(true);
      }
      setInitialCheckDone(true);
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userId, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setSpotlight(null);
      setFinished(false);
      return;
    }
    setStepIndex(0);
    setFinished(false);
  }, [open]);

  useEffect(() => {
    if (!open || finished || !current) return;
    if (activeSection !== current.section) onNavigate(current.section);
  }, [open, finished, current, activeSection, onNavigate]);

  useEffect(() => {
    if (!open || finished || !current || activeSection !== current.section) return;
    let timer = 0;
    let frame = 0;
    const locate = () => {
      const element = document.querySelector<HTMLElement>('[data-tour-target="' + current.target + '"]');
      if (!element) {
        setSpotlight({
          top: 80,
          left: 14,
          width: Math.max(180, window.innerWidth - 28),
          height: Math.min(240, window.innerHeight * 0.34),
        });
        return;
      }
      const rect = element.getBoundingClientRect();
      setSpotlight({
        top: Math.max(8, rect.top - 7),
        left: Math.max(8, rect.left - 7),
        width: Math.min(window.innerWidth - 16, rect.width + 14),
        height: Math.min(window.innerHeight - 16, rect.height + 14),
      });
    };
    frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(locate, 120);
    });
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", locate);
      window.removeEventListener("scroll", locate, true);
    };
  }, [open, finished, current, activeSection]);

  async function finishTour() {
    setFinished(true);
    await supabase.from("profiles")
      .update({ tutorial_completed_at: new Date().toISOString() })
      .eq("id", userId);
    onOpenChange(false);
    setFinished(false);
    setSpotlight(null);
  }

  function closeTour() {
    void finishTour();
  }

  if (!open || !initialCheckDone && !current) return null;

  return (
    <div className="product-tour-layer" role="dialog" aria-modal="true" aria-labelledby="product-tour-title">
      {!finished && spotlight && (
        <div
          className="product-tour-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
          aria-hidden="true"
        />
      )}
      <section className="product-tour-card">
        <div className="product-tour-card-top">
          <span className="product-tour-brand"><Compass size={15} /> GUIA DO MORADOS</span>
          <button type="button" className="product-tour-close" onClick={closeTour} aria-label="Encerrar tutorial"><X size={18} /></button>
        </div>
        {finished ? (
          <>
            <span className="product-tour-eyebrow">TUDO PRONTO</span>
            <h2 id="product-tour-title">Agora é com vocês.</h2>
            <p>O passeio terminou. Explore cada área no seu ritmo e volte a este tutorial pelo menu sempre que precisar.</p>
            <button type="button" className="product-tour-next" onClick={closeTour}><CheckCircle2 size={17} /> Começar a usar</button>
          </>
        ) : (
          <>
            <div className="product-tour-progress-copy">
              <span>{current.eyebrow}</span>
              <strong>{stepIndex + 1} de {steps.length}</strong>
            </div>
            <div className="product-tour-progress"><span style={{ width: progress + "%" }} /></div>
            <h2 id="product-tour-title">{current.title}</h2>
            <p>{current.description}</p>
            <div className="product-tour-actions">
              <button type="button" className="product-tour-skip" onClick={closeTour}>Encerrar passeio</button>
              <div>
                {stepIndex > 0 && <button type="button" className="product-tour-back" onClick={() => setStepIndex((value) => Math.max(0, value - 1))}><ArrowLeft size={16} /> Voltar</button>}
                <button
                  type="button"
                  className="product-tour-next"
                  onClick={() => {
                    if (stepIndex >= steps.length - 1) setFinished(true);
                    else setStepIndex((value) => value + 1);
                  }}
                >
                  {stepIndex >= steps.length - 1 ? "Encerrar" : "Próximo"} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
