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

/**
 * Translation key for a failed call to one of the AI routes. `code` is the route's own `code` field
 * (never shown): a 503 is either the manual pause or the sign-in check being out of reach.
 */
export function aiErrorKey(status: number, code?: string): string {
  if (status === 401) return "aiErrors.session";
  if (status === 402) return "aiErrors.credits";
  if (status === 429) return "aiErrors.rate";
  if (status === 503)
    return code === "auth_unavailable" ? "aiErrors.authUnavailable" : "aiErrors.paused";
  if (status === 413) return "aiErrors.tooLarge";
  return "aiErrors.generic";
}

/** The `code` of an AI route's JSON error answer, if it has one (the body is otherwise ignored). */
export async function aiErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as { code?: unknown };
    return typeof body?.code === "string" ? body.code : undefined;
  } catch {
    return undefined;
  }
}
