export type MoradosMusicTrack = {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  chords: number[][];
  melody: number[];
  waveform: OscillatorType;
  color: string;
};

export const MORADOS_MUSIC_TRACKS: readonly MoradosMusicTrack[] = [
  {
    id: "casa-acesa",
    title: "Casa Acesa",
    mood: "Piano delicado e aconchegante",
    bpm: 92,
    chords: [[60, 64, 67, 71], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]],
    melody: [72, 76, 79, 76, 74, 76, 72, 67, 69, 72, 76, 72, 71, 74, 76, 74],
    waveform: "sine",
    color: "#0f4c5c",
  },
  {
    id: "pomar-entardecer",
    title: "Pomar ao Entardecer",
    mood: "Cordas leves e pequenos sinos",
    bpm: 86,
    chords: [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]],
    melody: [74, 78, 81, 78, 76, 78, 74, 69, 71, 74, 78, 81, 78, 76, 74, 71],
    waveform: "triangle",
    color: "#556b2f",
  },
  {
    id: "rua-de-domingo",
    title: "Rua de Domingo",
    mood: "Ritmo leve e violão imaginado",
    bpm: 104,
    chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]],
    melody: [76, 79, 81, 79, 76, 72, 74, 76, 79, 83, 81, 79, 76, 74, 72, 74],
    waveform: "triangle",
    color: "#c8402a",
  },
  {
    id: "entre-duas-casas",
    title: "Entre Duas Casas",
    mood: "Ambiente calmo e contemplativo",
    bpm: 78,
    chords: [[65, 69, 72, 76], [60, 64, 67, 72], [62, 65, 69, 74], [57, 60, 64, 69]],
    melody: [77, 81, 84, 81, 79, 81, 76, 72, 74, 77, 81, 84, 81, 79, 77, 74],
    waveform: "sine",
    color: "#6b3a6e",
  },
];

export function getMoradosMusicTrack(id: string | undefined) {
  return MORADOS_MUSIC_TRACKS.find((track) => track.id === id) ?? null;
}

function midiFrequency(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function scheduleTone(
  context: OfflineAudioContext,
  destination: AudioNode,
  frequency: number,
  start: number,
  duration: number,
  peak: number,
  waveform: OscillatorType,
  attack = 0.035,
  release = 0.18,
) {
  if (start >= context.length / context.sampleRate) return;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
  envelope.gain.setValueAtTime(Math.max(0.0002, peak), start + Math.max(attack, duration - release));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function encodeWav(buffer: AudioBuffer) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const bytesPerSample = 2;
  const dataBytes = frames * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(output);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let cursor = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(cursor, sample < 0 ? sample * 32768 : sample * 32767, true);
      cursor += bytesPerSample;
    }
  }
  return new Blob([output], { type: "audio/wav" });
}

/**
 * Produces an original instrumental track locally in the browser.
 * The rendered WAV can be previewed and uploaded as a private couple-media asset.
 */
export async function renderMoradosMusic(trackId: string) {
  const track = getMoradosMusicTrack(trackId);
  if (!track) throw new Error("Esta música não está disponível na biblioteca Morados.");

  const Offline = window.OfflineAudioContext;
  if (!Offline) throw new Error("Este navegador não oferece suporte à criação local de áudio.");
  const sampleRate = 22050;
  const beatSeconds = 60 / track.bpm;
  const beats = 32;
  const duration = beats * beatSeconds + 1.2;
  const context = new Offline(2, Math.ceil(duration * sampleRate), sampleRate);
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = 0.72;
  compressor.threshold.value = -18;
  compressor.knee.value = 16;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.22;
  master.connect(compressor);
  compressor.connect(context.destination);

  for (let beat = 0; beat < beats; beat += 1) {
    const bar = Math.floor(beat / 4);
    const chord = track.chords[bar % track.chords.length];
    const start = beat * beatSeconds;

    if (beat % 4 === 0) {
      for (const note of chord) {
        scheduleTone(context, master, midiFrequency(note), start, beatSeconds * 3.85, 0.014, "sine", 0.32, 0.5);
        scheduleTone(context, master, midiFrequency(note) * 2.003, start + 0.025, beatSeconds * 3.45, 0.004, "sine", 0.4, 0.55);
      }
      scheduleTone(context, master, midiFrequency(chord[0] - 12), start, beatSeconds * 1.45, 0.045, "triangle", 0.025, 0.22);
    } else if (beat % 4 === 2) {
      scheduleTone(context, master, midiFrequency(chord[0] - 12), start, beatSeconds * 0.8, 0.026, "triangle", 0.02, 0.18);
    }

    const step = beat * 2;
    const notes = [track.melody[step % track.melody.length], track.melody[(step + 1) % track.melody.length]];
    notes.forEach((note, half) => {
      const noteStart = start + half * beatSeconds * 0.5;
      const accent = half === 0 ? 1 : 0.72;
      const isHigh = note >= 80;
      scheduleTone(
        context,
        master,
        midiFrequency(note),
        noteStart,
        beatSeconds * (half === 0 ? 0.78 : 0.58),
        (isHigh ? 0.021 : 0.029) * accent,
        track.waveform,
        0.012,
        0.22,
      );
      if ((beat + half) % 4 === 0) {
        scheduleTone(context, master, midiFrequency(note + 12), noteStart + 0.012, beatSeconds * 0.44, 0.006, "sine", 0.018, 0.26);
      }
    });

    // A soft off-beat pulse gives each track its own movement without covering the melody.
    if (beat % 2 === 1) {
      scheduleTone(context, master, midiFrequency(chord[1] + 12), start + beatSeconds * 0.48, beatSeconds * 0.28, 0.0065, "sine", 0.008, 0.16);
    }
  }

  const rendered = await context.startRendering();
  const blob = encodeWav(rendered);
  const safeName = track.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return new File([blob], `morados-${safeName}.wav`, { type: "audio/wav" });
}
