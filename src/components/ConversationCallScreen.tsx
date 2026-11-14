import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";

export type CallKind = "audio" | "video";

type Props = {
  kind: CallKind;
  name: string;
  avatarUrl: string | null;
  onClose: () => void;
};

/**
 * Tela única de chamada. A sinalização WebRTC entre os dois aparelhos ainda
 * não existe no backend; os controles locais gerenciam câmera, microfone e
 * pré-visualização/compartilhamento disponíveis neste dispositivo.
 */
export function ConversationCallScreen({ kind, name, avatarUrl, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sharingStreamRef = useRef<MediaStream | null>(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(kind === "video");
  const [sharingScreen, setSharingScreen] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const localStream = new MediaStream();
    localStreamRef.current = localStream;

    const attachPreview = () => {
      if (videoRef.current && alive) videoRef.current.srcObject = sharingStreamRef.current ?? localStream;
    };

    const requestTrack = async (kindToRequest: "audio" | "video") => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (alive) setPermissionMessage("Este aparelho não disponibiliza acesso à câmera ou ao microfone neste ambiente.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: kindToRequest === "audio",
          video: kindToRequest === "video" ? { facingMode: "user" } : false,
        });
        if (!alive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const track = kindToRequest === "audio" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
        if (track && !localStream.getTracks().some((current) => current.id === track.id)) {
          localStream.addTrack(track);
        }
        if (kindToRequest === "audio") setMicrophoneEnabled(Boolean(track));
        else setCameraEnabled(Boolean(track));
        attachPreview();
        setPermissionMessage(null);
      } catch {
        if (alive) {
          if (kindToRequest === "audio") setMicrophoneEnabled(false);
          else setCameraEnabled(false);
          setPermissionMessage(kindToRequest === "audio"
            ? "Não foi possível acessar o microfone. Verifique a permissão do Morados."
            : "Não foi possível acessar a câmera. Verifique a permissão do Morados.");
        }
      }
    };

    void requestTrack("audio");
    if (kind === "video") void requestTrack("video");

    return () => {
      alive = false;
      sharingStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      localStreamRef.current = null;
      sharingStreamRef.current = null;
    };
  }, [kind]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleMicrophone() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) {
      setPermissionMessage("O microfone ainda não está disponível. Verifique a permissão do aparelho.");
      return;
    }
    track.enabled = !track.enabled;
    setMicrophoneEnabled(track.enabled);
  }

  async function toggleCamera() {
    const stream = localStreamRef.current;
    const existing = stream?.getVideoTracks()[0];
    if (existing) {
      existing.enabled = !existing.enabled;
      setCameraEnabled(existing.enabled);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !stream) {
      setPermissionMessage("A câmera não está disponível neste aparelho.");
      return;
    }
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        stream.addTrack(track);
        setCameraEnabled(true);
        if (videoRef.current) videoRef.current.srcObject = sharingStreamRef.current ?? stream;
      }
      setPermissionMessage(null);
    } catch {
      setPermissionMessage("Não foi possível ativar a câmera. Verifique a permissão do aparelho.");
    }
  }

  async function toggleScreenShare() {
    if (sharingStreamRef.current) {
      sharingStreamRef.current.getTracks().forEach((track) => track.stop());
      sharingStreamRef.current = null;
      setSharingScreen(false);
      if (videoRef.current) videoRef.current.srcObject = localStreamRef.current;
      return;
    }
    const mediaDevices = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (options?: DisplayMediaStreamOptions) => Promise<MediaStream>;
    };
    if (!mediaDevices?.getDisplayMedia) {
      setPermissionMessage("O compartilhamento de tela não é compatível com este aparelho ou WebView.");
      return;
    }
    try {
      const stream = await mediaDevices.getDisplayMedia({ video: true, audio: false });
      sharingStreamRef.current = stream;
      setSharingScreen(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        sharingStreamRef.current = null;
        setSharingScreen(false);
        if (videoRef.current) videoRef.current.srcObject = localStreamRef.current;
      }, { once: true });
      setPermissionMessage(null);
    } catch {
      setPermissionMessage("O compartilhamento de tela foi cancelado ou não recebeu permissão.");
    }
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const KindIcon = kind === "video" ? Video : Mic;

  return (
    <section
      className={"call-screen is-" + kind}
      role="dialog"
      aria-modal="true"
      aria-label={(kind === "video" ? "Chamada de vídeo" : "Chamada de voz") + " com " + name}
      data-no-swipe
    >
      <header className="call-screen-top">
        <button type="button" className="call-screen-back" onClick={onClose} aria-label="Voltar para a conversa">
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="call-screen-kind"><KindIcon aria-hidden="true" /> {kind === "video" ? "Chamada de vídeo" : "Chamada de áudio"}</span>
        <span className="call-screen-secure">Morados</span>
      </header>

      <main className="call-screen-stage">
        <div className="call-screen-identity">
          <span className="call-screen-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span aria-hidden="true">{initial}</span>}
          </span>
          <strong>{name}</strong>
          <p className="call-screen-status" role="status">Tela da chamada</p>
          <small>A interface está pronta. A conexão de voz e vídeo entre os dois aparelhos ainda precisa da infraestrutura de chamadas do Morados.</small>
        </div>
        <video
          ref={videoRef}
          className={"call-screen-local-video" + (cameraEnabled || sharingScreen ? " is-visible" : "")}
          autoPlay
          playsInline
          muted
          aria-label="Pré-visualização local da câmera ou da tela"
        />
      </main>

      <div className="call-screen-notice" aria-live="polite">
        {permissionMessage || "Esta tela ainda não transmite áudio ou vídeo para a outra pessoa."}
      </div>

      <footer className="call-screen-controls" aria-label="Controles locais da chamada">
        <button type="button" className={microphoneEnabled ? "is-active" : "is-muted"} onClick={toggleMicrophone} aria-label={microphoneEnabled ? "Desativar microfone" : "Ativar microfone"} title={microphoneEnabled ? "Microfone ligado" : "Microfone desligado"}>
          {microphoneEnabled ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
          <small>Áudio</small>
        </button>
        <button type="button" className={cameraEnabled ? "is-active" : "is-muted"} onClick={() => void toggleCamera()} aria-label={cameraEnabled ? "Desativar câmera" : "Ativar câmera"} title={cameraEnabled ? "Câmera ligada" : "Câmera desligada"}>
          {cameraEnabled ? <Video aria-hidden="true" /> : <VideoOff aria-hidden="true" />}
          <small>Vídeo</small>
        </button>
        <button type="button" className={sharingScreen ? "is-active" : "is-muted"} onClick={() => void toggleScreenShare()} aria-label={sharingScreen ? "Parar compartilhamento de tela" : "Compartilhar tela"} title={sharingScreen ? "Parar compartilhamento" : "Compartilhar tela"}>
          {sharingScreen ? <ScreenShareOff aria-hidden="true" /> : <ScreenShare aria-hidden="true" />}
          <small>Tela</small>
        </button>
        <button type="button" className="is-end" onClick={onClose} aria-label="Encerrar e sair da tela de chamada" title="Encerrar chamada">
          <PhoneOff aria-hidden="true" />
          <small>Encerrar</small>
        </button>
      </footer>
    </section>
  );
}
