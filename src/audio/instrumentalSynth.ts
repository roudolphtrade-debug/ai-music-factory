/**
 * Procedural instrumental synthesizer.
 *
 * Everything here is generated from raw math (oscillators, noise, envelopes)
 * — there are no samples, no loops, no third-party licensed material, and no
 * network call. It runs entirely client-side, so composing a backing track
 * costs nothing beyond CPU time in the visitor's own browser.
 *
 * This is intentionally *not* pitched as "AI-generated music": it's a small
 * deterministic synthesizer, in the spirit of a hardware groovebox. That's a
 * feature to be honest about, not to oversell.
 */

export const SAMPLE_RATE = 44100;

type Wave = "sine" | "saw" | "square" | "triangle";

function osc(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case "sine":
      return Math.sin(2 * Math.PI * p);
    case "saw":
      return 2 * p - 1;
    case "square":
      return p < 0.5 ? 1 : -1;
    case "triangle":
      return 4 * Math.abs(p - 0.5) - 1;
  }
}

/** Simple one-pole lowpass, used to soften noise bursts and saw waves. */
function lowpass(input: Float32Array, cutoff01: number): Float32Array {
  const out = new Float32Array(input.length);
  const a = Math.max(0.001, Math.min(1, cutoff01));
  let prev = 0;
  for (let i = 0; i < input.length; i++) {
    prev = prev + a * (input[i] - prev);
    out[i] = prev;
  }
  return out;
}

function addAt(buf: Float32Array, sound: Float32Array, startSample: number, gain = 1) {
  const end = Math.min(buf.length, startSample + sound.length);
  for (let i = startSample; i < end; i++) {
    buf[i] += sound[i - startSample] * gain;
  }
}

function expEnv(n: number, decay: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.exp((-decay * i) / SAMPLE_RATE);
  return out;
}

/** Kick: pitched sine sweeping down, punchy and short. */
function synthKick(lenSec: number, startHz: number, endHz: number): Float32Array {
  const n = Math.floor(SAMPLE_RATE * lenSec);
  const out = new Float32Array(n);
  const env = expEnv(n, 9 / lenSec);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = endHz + (startHz - endHz) * Math.exp(-t * (5 / lenSec));
    phase += freq / SAMPLE_RATE;
    out[i] = osc("sine", phase) * env[i];
  }
  return out;
}

/** Hat / shaker: filtered noise burst. */
function synthHat(lenSec: number, brightness: number): Float32Array {
  const n = Math.floor(SAMPLE_RATE * lenSec);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = Math.random() * 2 - 1;
  // crude highpass via differencing, then a touch of lowpass to tame harshness
  const hp = new Float32Array(n);
  for (let i = 1; i < n; i++) hp[i] = raw[i] - raw[i - 1];
  const shaped = lowpass(hp, 0.35 + brightness * 0.4);
  const env = expEnv(n, 55 / lenSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = shaped[i] * env[i];
  return out;
}

/** Snare / clap: noise + a short tonal thump. */
function synthSnare(lenSec: number): Float32Array {
  const n = Math.floor(SAMPLE_RATE * lenSec);
  const out = new Float32Array(n);
  const env = expEnv(n, 13 / lenSec);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const noise = Math.random() * 2 - 1;
    phase += 190 / SAMPLE_RATE;
    const tone = osc("sine", phase) * 0.5;
    out[i] = (noise * 0.65 + tone) * env[i];
  }
  return lowpass(out, 0.6);
}

/** Bass note: a single sustained pitched tone with a short attack. */
function synthBassNote(lenSec: number, freq: number, wave: Wave): Float32Array {
  const n = Math.floor(SAMPLE_RATE * lenSec);
  const out = new Float32Array(n);
  const attack = Math.min(n, Math.floor(SAMPLE_RATE * 0.012));
  const release = Math.min(n, Math.floor(SAMPLE_RATE * 0.05));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += freq / SAMPLE_RATE;
    let g = 1;
    if (i < attack) g = i / attack;
    else if (i > n - release) g = (n - i) / release;
    out[i] = osc(wave, phase) * g * 0.55;
  }
  return lowpass(out, 0.5);
}

/** Pad chord: a handful of slightly detuned sustained oscillators. */
function synthPadChord(lenSec: number, freqs: number[]): Float32Array {
  const n = Math.floor(SAMPLE_RATE * lenSec);
  const out = new Float32Array(n);
  const attack = Math.floor(SAMPLE_RATE * lenSec * 0.35);
  const release = Math.floor(SAMPLE_RATE * lenSec * 0.4);
  const detunes = [-0.06, 0, 0.05, 0.12];
  for (const f of freqs) {
    for (const d of detunes) {
      let phase = Math.random();
      const fq = f * (1 + d / 100);
      for (let i = 0; i < n; i++) {
        phase += fq / SAMPLE_RATE;
        let g = 1;
        if (i < attack) g = i / attack;
        else if (i > n - release) g = Math.max(0, (n - i) / release);
        out[i] += osc("triangle", phase) * g * (0.09 / detunes.length);
      }
    }
  }
  return lowpass(out, 0.22);
}

// --- Genre & mood configuration -------------------------------------------

interface GenreConfig {
  bpm: number;
  kickPattern: number[]; // 16 steps
  snarePattern: number[];
  hatPattern: number[];
  bassWave: Wave;
  swing: number; // 0..1, delays every odd 16th
}

const GENRES: Record<string, GenreConfig> = {
  "Hip-Hop": {
    bpm: 88,
    kickPattern: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
    bassWave: "sine",
    swing: 0.12,
  },
  Trap: {
    bpm: 140,
    kickPattern: [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bassWave: "sine",
    swing: 0,
  },
  Afrobeats: {
    bpm: 104,
    kickPattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    bassWave: "triangle",
    swing: 0.08,
  },
  "UK Drill": {
    bpm: 142,
    kickPattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snarePattern: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    hatPattern: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
    bassWave: "sine",
    swing: 0,
  },
  Amapiano: {
    bpm: 112,
    kickPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    bassWave: "triangle",
    swing: 0.15,
  },
  Reggaeton: {
    bpm: 96,
    kickPattern: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bassWave: "sine",
    swing: 0,
  },
  Hyperpop: {
    bpm: 160,
    kickPattern: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bassWave: "square",
    swing: 0,
  },
  "Neo-Soul": {
    bpm: 78,
    kickPattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatPattern: [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
    bassWave: "sine",
    swing: 0.18,
  },
};

const DEFAULT_GENRE: GenreConfig = GENRES["Hip-Hop"];

interface MoodConfig {
  /** Semitone offsets from the root, defining the chord/scale color. */
  intervals: number[];
  brightness: number; // 0..1, opens the hat filter and pad filter
  bassLevel: number;
  padLevel: number;
}

const MOODS: Record<string, MoodConfig> = {
  Euphoric: { intervals: [0, 4, 7, 11], brightness: 0.9, bassLevel: 1, padLevel: 0.9 },
  Hypnotic: { intervals: [0, 3, 7, 10], brightness: 0.4, bassLevel: 1.1, padLevel: 0.7 },
  Intimate: { intervals: [0, 3, 7], brightness: 0.35, bassLevel: 0.8, padLevel: 1 },
  Dramatic: { intervals: [0, 3, 6, 10], brightness: 0.55, bassLevel: 1.1, padLevel: 1 },
  Nostalgic: { intervals: [0, 4, 7, 9], brightness: 0.5, bassLevel: 0.9, padLevel: 1 },
  Triumphant: { intervals: [0, 4, 7, 12], brightness: 0.95, bassLevel: 1.1, padLevel: 0.85 },
  Ethereal: { intervals: [0, 5, 7, 14], brightness: 0.8, bassLevel: 0.7, padLevel: 1.15 },
  Reflective: { intervals: [0, 3, 7, 9], brightness: 0.45, bassLevel: 0.85, padLevel: 1 },
};

const DEFAULT_MOOD: MoodConfig = MOODS.Reflective;

function midiToHz(semitoneFromA1: number): number {
  // A1 = 55Hz reference
  return 55 * Math.pow(2, semitoneFromA1 / 12);
}

/**
 * Synthesize an instrumental bed of roughly `durationSec` seconds, looping a
 * short generated pattern (bars) to fill the requested length. Returns mono
 * PCM samples in [-1, 1] at SAMPLE_RATE.
 */
export function synthesizeInstrumental(
  genre: string,
  mood: string,
  durationSec: number,
): Float32Array {
  const g = GENRES[genre] ?? DEFAULT_GENRE;
  const m = MOODS[mood] ?? DEFAULT_MOOD;

  const beat = 60 / g.bpm;
  const step = beat / 4; // 16th notes
  const barLen = step * 16;
  const bars = Math.max(2, Math.ceil(durationSec / barLen));
  const totalLen = bars * barLen + 1; // +1s tail so envelopes never get cut off mid-decay
  const buf = new Float32Array(Math.floor(SAMPLE_RATE * totalLen));

  const kick = synthKick(0.32, 150, 42);
  const snare = synthSnare(0.16);
  const hat = synthHat(0.05, m.brightness);

  // Root progression: root, then chord tones a third and a fifth below/above
  // depending on mood, cycling every bar for movement without dissonance.
  const rootOffsets = [0, g.bassWave === "square" ? 3 : -2, m.intervals[1] ?? 4, -3];

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barLen;
    const rootSemis = rootOffsets[bar % rootOffsets.length];

    // Drums
    for (let s = 0; s < 16; s++) {
      const swungOffset = s % 2 === 1 ? g.swing * step : 0;
      const t = barStart + s * step + swungOffset;
      const at = Math.floor(t * SAMPLE_RATE);
      if (g.kickPattern[s]) addAt(buf, kick, at, 0.95);
      if (g.snarePattern[s]) addAt(buf, snare, at, 0.8);
      if (g.hatPattern[s]) addAt(buf, hat, at, 0.5 + m.brightness * 0.3);
    }

    // Bass: one sustained note per bar, root of the current chord, low register
    const bassFreq = midiToHz(rootSemis - 12);
    const bassNote = synthBassNote(barLen, bassFreq, g.bassWave);
    addAt(buf, bassNote, Math.floor(barStart * SAMPLE_RATE), m.bassLevel);

    // Pad: full chord from the mood's interval set, mid register
    const padFreqs = m.intervals.map((iv) => midiToHz(rootSemis + iv));
    const pad = synthPadChord(barLen * 2, padFreqs);
    addAt(buf, pad, Math.floor(barStart * SAMPLE_RATE), m.padLevel);
  }

  // Soft limiter: tanh saturates gracefully instead of hard-clipping if a
  // few transients stack up.
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const norm = peak > 0.001 ? 0.8 / peak : 1;
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.tanh(buf[i] * norm * 1.15) * 0.9;
  }

  return buf;
}
