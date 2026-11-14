import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type ConversationAudioPlayerProps = {
  src: string;
  waveform?: number[];
  durationSeconds?: number;
  messageTime?: string;
};

type AudioAnalysis = {
  duration: number;
  waveform: number[];
};

const AUDIO_ANALYSIS_MAX_BYTES = 24 * 1024 * 1024;
const audioAnalysisCache = new Map<string, AudioAnalysis>();
const audioAnalysisPending = new Map<string, Promise<AudioAnalysis | null>>();

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

function createWaveform(buffer: AudioBuffer, barCount = 64): number[] {
  const channelCount = Math.max(1, Math.min(buffer.numberOfChannels, 2));
  const peaks = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor((index * buffer.length) / barCount);
    const end = Math.max(start + 1, Math.floor(((index + 1) * buffer.length) / barCount));
    let energy = 0;
    let count = 0;

    for (let channel = 0; channel < channelCount; channel += 1) {
      const samples = buffer.getChannelData(channel);
      for (let sample = start; sample < Math.min(end, buffer.length); sample += 1) {
        const value = samples[sample] ?? 0;
        energy += value * value;
        count += 1;
      }
    }
    return count > 0 ? Math.sqrt(energy / count) : 0;
  });

  const maximum = Math.max(0.0001, ...peaks);
  return peaks.map((peak) => Math.max(0.08, Math.min(1, Math.pow(peak / maximum, 0.72))));
}

async function analyzeAudioSource(src: string): Promise<AudioAnalysis | null> {
  const cached = audioAnalysisCache.get(src);
  if (cached) return cached;
  const pending = audioAnalysisPending.get(src);
  if (pending) return pending;

  const task = (async () => {
    let context: AudioContext | null = null;
    try {
      const response = await fetch(src, { cache: "force-cache" });
      if (!response.ok) return null;
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > AUDIO_ANALYSIS_MAX_BYTES) return null;

      const data = await response.arrayBuffer();
      if (data.byteLength === 0 || data.byteLength > AUDIO_ANALYSIS_MAX_BYTES) return null;

      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return null;
      context = new AudioContextConstructor();
      const decoded = await context.decodeAudioData(data.slice(0));
      if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) return null;

      const result = { duration: decoded.duration, waveform: createWaveform(decoded) };
      audioAnalysisCache.set(src, result);
      return result;
    } catch {
      return null;
    } finally {
      if (context && context.state !== "closed") {
        await context.close().catch(() => undefined);
      }
    }
  })();

  audioAnalysisPending.set(src, task);
  try {
    return await task;
  } finally {
    audioAnalysisPending.delete(src);
  }
}

export function ConversationAudioPlayer({
  src,
  waveform,
  durationSeconds,
  messageTime,
}: ConversationAudioPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [analysisRequested, setAnalysisRequested] = useState(false);
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
  const waveformBars = resolvedWaveform ?? [];
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    const element = playerRef.current;
    if (!element) {
      setAnalysisRequested(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setAnalysisRequested(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setAnalysisRequested(true);
        observer.disconnect();
      }
    }, { rootMargin: "220px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    let active = true;
    setResolvedWaveform(providedWaveform);
    setDuration(
      typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? durationSeconds
        : 0,
    );
    setCurrentTime(0);

    if (!analysisRequested || (durationSeconds && providedWaveform?.length)) {
      return () => { active = false; };
    }

    void analyzeAudioSource(src).then((info) => {
      if (!active || !info) return;
      if (!durationSeconds || !Number.isFinite(durationSeconds)) setDuration(info.duration);
      if (!providedWaveform?.length) setResolvedWaveform(info.waveform);
    });
    return () => { active = false; };
  }, [analysisRequested, src, durationSeconds, providedWaveformKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.preload = "metadata";
    audio.load();
    return () => { audio.pause(); };
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
          <span className="conversation-audio-duration">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </span>
        </div>
        {waveformBars.length > 0 && (
          <div className="conversation-audio-wave" role="img" aria-label="Forma de onda do áudio">
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
