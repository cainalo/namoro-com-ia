import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type ConversationAudioPlayerProps = {
  src: string;
  waveform?: number[];
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

function waveformFromBuffer(buffer: AudioBuffer, barCount = 56) {
  const peaks = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor((index * buffer.length) / barCount);
    const end = Math.max(start + 1, Math.floor(((index + 1) * buffer.length) / barCount));
    const stride = Math.max(1, Math.floor((end - start) / 180));
    let sum = 0;
    let count = 0;

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const samples = buffer.getChannelData(channel);
      for (let frame = start; frame < Math.min(end, buffer.length); frame += stride) {
        const sample = samples[frame] ?? 0;
        sum += sample * sample;
        count += 1;
      }
    }

    return count > 0 ? Math.sqrt(sum / count) : 0;
  });

  const maximum = Math.max(0.0001, ...peaks);
  return peaks.map((peak) => Math.round(Math.max(0.07, peak / maximum) * 100) / 100);
}

export function ConversationAudioPlayer({ src, waveform }: ConversationAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  const waveformKey = waveform?.length
    ? normalizeWaveform(waveform).join(",")
    : "";
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    let active = true;
    let audioContext: AudioContext | null = null;

    if (waveformKey) {
      setWaveformBars(waveformKey.split(",").map(Number));
      return () => {
        active = false;
      };
    }

    // Áudios enviados por anexo ou mensagens antigas não têm forma de onda no
    // metadado. Nesse caso, calculamos os picos a partir dos próprios samples.
    setWaveformBars([]);
    void (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error("audio_fetch_failed");
        const data = await response.arrayBuffer();
        if (!active) return;
        audioContext = new window.AudioContext();
        const decoded = await audioContext.decodeAudioData(data);
        if (active) setWaveformBars(waveformFromBuffer(decoded));
      } catch {
        // Sem waveform disponível, mantemos o controle de progresso sem
        // desenhar um padrão fictício.
      } finally {
        if (audioContext && audioContext.state !== "closed") {
          await audioContext.close().catch(() => undefined);
        }
      }
    })();

    return () => {
      active = false;
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
    };
  }, [src, waveformKey]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError(false);
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
        setPlaybackError(true);
      }
    } else {
      audio.pause();
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
    <div className={"conversation-audio-player" + (playing ? " is-playing" : "")}>
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
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(event) => {
          setPlaying(false);
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
