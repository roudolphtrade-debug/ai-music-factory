/**
 * Protections for the AI gateway endpoints (`/api/studio/generate`, `/api/voice/speak`,
 * `/api/voice/transcribe`).
 *
 * These routes spend server-side AI credits. Every request must come from a signed-in member: the
 * session is verified server-side (`member-guard.ts`) before the body is read and before any provider
 * call. Beyond that, what exists here limits obvious abuse and accidents. It does NOT cap the total
 * spend, not even of a signed-in member (per-member quotas need shared storage: a later lot):
 *  - Same-origin check: a browser `fetch` sends `Origin` / `Sec-Fetch-Site`. A scripted client can
 *    forge both, so this only stops casual hits, not a determined caller.
 *  - Local safety net: at most `AI_LIMITS.localRequestsPerWindow` accepted requests per route in
 *    any sliding 60 s window, counted in the memory of ONE server instance. Every instance has its
 *    own counter and a restart resets it, so it is not a shared or global limit. A refusal by this
 *    limiter records nothing and uses no quota. A request it admits stays counted even if it is then
 *    rejected for its size (413) or its content (400), because the limiter runs before the body is
 *    read.
 *  - No caller identification: no request header (`x-forwarded-for` included) is used to tell callers
 *    apart or to limit them, since a client can set most of them. All callers of an instance share
 *    the same counter.
 *  - Pause, ON BY DEFAULT: the three routes answer 503 without any member check or upstream call unless
 *    the server states `AI_ROUTES_PAUSED=0` (or false, no, off). A missing variable, an unreadable
 *    environment or any other value keeps them paused, so the delivered state cannot spend.
 *  - Input caps: see `AI_LIMITS`.
 * The only real spending ceilings are on the AI provider side (credit balance, auto top-up limit).
 *
 * Error responses never leak upstream gateway internals, addresses or configuration.
 */

import { AI_LIMITS } from "@/lib/ai-limits";
import { verifyMemberSession, type MemberCheck } from "@/lib/member-guard";

export type AiRoute = "generate" | "speak" | "transcribe";

export { AI_LIMITS };

/**
 * What happens when the server has no `AI_ROUTES_PAUSED` variable (or the platform does not hand its
 * environment to the code): the routes are PAUSED. Nothing paid can run until the owner states
 * `AI_ROUTES_PAUSED=0` on purpose (see docs/member-auth/LOT-STUDIO-GENERER.md, section 13).
 */
const AI_ROUTES_PAUSED_FALLBACK = true;
/** The only values that open the routes. Anything else, or nothing at all, keeps them paused. */
const OPEN_VALUES = ["0", "false", "no", "off"];
/** Multipart framing around the audio file. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

type Env = Record<string, string | undefined>;

interface WindowLimiter {
  /** Records the request and returns `null`, or returns the seconds to wait when the window is full. */
  take(key: string): number | null;
}

/**
 * Sliding window: a request is refused when `limit` accepted requests already fall within the last
 * `windowMs`. Refused requests are not recorded and use no quota, so insisting never extends the
 * wait. An accepted request stops counting exactly `windowMs` later, whatever happens to it next
 * (a request admitted here and then rejected for its size stays counted).
 */
function createWindowLimiter(limit: number, windowMs: number, now: () => number): WindowLimiter {
  const hits = new Map<string, number[]>();
  return {
    take(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000));
      }
      recent.push(t);
      hits.set(key, recent);
      // Opportunistic cleanup so the map cannot grow unbounded.
      if (hits.size > 5000) {
        for (const [k, times] of hits) {
          if (times.every((ts) => t - ts >= windowMs)) hits.delete(k);
        }
      }
      return null;
    },
  };
}

function sameOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  // Browser same-origin requests always carry one of these signals.
  if (fetchSite === "same-origin" || fetchSite === "none") return true;
  if (origin && host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  // No Origin and no Sec-Fetch-Site → almost certainly a scripted external call.
  return false;
}

/** Paused unless the variable explicitly says "0", "false", "no" or "off": it fails closed. */
function isPaused(env: Env): boolean {
  const value = env.AI_ROUTES_PAUSED;
  if (value === undefined) return AI_ROUTES_PAUSED_FALLBACK;
  return !OPEN_VALUES.includes(value.trim().toLowerCase());
}

export interface AiGuardOptions {
  now?: () => number;
  env?: () => Env;
}

/**
 * Builds a guard with its own counters. The routes share one instance (`guardAiRequest`); tests
 * build their own so no state leaks between them.
 */
export function createAiGuard(options: AiGuardOptions = {}) {
  const now = options.now ?? Date.now;
  const readEnv = options.env ?? (() => (typeof process !== "undefined" ? process.env : {}));
  const local = createWindowLimiter(AI_LIMITS.localRequestsPerWindow, AI_LIMITS.windowMs, now);

  /** Same-origin check, then the manual pause. Reads and records nothing. */
  const preflight = (request: Request): Response | null => {
    if (!sameOrigin(request)) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }
    if (isPaused(readEnv())) {
      return Response.json(
        { error: "AI features are temporarily paused.", code: "ai_paused" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return null;
  };

  /** The local sliding-window limit; an admitted request is recorded. */
  const limit = (route: AiRoute): Response | null => {
    const wait = local.take(route);
    if (wait !== null) {
      return Response.json(
        { error: "Too many requests, slow down.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(wait) } },
      );
    }
    return null;
  };

  /**
   * Returns a `Response` to short-circuit the handler when the request is rejected, or `null` when
   * it may proceed. Origin, pause, then the limit; the member check sits between the last two in
   * `createMemberGuard`.
   */
  const guard = (request: Request, route: AiRoute): Response | null =>
    preflight(request) ?? limit(route);
  return Object.assign(guard, { preflight, limit });
}

export interface MemberGuardOptions extends AiGuardOptions {
  /** Defaults to the real check against the project's authentication service. */
  verify?: (request: Request) => Promise<MemberCheck>;
}

/**
 * The guard the three paid routes use. Order: same origin, manual pause, signed-in member, local
 * limit. A refused request never reaches the body or a provider. The member check runs before the
 * limit so that callers without a session cannot use up the window of those who have one.
 */
export function createMemberGuard(options: MemberGuardOptions = {}) {
  const guard = createAiGuard(options);
  const verify = options.verify ?? ((request: Request) => verifyMemberSession(request));
  return async function memberGuard(request: Request, route: AiRoute): Promise<Response | null> {
    const early = guard.preflight(request);
    if (early) return early;
    const member = await verify(request);
    if (!member.ok) return member.response;
    return guard.limit(route);
  };
}

export const guardMemberRequest = createMemberGuard();

export function tooLargeResponse(message: string): Response {
  return Response.json({ error: message, code: "too_large" }, { status: 413 });
}

/**
 * Reads the request body but gives up past `maxBytes`: a declared `Content-Length` over the cap is
 * refused before any byte is read, and any other body (no header, or a value that is not a number
 * over the cap) is cut off and its stream cancelled as soon as what was read exceeds the cap.
 * Returns `null` when the cap is exceeded. The request was already admitted by the guard, so it
 * stays counted against the local safety net.
 */
export async function readBodyLimited(request: Request, maxBytes: number) {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) return null;
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** JSON body capped at `AI_LIMITS.jsonBytes`. */
export async function readJsonLimited(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const bytes = await readBodyLimited(request, AI_LIMITS.jsonBytes);
  if (bytes === null) return { ok: false, response: tooLargeResponse("Request too large.") };
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
}

/** Multipart body capped at the audio cap plus the multipart framing. */
export async function readFormLimited(
  request: Request,
): Promise<{ ok: true; form: FormData } | { ok: false; response: Response }> {
  const bytes = await readBodyLimited(request, AI_LIMITS.audioBytes + MULTIPART_OVERHEAD_BYTES);
  if (bytes === null) return { ok: false, response: tooLargeResponse("Recording too large.") };
  try {
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    return { ok: true, form };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Expected multipart/form-data." }, { status: 400 }),
    };
  }
}

/** A string from untrusted JSON, trimmed and cut to `max` characters; `fallback` when not a string. */
export function textField(value: unknown, max: number, fallback = ""): string {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  return text || fallback;
}
