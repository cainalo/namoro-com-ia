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
    target: "feed-filter-bar",
    eyebrow: "O PONTO DE PARTIDA",
    title: "Feed de vocês",
    description: "Os filtros no topo separam fotos, vídeos, textos e áudios. Escolha um tipo para refinar o Feed; toque em “Tudo” para voltar a ver todas as publicações.",
  },
  {
    section: "create-post",
    target: "feed-block-toolbox",
    eyebrow: "COMPARTILHE UM MOMENTO",
    title: "Criar publicação",
    description: "Nesta barra, escolha o que adicionar à publicação: foto, título, texto, música, áudio ou vídeo. Depois organize os blocos e toque em “Publicar” no topo ou no fim do editor.",
  },
  {
    section: "messages",
    target: "conversation-composer",
    eyebrow: "CONVERSA PRIVADA",
    title: "Mensagens",
    description: "Use o campo inferior para escrever e enviar mensagens. O botão de anexo abre galeria, câmera, vídeo, áudio e arquivos; o cabeçalho reúne chamadas e configurações.",
  },
  {
    section: "games",
    target: "games-hub-grid",
    eyebrow: "TEMPO DE QUALIDADE",
    title: "Jogos e desafios",
    description: "Toque em um jogo para abrir a capa e as instruções. Os filtros acima separam estratégia, cooperação e investigação; cada partida apresenta regras e controles antes de começar.",
  },
  {
    section: "memories",
    target: "memory-composer",
    eyebrow: "O QUE VALE GUARDAR",
    title: "Memórias",
    description: "Preencha o formulário para guardar uma lembrança com título, texto, data e privacidade. “Privada” fica só na sua conta; “Compartilhada” fica disponível para o casal ativo.",
  },
  {
    section: "organize",
    target: "plans-event-composer",
    eyebrow: "VIDA A DOIS",
    title: "Planos e organização",
    description: "Use o formulário para criar um compromisso com título, data, horário e local. Escolha se a data será privada ou compartilhada; toque num dia do calendário para selecionar a data.",
  },
  {
    section: "universe",
    target: "house-map-hotspots",
    eyebrow: "UM LUGAR DE VOCÊS",
    title: "Casa",
    description: "Toque nos pontos do mapa para escolher Residência, Pátio ou Jardins. Os controles abaixo mudam a iluminação entre dia, entardecer e noite; aproxime para explorar o terreno.",
  },
  {
    section: "profile",
    target: "profile-cover",
    eyebrow: "SUA IDENTIDADE",
    title: "Perfil pessoal",
    description: "Toque em “Alterar banner” na capa e “Alterar foto” junto ao seu nome. Abaixo, edite apresentação, biografia, interesses, música, lugar favorito e frase; finalize em “Salvar perfil”.",
  },
  {
    section: "home",
    target: "menu-button",
    eyebrow: "ATALHOS E CONFIGURAÇÕES",
    title: "Menu de navegação",
    description: "Este botão abre o menu. Por ele você acessa Jogos, Memórias, Planos, Casa, este tutorial, a instalação do aplicativo e a opção de sair da conta.",
  },
];

type ProductTourProps = {
  userId: string;
  pairingPending: boolean;
  activeSection: string;
  onNavigate: (section: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Spotlight = { top: number; left: number; width: number; height: number };

export function ProductTour({ userId, pairingPending, activeSection, onNavigate, open, onOpenChange }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [finished, setFinished] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const current = steps[stepIndex];
  const pendingDescriptions: Record<string, string> = {
    "Feed de vocês": "O Feed compartilhado será ativado quando a outra conta confirmar o e-mail. Por enquanto, esta tela informa o estado do vínculo; seu perfil e as áreas privadas já estão disponíveis.",
    "Criar publicação": "A barra reúne foto, título, texto, música, áudio e vídeo. A publicação no Feed ficará habilitada assim que a segunda conta confirmar o e-mail e o espaço compartilhado for ativado.",
    "Mensagens": "A conversa e seus controles ficam nesta tela. O envio de mensagens será liberado quando a outra conta confirmar o e-mail; depois, use o campo inferior e o botão de anexo para conversar.",
    "Jogos e desafios": "Os jogos aparecem neste catálogo. Alguns modos locais podem ser explorados individualmente; partidas online e desafios do casal dependem da confirmação da outra conta.",
    "Memórias": "Você já pode guardar lembranças privadas neste formulário. A opção de compartilhar com a outra pessoa será liberada automaticamente quando o casal estiver ativo.",
    "Planos e organização": "Você já pode criar compromissos privados no formulário e navegar pelo calendário. A opção de compartilhar eventos será liberada quando a outra conta confirmar o e-mail."
  };
  const currentDescription = pairingPending ? pendingDescriptions[current.title] ?? current.description : current.description;
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
    let initialScrollDone = false;
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
      if (!initialScrollDone) {
        initialScrollDone = true;
        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
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
      <section className="product-tour-card" data-placement={spotlight && spotlight.top + spotlight.height / 2 > window.innerHeight * 0.58 ? "top" : "bottom"}>
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
            <p>{currentDescription}</p>
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
