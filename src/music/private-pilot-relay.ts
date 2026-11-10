/**
 * Lovable side of the private Lyria pilot: a RELAY, and nothing else. The browser contract is unchanged (same path
 * `/api/studio/lyria-private`, same Bearer session, same Idempotency-Key, same answers); the relay checks, signs and
 * forwards to the dedicated Worker, which holds D1, the queue, the bucket and the only consumer.
 *
 * Checks before any outbound request (each refusal sends nothing to the Worker):
 *   method -> emergency stop AI_ROUTES_PAUSED (fail-closed) -> same origin -> relay configuration -> session
 *   (Supabase) -> owner -> local limit (60 per minute per instance) -> body <= 8 KiB.
 *
 * Forwarding rules (P3a):
 *  - the exact bytes read once are signed and sent; the Idempotency-Key of the browser is relayed, never made up;
 *  - ONE attempt: never a retry, whatever the error (a POST is never sent twice by the relay);
 *  - only Authorization, Idempotency-Key, Content-Type and the signature headers go out: no cookie, no Range, no
 *    If-*, no Accept-Encoding of the browser; redirects are not followed;
 *  - at most RELAY_HEADER_TIMEOUT_MS for the Worker's headers; no limit on the body, which is streamed through
 *    without buffering (a client that goes away cancels the upstream stream);
 *  - answers pass through a header allow-list. A service-proof failure of the Worker becomes 503 pilot_unavailable
 *    (never 401, which would make the browser renew a session that is fine). For the song: only a complete 200
 *    `audio/mpeg` with its length and fingerprint is relayed; a partial answer is 502 audio_unavailable.
 *
 * Configuration (server-side only, never `VITE_`): AIMF_PILOT_WORKER_URL, AIMF_PILOT_HMAC_K1 (or _K2 with
 * AIMF_PILOT_HMAC_KEY_ID=k2), AIMF_PRIVATE_LYRIA_OWNER_ID, optional AIMF_PILOT_AUDIENCE and the Access service token
 * pair AIMF_PILOT_ACCESS_CLIENT_ID / _SECRET. Missing or invalid: 503 pilot_unconfigured, nothing is sent.
 */
import { AI_LIMITS, readBodyLimited } from "@/lib/api-guard";
import { bearerToken, verifyMemberSession, type MemberCheck } from "@/lib/member-guard";
import { aiRoutesPaused } from "./private-pilot-bindings";
import {
  PILOT_DEFAULT_AUDIENCE,
  PILOT_INTERNAL_PATH,
  PILOT_MAX_BODY_BYTES,
  signPilotRequest,
  usableSecret,
  type PilotKeyId,
} from "./private-pilot-hmac";

export const RELAY_PUBLIC_PATH = "/api/studio/lyria-private";
/** Longest wait for the Worker's response HEADERS. The body has no timer. */
export const RELAY_HEADER_TIMEOUT_MS = 10_000;
/** Largest JSON error body read when the relay needs to look at its code. */
const MAX_INSPECTED_BODY_BYTES = 4096;

type Env = Record<string, unknown>;

export interface RelayConfig {
  workerOrigin: string;
  audience: string;
  keyId: PilotKeyId;
  secret: string;
  ownerId: string;
  access: { id: string; secret: string } | null;
}

export interface RelayDeps {
  fetch?: typeof fetch;
  verify?: (request: Request) => Promise<MemberCheck>;
  nowSeconds?: () => number;
  processEnv?: Record<string, string | undefined>;
  headerTimeoutMs?: number;
  limiter?: RelayLimiter;
  log?: (line: string) => void;
}

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function failure(status: number, code: string, extra: Record<string, string> = {}): Response {
  return Response.json({ error: "Private music generation unavailable.", code }, { status, headers: { ...NO_STORE, ...extra } });
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** `https://host[:port]` only (plain http for a local bench on this machine), no path, query or credentials. */
export function workerOrigin(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const secure = url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  if (!secure || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    return null;
  }
  return url.origin;
}

function readVar(env: Env | null | undefined, processEnv: Record<string, string | undefined>, name: string) {
  const bound = env?.[name];
  return typeof bound === "string" ? bound : processEnv[name];
}

export function relayConfig(env: Env | null | undefined, processEnv: Record<string, string | undefined>): RelayConfig | null {
  const read = (name: string) => readVar(env, processEnv, name);
  const origin = workerOrigin(read("AIMF_PILOT_WORKER_URL"));
  const keyIdRaw = read("AIMF_PILOT_HMAC_KEY_ID")?.trim() || "k1";
  if (keyIdRaw !== "k1" && keyIdRaw !== "k2") return null;
  const keyId = keyIdRaw as PilotKeyId;
  const secret = usableSecret(read(keyId === "k1" ? "AIMF_PILOT_HMAC_K1" : "AIMF_PILOT_HMAC_K2"));
  const ownerId = read("AIMF_PRIVATE_LYRIA_OWNER_ID")?.trim() ?? "";
  const accessId = read("AIMF_PILOT_ACCESS_CLIENT_ID")?.trim() ?? "";
  const accessSecret = read("AIMF_PILOT_ACCESS_CLIENT_SECRET")?.trim() ?? "";
  if (!origin || !secret || !ownerId || (accessId === "") !== (accessSecret === "")) return null;
  return {
    workerOrigin: origin,
    audience: read("AIMF_PILOT_AUDIENCE")?.trim() || PILOT_DEFAULT_AUDIENCE,
    keyId,
    secret,
    ownerId,
    access: accessId ? { id: accessId, secret: accessSecret } : null,
  };
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export interface RelayLimiter {
  /** `null` when admitted (and recorded), else the seconds to wait. */
  take(): number | null;
}

/** Sliding window in the memory of ONE instance, like the other AI routes: a safety net, not a global limit. */
export function createRelayLimiter(now: () => number = Date.now): RelayLimiter {
  let hits: number[] = [];
  return {
    take() {
      const t = now();
      hits = hits.filter((ts) => t - ts < AI_LIMITS.windowMs);
      if (hits.length >= AI_LIMITS.localRequestsPerWindow) {
        return Math.max(1, Math.ceil((hits[0] + AI_LIMITS.windowMs - t) / 1000));
      }
      hits.push(t);
      return null;
    },
  };
}

const sharedLimiter = createRelayLimiter();

async function readLimitedText(body: ReadableStream<Uint8Array> | null, max: number): Promise<string | null> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
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
  return new TextDecoder().decode(bytes);
}

const discard = (response: Response) => response.body?.cancel().catch(() => {});

/** The song, relayed only when it is the complete file with its length and fingerprint. */
function relayAudio(upstream: Response): Response {
  const length = upstream.headers.get("content-length");
  const encoding = upstream.headers.get("content-encoding");
  const digest = upstream.headers.get("repr-digest");
  const complete =
    upstream.status === 200 &&
    (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() === "audio/mpeg" &&
    length !== null &&
    /^\d+$/.test(length) &&
    Number(length) > 0 &&
    upstream.headers.get("content-range") === null &&
    (encoding === null || encoding.trim().toLowerCase() === "identity") &&
    digest !== null &&
    upstream.body !== null;
  if (!complete) {
    void discard(upstream);
    return failure(502, "audio_unavailable");
  }
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Content-Length": length,
    "Repr-Digest": digest,
    "Cache-Control": "private, no-store, no-transform",
    "Accept-Ranges": "none",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["x-aimf-audio-check", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // The upstream stream itself, never read here: no buffering, and a cancel by the client reaches the Worker.
  return new Response(upstream.body, { status: 200, headers });
}

/** A JSON answer of the contract, passed through with an allow-list of headers. */
async function relayJson(upstream: Response): Promise<Response> {
  const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const status = upstream.status;
  if (type !== "application/json" || status < 200 || (status >= 500 && status !== 503)) {
    void discard(upstream);
    return failure(503, "pilot_unavailable");
  }
  const headers = new Headers({ "Content-Type": "application/json", ...NO_STORE });
  for (const name of ["retry-after", "www-authenticate"]) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  if (upstream.status === 401) {
    const text = await readLimitedText(upstream.body, MAX_INSPECTED_BODY_BYTES).catch(() => null);
    let code: unknown = null;
    try {
      code = text ? (JSON.parse(text) as { code?: unknown }).code : null;
    } catch {
      code = null;
    }
    // A failed service proof is a server configuration problem, not an expired session.
    if (code === "service_auth_failed" || text === null) return failure(503, "pilot_unavailable");
    return new Response(text, { status: 401, headers });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

export function createPilotRelay(deps: RelayDeps = {}) {
  const limiter = deps.limiter ?? sharedLimiter;
  return async function relayPrivateLyriaRequest(request: Request, env?: unknown): Promise<Response> {
    const processEnv = deps.processEnv ?? (typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {});
    const bindings = (env && typeof env === "object" ? env : null) as Env | null;
    const log = deps.log ?? ((line: string) => console.warn(line));

    if (request.method !== "POST" && request.method !== "GET") return failure(405, "method_not_allowed");
    if (aiRoutesPaused(bindings as { AI_ROUTES_PAUSED?: string } | null, processEnv)) return failure(503, "ai_paused");
    if (!isSameOriginRequest(request)) return failure(403, "forbidden");
    const config = relayConfig(bindings, processEnv);
    if (!config) return failure(503, "pilot_unconfigured");

    // No session at all: refused here, without any network call.
    if (!bearerToken(request)) {
      return Response.json(
        { error: "Sign in to use this feature.", code: "sign_in_required" },
        { status: 401, headers: { ...NO_STORE, "WWW-Authenticate": "Bearer" } },
      );
    }
    const member = await (deps.verify ?? ((r: Request) => verifyMemberSession(r)))(request);
    if (!member.ok) return member.response;
    if (member.userId !== config.ownerId) return failure(403, "owner_only");
    const wait = limiter.take();
    if (wait !== null) return failure(429, "rate_limited", { "Retry-After": String(wait) });

    const body = request.method === "POST" ? await readBodyLimited(request, PILOT_MAX_BODY_BYTES) : new Uint8Array(0);
    if (body === null) return failure(413, "too_large");

    const url = new URL(request.url);
    const authorization = request.headers.get("authorization");
    const idempotencyKey = request.headers.get("idempotency-key");
    const signature = await signPilotRequest({
      method: request.method,
      search: url.search,
      body,
      authorization,
      idempotencyKey,
      audience: config.audience,
      keyId: config.keyId,
      secret: config.secret,
      nowSeconds: (deps.nowSeconds ?? (() => Date.now() / 1000))(),
    });
    const headers = new Headers(signature);
    headers.set("authorization", authorization ?? "");
    headers.set("accept-encoding", "identity");
    if (idempotencyKey !== null) headers.set("idempotency-key", idempotencyKey);
    if (request.method === "POST") headers.set("content-type", "application/json");
    if (config.access) {
      headers.set("cf-access-client-id", config.access.id);
      headers.set("cf-access-client-secret", config.access.secret);
    }

    const controller = new AbortController();
    const onClientGone = () => controller.abort();
    request.signal?.addEventListener?.("abort", onClientGone, { once: true });
    // A client that left before this point would never fire the event: checked once the listener is in place.
    if (request.signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), deps.headerTimeoutMs ?? RELAY_HEADER_TIMEOUT_MS);
    let upstream: Response;
    try {
      // ONE attempt, never retried: a POST is sent at most once by the relay.
      upstream = await (deps.fetch ?? fetch)(`${config.workerOrigin}${PILOT_INTERNAL_PATH}${url.search}`, {
        method: request.method,
        headers,
        body: request.method === "POST" ? body : undefined,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch {
      log(JSON.stringify({ event: "aimf_pilot_relay", result: "upstream_unavailable" }));
      return failure(503, "pilot_unavailable");
    } finally {
      clearTimeout(timer);
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      void discard(upstream);
      return failure(503, "pilot_unavailable");
    }
    const isAudio = request.method === "GET" && url.searchParams.get("audio") === "1";
    if (isAudio && (upstream.status === 200 || upstream.status === 206 || upstream.headers.get("content-range") !== null)) {
      return relayAudio(upstream);
    }
    return relayJson(upstream);
  };
}

/** The relay as `src/server.ts` uses it. */
export const relayPrivateLyriaRequest = createPilotRelay();
