/**
 * Lyria 3.5 adapter for the private music-generation demonstration.
 *
 * The adapter is transport-only: it NEVER decides who may generate, never handles user credits,
 * and never supplies an API key. A caller must first obtain a durable, atomic server-side budget
 * reservation and verify that the requester is the owner. Do not attach this directly to a public route.
 *
 * Lyria 3.5 Interactions REST:
 * https://ai.google.dev/gemini-api/docs/music-generation
 */
export const LYRIA_MODEL = "lyria-3.5" as const;
export const LYRIA_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const LYRIA_ESTIMATED_USD_PER_SONG = 0.08; // published price; not a billing guarantee

const MAX_PROMPT_CHARS = 1200;
const MAX_LYRICS_CHARS = 5000;
const MAX_RESPONSE_BYTES = 24 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export interface LyriaSongRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  language?: string;
  vocalPreference?: string;
  lyrics?: string;
}

export interface LyriaSong {
  model: typeof LYRIA_MODEL;
  audio: Uint8Array;
  mimeType: "audio/mpeg";
  text: string | null;
  estimatedCostUsd: number;
}

export type LyriaErrorCode =
  | "invalid_input"
  | "upstream_rejected"
  | "upstream_unavailable"
  | "upstream_invalid"
  | "response_too_large";

export class LyriaGenerationError extends Error {
  constructor(
    readonly code: LyriaErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "LyriaGenerationError";
  }
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function buildLyriaPrompt(request: LyriaSongRequest): string {
  const prompt = clean(request.prompt, MAX_PROMPT_CHARS);
  if (!prompt) throw new LyriaGenerationError("invalid_input", 400);
  const parts = [
    "Create an original, complete song with real sung vocals and a full instrumental arrangement.",
    "Do not produce spoken narration, a speech performance, or just lyrics.",
    "Musical direction: " + prompt,
  ];
  for (const [label, value] of [
    ["Genre", request.genre],
    ["Mood", request.mood],
    ["Sung language", request.language],
    ["Vocal preference (best effort, not guaranteed)", request.vocalPreference],
  ] as const) {
    const detail = clean(value, 80);
    if (detail) parts.push(label + ": " + detail);
  }
  const lyrics = clean(request.lyrics, MAX_LYRICS_CHARS);
  if (lyrics) {
    parts.push("Use these user-provided lyrics as the intended words (best effort):");
    parts.push(lyrics);
  } else {
    parts.push("Write original lyrics in the requested language with verses and a memorable chorus.");
  }
  return parts.join("\n");
}

async function readLimited(response: Response): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > MAX_RESPONSE_BYTES) {
    throw new LyriaGenerationError("response_too_large", 502);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new LyriaGenerationError("upstream_invalid", 502);
  const decoder = new TextDecoder();
  let text = "";
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new LyriaGenerationError("response_too_large", 502);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** Parse all model_output blocks; content order is not guaranteed by the provider. */
export function parseLyriaInteraction(raw: unknown): Pick<LyriaSong, "audio" | "mimeType" | "text"> {
  if (!raw || typeof raw !== "object") throw new LyriaGenerationError("upstream_invalid", 502);
  const steps = (raw as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) throw new LyriaGenerationError("upstream_invalid", 502);
  const textParts: string[] = [];
  let audioData: string | null = null;
  for (const step of steps) {
    if (!step || typeof step !== "object" || step.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const block of step.content) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") {
        const text = block.text.trim();
        if (text) textParts.push(text);
      }
      if (block.type === "audio" && typeof block.data === "string") {
        audioData = block.data;
      }
    }
  }
  if (!audioData || audioData.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioData)) {
    throw new LyriaGenerationError("upstream_invalid", 502);
  }
  const audioBuffer = Buffer.from(audioData, "base64");
  if (audioBuffer.byteLength === 0 || audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    throw new LyriaGenerationError("upstream_invalid", 502);
  }
  // The default output is MP3. An ID3 header or a valid MPEG audio sync word is required.
  const id3 = audioBuffer.byteLength >= 3 && audioBuffer.toString("ascii", 0, 3) === "ID3";
  const mpeg = audioBuffer.byteLength >= 2 && audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0;
  if (!id3 && !mpeg) throw new LyriaGenerationError("upstream_invalid", 502);
  return { audio: new Uint8Array(audioBuffer), mimeType: "audio/mpeg", text: textParts.join("\n\n") || null };
}

export interface LyriaInvokeOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Exactly one provider request. NEVER retry automatically: the provider may have billed a request
 * even when the response is lost or timed out.
 */
export async function generateLyriaSong(
  request: LyriaSongRequest,
  options: LyriaInvokeOptions,
): Promise<LyriaSong> {
  const input = buildLyriaPrompt(request);
  if (!options.apiKey?.trim()) throw new LyriaGenerationError("upstream_unavailable", 503);
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(LYRIA_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": options.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: LYRIA_MODEL, input }),
      cache: "no-store",
      signal: options.signal,
    });
  } catch {
    // No automatic retry because billing status is unknown on a network failure.
    throw new LyriaGenerationError("upstream_unavailable", 502);
  }
  if (!response.ok) {
    // Do not log or echo provider body, which might contain identifying or billing details.
    throw new LyriaGenerationError("upstream_rejected", response.status === 429 ? 429 : 502);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await readLimited(response));
  } catch (error) {
    if (error instanceof LyriaGenerationError) throw error;
    throw new LyriaGenerationError("upstream_invalid", 502);
  }
  return {
    model: LYRIA_MODEL,
    ...parseLyriaInteraction(raw),
    estimatedCostUsd: LYRIA_ESTIMATED_USD_PER_SONG,
  };
}
