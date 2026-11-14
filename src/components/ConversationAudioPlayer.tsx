import { useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

type ConversationAudioPlayerProps = {
  src: string;
  label?: string;
};

const waveformHeights = [
  7, 12, 9, 17, 11, 21, 14, 25, 16, 11, 19, 27, 15, 9, 18, 24,
  13, 20, 29, 16, 10, 23, 17, 12, 26, 15, 21, 9, 18, 25, 13, 19,
];

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

export function ConversationAudioPlayer({ src, label = "Mensagem de voz" }: ConversationAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

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
          <span className="conversation-audio-title"><Volume2 aria-hidden="true" /> {label}</span>
          <span className="conversation-audio-duration">{formatAudioTime(currentTime)} / {formatAudioTime(duration)}</span>
        </div>
        <div className="conversation-audio-wave" aria-hidden="true">
          {waveformHeights.map((height, index) => (
            <span
              key={index}
              className={index / waveformHeights.length <= progress / 100 ? "is-played" : ""}
              style={{ height: height + "px" }}
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
