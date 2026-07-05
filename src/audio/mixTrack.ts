import { synthesizeInstrumental, SAMPLE_RATE } from "./instrumentalSynth";
import { encodeWav } from "./wav";

let sharedContext: AudioContext | null = null;
function getContext(): AudioContext {
  if (!sharedContext) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedContext = new Ctor();
  }
  return sharedContext;
}

/**
 * Takes the raw AI vocal performance (mp3 Blob from /api/studio/generate) and
 * returns a new Blob where a procedurally synthesized instrumental bed
 * (matching the chosen genre/mood) has been mixed underneath it.
 *
 * Entirely client-side: the only browser API involved is AudioContext, used
 * solely to decode the vocal mp3 into PCM. Everything else is plain math.
 * If decoding fails for any reason, the original vocal-only blob is returned
 * unchanged so a track is never lost over a cosmetic upgrade.
 */
export async function composeFinalTrack(
  vocalBlob: Blob,
  genre: string,
  mood: string,
): Promise<Blob> {
  try {
    const ctx = getContext();
    const arrayBuffer = await vocalBlob.arrayBuffer();
    const vocalBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

    const durationSec = vocalBuffer.duration;
    const bed = synthesizeInstrumental(genre, mood, durationSec);

    const outSampleRate = vocalBuffer.sampleRate;
    // Resample the bed (generated at SAMPLE_RATE) to the vocal's native rate
    // with simple linear interpolation if they differ.
    const resampledBed =
      outSampleRate === SAMPLE_RATE ? bed : resampleLinear(bed, SAMPLE_RATE, outSampleRate);

    const frames = vocalBuffer.length;
    const vocalChannels = vocalBuffer.numberOfChannels;
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);

    const vocalGain = 1;
    const bedGain = 0.5; // sits underneath, doesn't compete with the vocal

    const vL = vocalBuffer.getChannelData(0);
    const vR = vocalChannels > 1 ? vocalBuffer.getChannelData(1) : vL;

    for (let i = 0; i < frames; i++) {
      const bedSample = (resampledBed[i] ?? 0) * bedGain;
      left[i] = vL[i] * vocalGain + bedSample;
      right[i] = vR[i] * vocalGain + bedSample;
    }

    softLimit(left);
    softLimit(right);

    return encodeWav([left, right], outSampleRate);
  } catch (err) {
    console.error("[composeFinalTrack] falling back to vocal-only track:", err);
    return vocalBlob;
  }
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = srcPos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

/** Gentle tanh saturation so an occasional loud moment rounds off instead of clipping. */
function softLimit(buf: Float32Array) {
  for (let i = 0; i < buf.length; i++) {
    const s = buf[i];
    buf[i] = Math.abs(s) > 0.98 ? Math.tanh(s) : s;
  }
}
