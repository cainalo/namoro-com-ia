import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { normalizeWaveform } from "@/lib/audio-waveform";

type ConversationAudioPlayerProps = {
  src: string;
  waveform?: number[];
  durationSeconds?: number;
  messageTime?: string;
};

const FALLBACK_WAVEFORM = Array.from({ length: 56 }, () => 0.12);

export function ConversationAudioPlayer({
  src,
  waveform,
  durationSeconds,
  messageTime,
}: ConversationAudioPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [resolvedWaveform, setResolvedWaveform] = useState<number[] | undefined>(() =>
    waveform?.length ? normalizeWaveform(waveform) : undefined,
  );
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : 0,
  );
  const [playbackError, setPlaybackError] = useState(false);
  const providedWaveform = useMemo(
    () => waveform?.length ? normalizeWaveform(waveform) : undefined,
    [waveform?.join(",")],
  );
  const providedWaveformKey = providedWaveform?.join(",") ?? "";
  const waveformBars = resolvedWaveform?.length ? resolvedWaveform : FALLBACK_WAVEFORM;
  const hasResolvedWaveform = Boolean(resolvedWaveform?.length);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    setResolvedWaveform(providedWaveform);
    setDuration(
      typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? durationSeconds
        : 0,
    );
    setCurrentTime(0);
    setPlaying(false);
    setPlaybackError(false);
  }, [src, durationSeconds, providedWaveformKey]);

  useEffect(() => {
    const element = playerRef.current;
    const audio = audioRef.current;
    if (!element || !audio) return;

    let metadataRequested = false;
    const requestMetadata = () => {
      if (metadataRequested) return;
      metadataRequested = true;
      audio.preload = "metadata";
      audio.load();
    };

    // Só busca os metadados dos players próximos da tela. Não baixa nem decodifica
    // o arquivo inteiro em segundo plano apenas para desenhar a forma de onda.
    if (typeof IntersectionObserver === "undefined") {
      requestMetadata();
      return () => { audio.pause(); };
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        requestMetadata();
        observer.disconnect();
      }
    }, { rootMargin: "180px 0px" });
    observer.observe(element);
    return () => {
      observer.disconnect();
      audio.pause();
    };
  }, [src]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const updateProgress = () => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      if (!audio.ended) frame = window.requestAnimationFrame(updateProgress);
    };
    frame = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError(false);
    if (audio.paused) {
      setPlaying(true);
      try {
        await audio.play();
      } catch {
        setPlaying(false);
        setPlaybackError(true);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function updateDuration(audio: HTMLAudioElement) {
    if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
  }

  function seek(value: string) {
    const audio = audioRef.current;
    const nextTime = Number(value);
    if (!audio || !Number.isFinite(nextTime)) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div
      ref={playerRef}
      className={"conversation-audio-player" + (playing ? " is-playing" : "") + (messageTime ? " has-message-time" : "")}
    >
      <button
        type="button"
        className="conversation-audio-play"
        onClick={() => void togglePlayback()}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        title={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <div className="conversation-audio-main">
        <div className="conversation-audio-title-row">
          {messageTime && <time className="conversation-audio-message-time">{messageTime}</time>}
          <span className="conversation-audio-duration">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </span>
        </div>
        <div
          className={"conversation-audio-wave" + (!hasResolvedWaveform ? " is-placeholder" : "")}
          role="img"
          aria-label={hasResolvedWaveform ? "Forma de onda do áudio" : "Visualização do áudio"}
          aria-busy={!hasResolvedWaveform}
        >
          {waveformBars.map((height, index) => (
            <span
              key={index}
              className={index / waveformBars.length <= progress / 100 ? "is-played" : ""}
              style={{ height: (hasResolvedWaveform ? Math.max(4, Math.round(height * 25)) : 5) + "px" }}
            />
          ))}
        </div>
        <div className="conversation-audio-progress">
          <div className="conversation-audio-progress-fill" style={{ width: progress + "%" }} />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(event.target.value)}
            disabled={!Number.isFinite(duration) || duration <= 0}
            aria-label="Avançar ou voltar no áudio"
          />
        </div>
        {playbackError && <span className="conversation-audio-error" role="status">Não foi possível reproduzir este áudio.</span>}
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => updateDuration(event.currentTarget)}
        onDurationChange={(event) => updateDuration(event.currentTarget)}
        onCanPlay={(event) => updateDuration(event.currentTarget)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(event) => {
          setPlaying(false);
          updateDuration(event.currentTarget);
          setCurrentTime(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
        }}
        onError={() => {
          setPlaying(false);
          setPlaybackError(true);
        }}
      />
    </div>
  );
}
