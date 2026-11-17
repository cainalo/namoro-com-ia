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
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  sendCoupleCallSignal,
  waitForIceGatheringComplete,
  fetchCoupleCallIceConfiguration,
  type CoupleCallKind,
} from "@/lib/couple-call-signaling";

export type CallKind = CoupleCallKind;
export type CallDirection = "outgoing" | "incoming";

type Props = {
  kind: CallKind;
  direction: CallDirection;
  callId: string;
  coupleId: string;
  userId: string;
  peerUserId: string;
  remoteOffer?: RTCSessionDescriptionInit;
  remoteAnswer?: RTCSessionDescriptionInit;
  channel: RealtimeChannel;
  name: string;
  avatarUrl: string | null;
  onClose: () => void;
};


function formatCallDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
    : String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function ConversationCallScreen({
  kind,
  direction,
  callId,
  coupleId,
  userId,
  peerUserId,
  remoteOffer,
  remoteAnswer,
  channel,
  name,
  avatarUrl,
  onClose,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sharingStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(kind === "video");
  const [sharingScreen, setSharingScreen] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState(direction === "outgoing" ? "Preparando chamada…" : "Conectando à chamada…");
  const [notice, setNotice] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);

  useEffect(() => {
    let alive = true;
    let noAnswerTimer: number | null = null;
    let localStream: MediaStream | null = null;
    let peer: RTCPeerConnection | null = null;

    const setFailure = (message: string) => {
      if (alive) {
        setCallStatus("Não foi possível iniciar a chamada");
        setNotice(message);
      }
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
          throw new Error("Este ambiente não oferece suporte a chamadas WebRTC.");
        }

        const iceConfiguration = await fetchCoupleCallIceConfiguration(coupleId);
        if (!alive) return;
        if (!iceConfiguration.turnConfigured) {
          setNotice("TURN ainda não está configurado. Algumas redes podem não conseguir completar a chamada.");
        }

        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: kind === "video" ? { facingMode: "user" } : false,
          });
        } catch (mediaError) {
          if (kind !== "video") throw mediaError;
          // Uma câmera negada não deve impedir uma chamada de voz.
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (alive) {
            setCameraEnabled(false);
            setNotice("A câmera não foi liberada. A chamada continuará somente com áudio.");
          }
        }

        if (!alive || !localStream) {
          localStream?.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = localStream;
        setMicrophoneEnabled(Boolean(localStream.getAudioTracks()[0]));
        setCameraEnabled(Boolean(localStream.getVideoTracks()[0]));
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        peer = new RTCPeerConnection({ iceServers: iceConfiguration.iceServers });
        peerRef.current = peer;
        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];
        if (audioTrack) peer.addTrack(audioTrack, localStream);
        if (videoTrack) peer.addTrack(videoTrack, localStream);
        else peer.addTransceiver("video", { direction: "sendrecv" });

        peer.ontrack = (event) => {
          if (!alive) return;
          const stream = event.streams[0] ?? new MediaStream([event.track]);
          setRemoteStream(stream);
          const updateRemoteVideoState = () => {
            if (!alive) return;
            setRemoteHasVideo(stream.getVideoTracks().some(
              (track) => track.readyState === "live" && !track.muted,
            ));
          };
          updateRemoteVideoState();
          event.track.addEventListener("unmute", updateRemoteVideoState);
          event.track.addEventListener("mute", updateRemoteVideoState);
          event.track.addEventListener("ended", updateRemoteVideoState);
        };
        peer.onconnectionstatechange = () => {
          if (!alive || !peer) return;
          if (peer.connectionState === "connected") {
            setCallStatus("Conectada");
            setConnectedAt((current) => current ?? Date.now());
            setNotice(iceConfiguration.turnConfigured ? null : "Conexão estabelecida sem TURN. Algumas redes podem precisar de um servidor de retransmissão.");
          } else if (peer.connectionState === "connecting") {
            setCallStatus("Estabelecendo conexão segura…");
          } else if (peer.connectionState === "disconnected") {
            setCallStatus("Conexão instável · tentando reconectar");
          } else if (peer.connectionState === "failed") {
            setConnectedAt(null);
            setCallStatus("Falha na conexão");
            setNotice("Não foi possível conectar os aparelhos. Verifique a rede ou tente novamente com TURN configurado.");
          } else if (peer.connectionState === "closed") {
            setConnectedAt(null);
            setCallStatus("Chamada encerrada");
          }
        };

        if (direction === "outgoing") {
          setCallStatus("Chamando " + name + "…");
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await waitForIceGatheringComplete(peer);
          if (!alive || !peer.localDescription) return;
          await sendCoupleCallSignal(channel, {
            action: "invite",
            callId,
            fromUserId: userId,
            toUserId: peerUserId,
            kind,
            description: {
              type: peer.localDescription.type,
              sdp: peer.localDescription.sdp ?? "",
            },
          });
          if (alive) setCallStatus("Chamada enviada · aguardando resposta");
          noAnswerTimer = window.setTimeout(() => {
            if (alive && peer?.connectionState !== "connected") {
              setCallStatus("Ainda sem resposta");
              setNotice("A outra pessoa precisa estar com a conversa aberta para receber esta chamada nesta versão.");
            }
          }, 45000);
        } else {
          if (!remoteOffer) throw new Error("A oferta da chamada não está disponível. Peça para a outra pessoa ligar novamente.");
          setCallStatus("Atendendo chamada…");
          await peer.setRemoteDescription(remoteOffer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await waitForIceGatheringComplete(peer);
          if (!alive || !peer.localDescription) return;
          await sendCoupleCallSignal(channel, {
            action: "answer",
            callId,
            fromUserId: userId,
            toUserId: peerUserId,
            description: {
              type: peer.localDescription.type,
              sdp: peer.localDescription.sdp ?? "",
            },
          });
          if (alive) setCallStatus("Aguardando conexão de áudio e vídeo…");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Verifique as permissões e a conexão do aparelho.";
        setFailure(message);
      }
    };

    void start();

    return () => {
      alive = false;
      if (noAnswerTimer !== null) window.clearTimeout(noAnswerTimer);
      peer?.close();
      if (peerRef.current === peer) peerRef.current = null;
      sharingStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStream?.getTracks().forEach((track) => track.stop());
      if (localStreamRef.current === localStream) localStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    };
  }, [callId, channel, coupleId, direction, kind, name, peerUserId, remoteOffer, userId]);

  useEffect(() => {
    if (direction !== "outgoing" || !remoteAnswer || !peerRef.current || peerRef.current.remoteDescription) return;
    void peerRef.current.setRemoteDescription(remoteAnswer)
      .then(() => setCallStatus("Aguardando conexão de áudio e vídeo…"))
      .catch(() => setNotice("A resposta da outra pessoa chegou, mas não foi possível concluir a conexão."));
  }, [direction, remoteAnswer]);


  useEffect(() => {
    if (connectedAt === null) {
      setCallElapsedSeconds(0);
      return;
    }
    const update = () => setCallElapsedSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [connectedAt]);

  useEffect(() => {
    if (!remoteStream) return;
    if (remoteHasVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    } else {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteHasVideo, remoteStream]);

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
      setNotice("O microfone não está disponível. Verifique a permissão do aparelho.");
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
      setNotice("A câmera não está disponível neste aparelho.");
      return;
    }
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        stream.addTrack(track);
        const videoSender = peerRef.current?.getTransceivers()
          .find((transceiver) => transceiver.receiver.track.kind === "video")?.sender;
        if (!videoSender) throw new Error("O canal de vídeo não foi preparado para esta chamada.");
        await videoSender.replaceTrack(track);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraEnabled(true);
        setNotice(null);
      }
    } catch {
      setNotice("Não foi possível ativar a câmera. Verifique a permissão do aparelho.");
    }
  }

  async function toggleScreenShare() {
    if (sharingStreamRef.current) {
      const sharing = sharingStreamRef.current;
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
      const sender = peerRef.current?.getTransceivers()
        .find((transceiver) => transceiver.receiver.track.kind === "video")?.sender;
      if (sender) await sender.replaceTrack(cameraTrack);
      sharing.getTracks().forEach((track) => track.stop());
      sharingStreamRef.current = null;
      setSharingScreen(false);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setCameraEnabled(Boolean(cameraTrack?.enabled));
      return;
    }

    const mediaDevices = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (options?: DisplayMediaStreamOptions) => Promise<MediaStream>;
    };
    if (!mediaDevices?.getDisplayMedia) {
      setNotice("O compartilhamento de tela não é compatível com este aparelho ou WebView.");
      return;
    }
    try {
      const stream = await mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      const sender = peerRef.current?.getTransceivers()
        .find((transceiver) => transceiver.receiver.track.kind === "video")?.sender;
      if (track && sender) {
        await sender.replaceTrack(track);
        sharingStreamRef.current = stream;
        setSharingScreen(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        track.addEventListener("ended", () => {
          void toggleScreenShare();
        }, { once: true });
        setNotice(null);
      } else {
        stream.getTracks().forEach((item) => item.stop());
        setNotice("Não foi possível preparar o canal de vídeo para compartilhar a tela.");
      }
    } catch {
      setNotice("O compartilhamento de tela foi cancelado ou não recebeu permissão.");
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
        {connectedAt !== null && <span className="call-screen-duration">{formatCallDuration(callElapsedSeconds)}</span>}
        <span className="call-screen-secure">Morados · privado</span>
      </header>

      <main className={"call-screen-stage" + (remoteHasVideo ? " has-remote-video" : "")}>
        <video ref={remoteVideoRef} className="call-screen-remote-video" autoPlay playsInline aria-label="Vídeo da outra pessoa" />
        <audio ref={remoteAudioRef} autoPlay />
        {!remoteHasVideo && (
          <div className="call-screen-identity">
            <span className="call-screen-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span aria-hidden="true">{initial}</span>}
            </span>
            <strong>{name}</strong>
            <p className="call-screen-status" role="status">{callStatus}</p>
          </div>
        )}
        {remoteHasVideo && <span className="call-screen-remote-name">{name}</span>}
        <video
          ref={localVideoRef}
          className={"call-screen-local-video" + (cameraEnabled || sharingScreen ? " is-visible" : "")}
          autoPlay
          playsInline
          muted
          aria-label="Pré-visualização local da câmera ou da tela"
        />
      </main>

      <div className="call-screen-notice" aria-live="polite">
        {notice || callStatus}
      </div>

      <footer className="call-screen-controls" aria-label="Controles da chamada">
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
        <button type="button" className="is-end" onClick={onClose} aria-label="Encerrar chamada" title="Encerrar chamada">
          <PhoneOff aria-hidden="true" />
          <small>Encerrar</small>
        </button>
      </footer>
    </section>
  );
}
