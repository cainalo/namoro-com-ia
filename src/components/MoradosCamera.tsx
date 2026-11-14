import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Video, X, ZoomIn, ZoomOut, Square, LoaderCircle } from "lucide-react";

export type MoradosCameraMode = "photo" | "video";
type CameraEffect = "natural" | "warm" | "vivid" | "mono" | "soft";

type Props = {
  open: boolean;
  initialMode?: MoradosCameraMode;
  onClose: () => void;
  onCaptured: (file: File) => void;
};

const effects: { id: CameraEffect; label: string; filter: string }[] = [
  { id: "natural", label: "Natural", filter: "none" },
  { id: "warm", label: "Quente", filter: "sepia(.2) saturate(1.14) brightness(1.03)" },
  { id: "vivid", label: "Vivo", filter: "saturate(1.45) contrast(1.08)" },
  { id: "mono", label: "P&B", filter: "grayscale(1) contrast(1.1)" },
  { id: "soft", label: "Suave", filter: "brightness(1.06) saturate(.82)" },
];
const MAX_FILE_BYTES = 35 * 1024 * 1024;
const MAX_SECONDS = 120;

function drawFrame(canvas: HTMLCanvasElement, video: HTMLVideoElement, zoom: number, filter: string, mirror: boolean) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return false;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const sw = width / zoom;
  const sh = height / zoom;
  ctx.save();
  ctx.filter = filter;
  if (mirror) { ctx.translate(width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, (width - sw) / 2, (height - sh) / 2, sw, sh, 0, 0, width, height);
  ctx.restore();
  return true;
}

function makeFile(blob: Blob, mode: MoradosCameraMode) {
  const mime = blob.type || (mode === "photo" ? "image/jpeg" : "video/webm");
  const extension = mode === "photo" ? "jpg" : mime.includes("mp4") ? "mp4" : "webm";
  return new File([blob], "morados-" + mode + "-" + Date.now() + "." + extension, { type: mime });
}

export function MoradosCamera({ open, initialMode = "photo", onClose, onCaptured }: Props) {
  const [mode, setMode] = useState<MoradosCameraMode>(initialMode);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [effect, setEffect] = useState<CameraEffect>("natural");
  const [zoom, setZoom] = useState(1);
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const keepRef = useRef(false);
  const secondsRef = useRef(0);
  const selectedEffect = effects.find((item) => item.id === effect) ?? effects[0];

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setFacing("environment");
      setEffect("natural");
      setZoom(1);
      setError(null);
      setSeconds(0);
      setRecording(false);
      setFinalizing(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) { setReady(false); return; }
    let cancelled = false;
    let startedStream: MediaStream | null = null;

    async function activate() {
      setOpening(true);
      setReady(false);
      setError(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("A câmera não está disponível neste navegador ou nesta origem.");
        startedStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: mode === "video" ? { echoCancellation: true, noiseSuppression: true } : false,
        });
        if (cancelled) { startedStream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = startedStream;
        if (videoRef.current) {
          videoRef.current.srcObject = startedStream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (cause) {
        if (cancelled) return;
        const name = cause instanceof DOMException ? cause.name : "";
        setError(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? mode === "video" ? "Permita o acesso à câmera e ao microfone para gravar." : "Permita o acesso à câmera para fotografar."
            : name === "NotFoundError" ? "Não encontramos uma câmera compatível neste dispositivo."
            : name === "NotReadableError" ? "A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente."
            : cause instanceof Error ? cause.message : "Não foi possível abrir a câmera do Morados.",
        );
      } finally { if (!cancelled) setOpening(false); }
    }
    void activate();
    return () => {
      cancelled = true;
      startedStream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === startedStream) streamRef.current = null;
    };
  }, [open, mode, facing]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const next = secondsRef.current + 1;
      secondsRef.current = next;
      setSeconds(next);
      if (next >= MAX_SECONDS) recorderRef.current?.stop();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    keepRef.current = false;
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") { recorder.onstop = null; recorder.stop(); }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    outputStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopStreams() {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    outputStreamRef.current?.getTracks().forEach((track) => track.stop());
    outputStreamRef.current = null;
  }

  function close() {
    keepRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") { recorder.onstop = null; recorder.stop(); }
    stopStreams();
    setRecording(false);
    setFinalizing(false);
    onClose();
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !ready) { setError("A câmera ainda está preparando a imagem. Tente novamente."); return; }
    const canvas = document.createElement("canvas");
    if (!drawFrame(canvas, video, zoom, selectedEffect.filter, facing === "user")) { setError("Não foi possível preparar a foto."); return; }
    canvas.toBlob((blob) => {
      if (!blob) { setError("Não foi possível gerar a foto."); return; }
      if (blob.size > MAX_FILE_BYTES) { setError("A foto ultrapassou o limite de 35 MB."); return; }
      onCaptured(makeFile(blob, "photo"));
      close();
    }, "image/jpeg", .94);
  }

  function startVideo() {
    const video = videoRef.current;
    const live = streamRef.current;
    if (!video || !live || !ready || typeof MediaRecorder === "undefined") {
      setError("A gravação de vídeo não está disponível neste dispositivo.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      if (!drawFrame(canvas, video, zoom, selectedEffect.filter, facing === "user")) { setError("A câmera ainda não está pronta."); return; }
      const output = canvas.captureStream(30);
      live.getAudioTracks().forEach((track) => output.addTrack(track));
      outputStreamRef.current = output;
      canvasRef.current = canvas;
      chunksRef.current = [];
      keepRef.current = true;
      secondsRef.current = 0;
      setSeconds(0);
      const mime = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"].find(MediaRecorder.isTypeSupported);
      const recorder = new MediaRecorder(output, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        keepRef.current = false; setRecording(false); setFinalizing(false);
        setError("A gravação foi interrompida. Tente novamente.");
        output.getTracks().forEach((track) => track.stop());
      };
      recorder.onstop = () => {
        if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        const keep = keepRef.current;
        keepRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        chunksRef.current = [];
        output.getTracks().forEach((track) => track.stop());
        outputStreamRef.current = null;
        setRecording(false); setFinalizing(false); setSeconds(0);
        if (keep && blob.size) {
          if (blob.size > MAX_FILE_BYTES) setError("O vídeo ultrapassou o limite de 35 MB. Grave um trecho menor.");
          else { onCaptured(makeFile(blob, "video")); stopStreams(); onClose(); }
        } else if (keep) setError("Nenhum vídeo foi capturado. Tente novamente.");
      };
      const draw = () => {
        if (recorder.state !== "recording" || !videoRef.current || !canvasRef.current) return;
        drawFrame(canvasRef.current, videoRef.current, zoom, selectedEffect.filter, facing === "user");
        animationRef.current = window.requestAnimationFrame(draw);
      };
      recorder.start(350);
      setRecording(true);
      animationRef.current = window.requestAnimationFrame(draw);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o vídeo."); }
  }

  function stopVideo() {
    keepRef.current = true;
    setFinalizing(true);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  if (!open) return null;

  return (
    <div className="morados-camera-overlay" role="dialog" aria-modal="true" aria-label="Câmera do Morados" data-no-swipe>
      <div className="morados-camera-screen">
        <header className="morados-camera-header">
          <button type="button" className="morados-camera-icon-button" onClick={close} aria-label="Fechar câmera"><X aria-hidden="true" /></button>
          <div className="morados-camera-brand"><span>morados</span><small>{mode === "photo" ? "Câmera" : "Vídeo"}</small></div>
          <button type="button" className="morados-camera-icon-button" onClick={() => setFacing((value) => value === "environment" ? "user" : "environment")} disabled={recording || finalizing || opening} aria-label="Virar câmera"><RefreshCw aria-hidden="true" /></button>
        </header>
        <div className="morados-camera-viewfinder">
          <video
            ref={videoRef}
            className={"morados-camera-preview" + (facing === "user" ? " is-selfie" : "")}
            style={{
              filter: selectedEffect.filter,
              transform: (facing === "user" ? "scaleX(-1) " : "") + "scale(" + zoom + ")",
            }}
            autoPlay
            muted
            playsInline
          />
          {(!ready || opening) && <div className="morados-camera-loading"><LoaderCircle aria-hidden="true" /><span>{opening ? "Abrindo câmera…" : "Preparando imagem…"}</span></div>}
          {recording && <div className="morados-camera-recording-indicator"><span /> REC {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div>}
        </div>
        <div className="morados-camera-controls">
          <div className="morados-camera-mode-switch" role="group" aria-label="Tipo de captura">
            <button type="button" className={mode === "photo" ? "is-active" : ""} onClick={() => setMode("photo")} disabled={recording || finalizing}>FOTO</button>
            <button type="button" className={mode === "video" ? "is-active" : ""} onClick={() => setMode("video")} disabled={recording || finalizing}>VÍDEO</button>
          </div>
          <div className="morados-camera-zoom"><ZoomOut aria-hidden="true" /><input type="range" min="1" max="3" step=".1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={!ready || recording || finalizing} aria-label="Zoom da câmera" /><ZoomIn aria-hidden="true" /><span>{zoom.toFixed(1)}×</span></div>
          <div className="morados-camera-effects" role="group" aria-label="Efeitos da câmera">
            {effects.map((item) => <button type="button" key={item.id} className={effect === item.id ? "is-active" : ""} onClick={() => setEffect(item.id)} disabled={recording || finalizing}>{item.label}</button>)}
          </div>
          <div className="morados-camera-shutter-row">
            <span className="morados-camera-shutter-side" />
            {mode === "photo" ? (
              <button type="button" className="morados-camera-shutter" onClick={takePhoto} disabled={!ready || opening} aria-label="Tirar foto"><Camera aria-hidden="true" /></button>
            ) : recording ? (
              <button type="button" className="morados-camera-shutter is-recording" onClick={stopVideo} aria-label="Parar gravação"><Square aria-hidden="true" /></button>
            ) : finalizing ? (
              <span className="morados-camera-finalizing"><LoaderCircle aria-hidden="true" /> Salvando vídeo…</span>
            ) : (
              <button type="button" className="morados-camera-shutter is-video" onClick={startVideo} disabled={!ready || opening} aria-label="Gravar vídeo"><Video aria-hidden="true" /></button>
            )}
            <span className="morados-camera-shutter-side">{recording ? "Toque para parar" : "Até 2 min"}</span>
          </div>
          <p className="morados-camera-caption">{mode === "photo" ? "Foto com o zoom e o efeito selecionados." : "Vídeo com áudio, zoom e efeito selecionado."}</p>
          {error && <p className="morados-camera-error" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function MoradosCameraLauncher({ kind, onCaptured }: { kind: MoradosCameraMode; onCaptured: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="morados-media-capture-trigger" onClick={() => setOpen(true)}>
        {kind === "photo" ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}
        {kind === "photo" ? "Tirar foto no Morados" : "Gravar vídeo no Morados"}
      </button>
      <MoradosCamera open={open} initialMode={kind} onClose={() => setOpen(false)} onCaptured={onCaptured} />
    </>
  );
}
