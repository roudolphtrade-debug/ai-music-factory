/**
 * Caps shared by the AI routes (which enforce them) and by the components that call them (which stay
 * under them). Plain constants: nothing here is server-only.
 */
export const AI_LIMITS = {
  /** Accepted requests per route, per server instance, in any sliding window. */
  localRequestsPerWindow: 60,
  windowMs: 60_000,
  /** Lyrics performed by the voice (and returned to the client). */
  lyricsChars: 600,
  /** Text read aloud. */
  speechChars: 800,
  /** Completion budget for the 4-line hook. */
  chatMaxTokens: 200,
  jsonBytes: 8 * 1024,
  audioBytes: 6 * 1024 * 1024,
} as const;

/** The microphone stops by itself after this long. */
export const DICTATION_MAX_SECONDS = 120;

/** Translation key for a failed call to one of the AI routes. */
export function aiErrorKey(status: number): string {
  if (status === 402) return "aiErrors.credits";
  if (status === 429) return "aiErrors.rate";
  if (status === 503) return "aiErrors.paused";
  if (status === 413) return "aiErrors.tooLarge";
  return "aiErrors.generic";
}
