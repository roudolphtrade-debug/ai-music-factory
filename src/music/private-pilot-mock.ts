/**
 * The FICTITIOUS provider of the pilot (mode "mock"), for integration tests on isolated Cloudflare resources without
 * any Google call or cost. It answers like Lyria 3.5, at real size (about 4 MB of JSON around a 3 MB base64 "MP3"),
 * so the real parsing, hashing and storage code is measured. The "MP3" is an ID3 header followed by pseudo-random
 * bytes: not audio, no sensitive content. The answer is built in memory and never leaves the isolate.
 */
import { generateLyriaSong, type LyriaSong, type LyriaSongRequest } from "./lyria35";

export const MOCK_AUDIO_BYTES = 3_000_000;
export const MOCK_LYRICS = "[mock] AIMF recette: fictitious output, no real audio.";

export function mockLyriaAnswer(audioBytes = MOCK_AUDIO_BYTES): Uint8Array {
  const audio = new Uint8Array(audioBytes);
  audio.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0].slice(0, audioBytes));
  let x = 2463534242;
  for (let i = 10; i < audio.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    audio[i] = x & 0xff;
  }
  let binary = "";
  for (let i = 0; i < audio.length; i += 0x8000) binary += String.fromCharCode(...audio.subarray(i, i + 0x8000));
  const json = JSON.stringify({
    id: "aimf-mock",
    steps: [{ type: "model_output", content: [{ type: "text", text: MOCK_LYRICS }, { type: "audio", data: btoa(binary) }] }],
  });
  return new TextEncoder().encode(json);
}

/** Same signature as the real call; the injected transport answers locally, so nothing is sent anywhere. */
export function mockGenerate(audioBytes = MOCK_AUDIO_BYTES) {
  return async (request: LyriaSongRequest, options: { signal: AbortSignal }): Promise<LyriaSong> => {
    const answer = mockLyriaAnswer(audioBytes);
    const song = await generateLyriaSong(request, {
      apiKey: "mock-provider-no-network",
      signal: options.signal,
      fetchImpl: async () => new Response(answer.slice()),
    });
    return { ...song, estimatedCostUsd: 0 };
  };
}
