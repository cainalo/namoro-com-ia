import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AudioLines, VolumeX, ArrowLeft, Crown, RotateCcw, ShieldAlert, Sparkles, Trophy } from "lucide-react";

type SoundKind = "tap" | "move" | "success" | "warning" | "impact" | "discovery";
type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  filter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
  timer: ReturnType<typeof setInterval> | null;
};
type AudioValue = {
  enabled: boolean;
  toggle: () => void;
  play: (kind?: SoundKind) => void;
};
const AudioContextValue = createContext<AudioValue>({
  enabled: false,
  toggle: () => undefined,
  play: () => undefined,
});

function createAudioGraph(): AudioGraph {
  const context = new window.AudioContext();
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 760;
  master.gain.value = 0;
  filter.connect(master);
  master.connect(context.destination);

  const oscillators = [110, 164.81, 220].map((frequency, index) => {
    const oscillator = context.createOscillator();
    const voice = context.createGain();
    oscillator.type = index === 1 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    voice.gain.value = index === 0 ? 0.28 : 0.12;
    oscillator.connect(voice);
    voice.connect(filter);
    oscillator.start();
    return oscillator;
  });
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();
  return { context, master, filter, oscillators, lfo, timer: null };
}

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const graphRef = useRef<AudioGraph | null>(null);

  useEffect(() => {
    return () => {
      const graph = graphRef.current;
      if (!graph) return;
      if (graph.timer) window.clearInterval(graph.timer);
      graph.oscillators.forEach((oscillator) => {
        try { oscillator.stop(); } catch { /* já encerrado */ }
      });
      try { graph.lfo.stop(); } catch { /* já encerrado */ }
      void graph.context.close();
      graphRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    if (next) {
      const graph = graphRef.current ?? createAudioGraph();
      graphRef.current = graph;
      void graph.context.resume();
      graph.master.gain.setTargetAtTime(0.13, graph.context.currentTime, 0.8);
      if (!graph.timer) {
        const notes = [329.63, 392, 440, 392, 349.23, 293.66, 329.63, 261.63];
        let step = 0;
        graph.timer = window.setInterval(() => {
          if (!enabledRef.current || graph.context.state !== "running") return;
          const oscillator = graph.context.createOscillator();
          const voice = graph.context.createGain();
          const now = graph.context.currentTime;
          oscillator.type = "sine";
          oscillator.frequency.value = notes[step % notes.length];
          voice.gain.setValueAtTime(0.0001, now);
          voice.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
          voice.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
          oscillator.connect(voice);
          voice.connect(graph.filter);
          oscillator.start(now);
          oscillator.stop(now + 1.2);
          step += 1;
        }, 1450);
      }
    } else if (graphRef.current) {
      const graph = graphRef.current;
      graph.master.gain.setTargetAtTime(0, graph.context.currentTime, 0.45);
    }
  }, []);

  const play = useCallback((kind: SoundKind = "tap") => {
    const graph = graphRef.current;
    if (!enabledRef.current || !graph || graph.context.state !== "running") return;
    const presets: Record<SoundKind, { frequency: number; end: number; wave: OscillatorType }> = {
      tap: { frequency: 520, end: 0.07, wave: "sine" },
      move: { frequency: 330, end: 0.12, wave: "triangle" },
      success: { frequency: 740, end: 0.32, wave: "sine" },
      warning: { frequency: 185, end: 0.22, wave: "square" },
      impact: { frequency: 95, end: 0.17, wave: "sawtooth" },
      discovery: { frequency: 880, end: 0.5, wave: "sine" },
    };
    const preset = presets[kind];
    const now = graph.context.currentTime;
    const oscillator = graph.context.createOscillator();
    const voice = graph.context.createGain();
    oscillator.type = preset.wave;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    if (kind === "discovery" || kind === "success") {
      oscillator.frequency.exponentialRampToValueAtTime(preset.frequency * 1.5, now + preset.end);
    } else if (kind === "impact" || kind === "warning") {
      oscillator.frequency.exponentialRampToValueAtTime(preset.frequency * 0.55, now + preset.end);
    }
    voice.gain.setValueAtTime(0.0001, now);
    voice.gain.exponentialRampToValueAtTime(kind === "impact" ? 0.13 : 0.08, now + 0.012);
    voice.gain.exponentialRampToValueAtTime(0.0001, now + preset.end);
    oscillator.connect(voice);
    voice.connect(graph.context.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.end + 0.02);
  }, []);

  return (
    <AudioContextValue.Provider value={{ enabled, toggle, play }}>
      {children}
    </AudioContextValue.Provider>
  );
}

export function useGameAudio() {
  return useContext(AudioContextValue);
}

export function GameAudioToggle() {
  const { enabled, toggle } = useGameAudio();
  return (
    <button
      type="button"
      className={"game-audio-toggle" + (enabled ? " is-on" : "")}
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Desativar música e sons" : "Ativar música e sons"}
      title={enabled ? "Som ligado" : "Ativar som"}
    >
      {enabled ? <AudioLines aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      <span>{enabled ? "Som ligado" : "Som desligado"}</span>
    </button>
  );
}

export function GameVictoryScreen({
  won,
  title,
  subtitle,
  eyebrow = "PARTIDA ENCERRADA",
  stats = [],
  primaryLabel = "Jogar novamente",
  onReplay,
  onExit,
}: {
  won: boolean;
  title: string;
  subtitle: string;
  eyebrow?: string;
  stats?: Array<{ label: string; value: string | number }>;
  primaryLabel?: string;
  onReplay: () => void;
  onExit: () => void;
}) {
  const { play } = useGameAudio();
  useEffect(() => {
    play(won ? "success" : "warning");
  }, [won, play]);
  const Icon = won ? Trophy : ShieldAlert;
  return (
    <section className={"game-victory-screen" + (won ? " is-victory" : " is-defeat")} role="dialog" aria-modal="true" aria-labelledby="game-victory-title">
      <div className="game-victory-atmosphere" aria-hidden="true">
        <span className="victory-orbit orbit-one"/>
        <span className="victory-orbit orbit-two"/>
        <span className="victory-spark spark-one"/>
        <span className="victory-spark spark-two"/>
        <span className="victory-spark spark-three"/>
      </div>
      <div className="game-victory-content">
        <span className="game-victory-icon"><Icon aria-hidden="true"/></span>
        <p className="game-victory-eyebrow">{eyebrow}</p>
        <h2 id="game-victory-title">{title}</h2>
        <p className="game-victory-subtitle">{subtitle}</p>
        {stats.length > 0 && (
          <div className="game-victory-stats">
            {stats.map((stat) => (
              <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>
            ))}
          </div>
        )}
        <button type="button" className="game-victory-primary" onClick={() => { play("tap"); onReplay(); }}>
          <RotateCcw aria-hidden="true"/> {primaryLabel}
        </button>
        <button type="button" className="game-victory-exit" onClick={onExit}>
          <ArrowLeft aria-hidden="true"/> Voltar aos jogos
        </button>
      </div>
      <span className="game-victory-brand"><Sparkles aria-hidden="true"/> MORADOS</span>
    </section>
  );
}
