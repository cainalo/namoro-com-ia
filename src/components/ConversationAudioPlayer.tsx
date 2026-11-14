import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type ConversationAudioPlayerProps = {
  src: string;
  waveform?: number[];
  durationSeconds?: number;
  messageTime?: string;
};

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function normalizeWaveform(values: number[]) {
  return values
    .filter((value) => Number.isFinite(value))
    .slice(0, 96)
    .map((value) => Math.max(0.07, Math.min(1, value)));
}

export function ConversationAudioPlayer({
  src,
  waveform,
  durationSeconds,
  messageTime,
}: ConversationAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : 0,
  );
  const [playbackError, setPlaybackError] = useState(false);
  const waveformKey = waveform?.length ? normalizeWaveform(waveform).join(",") : "";
  const waveformBars = waveformKey ? waveformKey.split(",").map(Number) : [];
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    if (typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Solicita os metadados ainda na montagem, antes do primeiro toque.
    audio.preload = "auto";
    audio.load();
    return () => {
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
      // Resposta imediata ao toque; o preload deixa o fluxo de áudio pronto.
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
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  }

  function seek(value: string) {
    const audio = audioRef.current;
    const nextTime = Number(value);
    if (!audio || !Number.isFinite(nextTime)) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div className={"conversation-audio-player" + (playing ? " is-playing" : "") + (messageTime ? " has-message-time" : "")}>
      {messageTime && <time className="conversation-audio-message-time">{messageTime}</time>}
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
          <span className="conversation-audio-duration">{formatAudioTime(currentTime)} / {formatAudioTime(duration)}</span>
        </div>
        {waveformBars.length > 0 && (
          <div className="conversation-audio-wave" role="img" aria-label="Forma de onda real do áudio">
            {waveformBars.map((height, index) => (
              <span
                key={index}
                className={index / waveformBars.length <= progress / 100 ? "is-played" : ""}
                style={{ height: Math.max(4, Math.round(height * 25)) + "px" }}
              />
            ))}
          </div>
        )}
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
        preload="auto"
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
