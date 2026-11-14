import { useEffect } from "react";
import { ArrowLeft, Mic, Phone, PhoneOff, Video, VideoOff } from "lucide-react";

export type CallKind = "audio" | "video";

/**
 * Tela de chamada dentro do Morados. Ainda não há sinalização/WebRTC:
 * nada é discado, nenhuma permissão é pedida e nenhum app externo é aberto.
 */
export function ConversationCallScreen({
  kind,
  name,
  avatarUrl,
  onClose,
}: {
  kind: CallKind;
  name: string;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const KindIcon = kind === "video" ? Video : Phone;

  return (
    <div
      className={"call-screen is-" + kind}
      role="dialog"
      aria-modal="true"
      aria-label={(kind === "video" ? "Chamada de vídeo" : "Chamada de voz") + " com " + name}
      data-no-swipe
    >
      <header className="call-screen-top">
        <button
          type="button"
          className="call-screen-back"
          onClick={onClose}
          aria-label="Voltar para a conversa"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="call-screen-kind">
          <KindIcon aria-hidden="true" /> {kind === "video" ? "Chamada de vídeo" : "Chamada de voz"}
        </span>
        <span className="call-screen-spacer" aria-hidden="true" />
      </header>

      {/* Área reservada para o vídeo remoto quando a infraestrutura existir. */}
      <div className="call-screen-stage" data-remote-video-slot>
        <div className="call-screen-identity">
          <span className="call-screen-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span aria-hidden="true">{initial}</span>}
          </span>
          <strong>{name}</strong>
          <p className="call-screen-status" role="status">
            Chamadas ainda não estão disponíveis
          </p>
          <small>
            A conexão de voz e vídeo entre os aparelhos será habilitada em uma próxima etapa.
            Nenhuma chamada foi iniciada.
          </small>
        </div>
      </div>

      <footer className="call-screen-controls" aria-label="Controles da chamada (indisponíveis)">
        <button type="button" disabled aria-label="Microfone (indisponível)">
          <Mic aria-hidden="true" />
        </button>
        {kind === "video" && (
          <button type="button" disabled aria-label="Câmera (indisponível)">
            <VideoOff aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="is-end"
          onClick={onClose}
          aria-label="Sair da tela de chamada"
        >
          <PhoneOff aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
