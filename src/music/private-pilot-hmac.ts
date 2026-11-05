/**
 * Service proof between the Lovable relay and the dedicated pilot Worker: HMAC-SHA256 over a canonical string.
 *
 * The relay (`private-pilot-relay.ts`) signs each request it forwards; the Worker (`private-pilot-service.ts`)
 * verifies the signature BEFORE any other input/output (no Supabase, D1, queue or bucket access for an unsigned
 * request). The signature covers the method, the internal path, the normalized query, the timestamp, the
 * Idempotency-Key, the SHA-256 of the exact body bytes and the SHA-256 of the relayed session token, so that none of
 * them can be changed, and a signed request cannot be re-bound to another session or another attempt.
 *
 *  - Anti-replay: a signature is valid for +/- PILOT_SIG_WINDOW_SECONDS around its timestamp. Inside the window a
 *    replay is harmless by construction: a POST carries its Idempotency-Key (primary key of the attempt in D1), so a
 *    replayed POST returns the same attempt and never creates a new one; a GET only reads.
 *  - Keys: `k1`, and `k2` during a rotation. A secret is at least PILOT_MIN_SECRET_BYTES bytes; an absent, empty or
 *    shorter secret never verifies anything (the Worker answers 503, fail-closed).
 *  - Comparison: `crypto.subtle.verify` (constant time), never `===` on the signature.
 *
 * No secret value is ever logged, returned or placed in a URL by this module.
 */

export const PILOT_SIG_SCHEME = "AIMF-PILOT-HMAC-SHA256-v1";
export const PILOT_SIG_VERSION = "1";
/** The only path the dedicated Worker serves. The browser never sees it. */
export const PILOT_INTERNAL_PATH = "/internal/v1/lyria-pilot";
/** Audience of the recette Worker; another environment uses another audience AND another secret. */
export const PILOT_DEFAULT_AUDIENCE = "aimf-lyria-pilot-recette";
export const PILOT_SIG_WINDOW_SECONDS = 60;
export const PILOT_MIN_SECRET_BYTES = 32;
/** Largest body the relay forwards and the Worker accepts (the pilot input is far smaller). */
export const PILOT_MAX_BODY_BYTES = 8 * 1024;

export type PilotKeyId = "k1" | "k2";
export const PILOT_KEY_IDS: readonly PilotKeyId[] = ["k1", "k2"];

export const SIG_HEADERS = {
  version: "x-aimf-sig-version",
  keyId: "x-aimf-key-id",
  timestamp: "x-aimf-timestamp",
  contentSha256: "x-aimf-content-sha256",
  signature: "x-aimf-signature",
} as const;

const encoder = new TextEncoder();
const HEX64 = /^[0-9a-f]{64}$/;
/** 32 bytes of HMAC-SHA256 in base64url without padding. */
const SIGNATURE_SHAPE = /^[A-Za-z0-9_-]{43}$/;
const TIMESTAMP_SHAPE = /^\d{1,12}$/;

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** RFC 3986 percent-encoding (unreserved characters only are left as they are). */
const rfc3986 = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Query parameters sorted by name then value, RFC 3986 encoded, joined by `&`; empty when there is none. */
export function canonicalQuery(search: string): string {
  const pairs = [...new URLSearchParams(search)].map(([k, v]) => [rfc3986(k), rfc3986(v)] as const);
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}

/** The session token as signed: the raw `Bearer` value of `Authorization`, or `null` when there is none. */
export function signedBearer(authorization: string | null): string | null {
  const match = authorization ? /^Bearer\s+(\S+)$/i.exec(authorization.trim()) : null;
  return match?.[1] ?? null;
}

/** The Idempotency-Key as signed: trimmed, lower case, or "-" when absent. */
export function signedIdempotencyKey(value: string | null): string {
  const key = value?.trim().toLowerCase() ?? "";
  return key === "" ? "-" : key;
}

export interface CanonicalInput {
  audience: string;
  method: string;
  search: string;
  timestamp: string;
  idempotencyKey: string | null;
  contentSha256: string;
  bearerSha256: string;
}

/** One field per line, `\n` separated, no trailing newline. Every line is required (see the known-answer test). */
export function canonicalString(input: CanonicalInput): string {
  return [
    PILOT_SIG_SCHEME,
    input.audience,
    input.method.toUpperCase(),
    PILOT_INTERNAL_PATH,
    canonicalQuery(input.search),
    input.timestamp,
    signedIdempotencyKey(input.idempotencyKey),
    input.contentSha256,
    input.bearerSha256,
  ].join("\n");
}

/** A usable secret: trimmed, at least PILOT_MIN_SECRET_BYTES bytes. Anything else is unusable. */
export function usableSecret(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const secret = value.trim();
  return encoder.encode(secret).byteLength >= PILOT_MIN_SECRET_BYTES ? secret : null;
}

const hmacKey = (secret: string, usage: "sign" | "verify") =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

export interface SignInput {
  method: string;
  search: string;
  body: Uint8Array;
  authorization: string | null;
  idempotencyKey: string | null;
  audience: string;
  keyId: PilotKeyId;
  secret: string;
  nowSeconds: number;
}

/** The five signature headers for one request. Throws when the secret is not usable (callers check first). */
export async function signPilotRequest(input: SignInput): Promise<Record<string, string>> {
  const secret = usableSecret(input.secret);
  if (!secret) throw new Error("unusable pilot signing secret");
  const timestamp = String(Math.floor(input.nowSeconds));
  const contentSha256 = await sha256Hex(input.body);
  const bearer = signedBearer(input.authorization);
  const canonical = canonicalString({
    audience: input.audience,
    method: input.method,
    search: input.search,
    timestamp,
    idempotencyKey: input.idempotencyKey,
    contentSha256,
    bearerSha256: bearer === null ? "-" : await sha256Hex(bearer),
  });
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), encoder.encode(canonical));
  return {
    [SIG_HEADERS.version]: PILOT_SIG_VERSION,
    [SIG_HEADERS.keyId]: input.keyId,
    [SIG_HEADERS.timestamp]: timestamp,
    [SIG_HEADERS.contentSha256]: contentSha256,
    [SIG_HEADERS.signature]: base64UrlEncode(new Uint8Array(signature)),
  };
}

/** Why a request was refused: counted in the logs only, never returned to the caller (no oracle). */
export type SignatureRefusal =
  | "missing"
  | "version"
  | "key_id"
  | "timestamp"
  | "window"
  | "content_hash"
  | "signature";

export interface VerifyInput {
  method: string;
  search: string;
  headers: Headers;
  body: Uint8Array;
  audience: string;
  secrets: Partial<Record<PilotKeyId, string>>;
  nowSeconds: number;
}

export async function verifyPilotSignature(
  input: VerifyInput,
): Promise<{ ok: true; keyId: PilotKeyId } | { ok: false; reason: SignatureRefusal }> {
  const h = input.headers;
  const version = h.get(SIG_HEADERS.version);
  const keyId = h.get(SIG_HEADERS.keyId);
  const timestamp = h.get(SIG_HEADERS.timestamp);
  const contentSha256 = h.get(SIG_HEADERS.contentSha256);
  const signature = h.get(SIG_HEADERS.signature);
  if (!version || !keyId || !timestamp || !contentSha256 || !signature) return { ok: false, reason: "missing" };
  if (version !== PILOT_SIG_VERSION) return { ok: false, reason: "version" };
  const secret = (PILOT_KEY_IDS as readonly string[]).includes(keyId)
    ? usableSecret(input.secrets[keyId as PilotKeyId])
    : null;
  if (!secret) return { ok: false, reason: "key_id" };
  if (!TIMESTAMP_SHAPE.test(timestamp)) return { ok: false, reason: "timestamp" };
  if (Math.abs(Math.floor(input.nowSeconds) - Number(timestamp)) > PILOT_SIG_WINDOW_SECONDS) {
    return { ok: false, reason: "window" };
  }
  if (!HEX64.test(contentSha256) || (await sha256Hex(input.body)) !== contentSha256) {
    return { ok: false, reason: "content_hash" };
  }
  const raw = SIGNATURE_SHAPE.test(signature) ? base64UrlDecode(signature) : null;
  if (!raw || raw.byteLength !== 32) return { ok: false, reason: "signature" };
  const bearer = signedBearer(h.get("authorization"));
  const canonical = canonicalString({
    audience: input.audience,
    method: input.method,
    search: input.search,
    timestamp,
    idempotencyKey: h.get("idempotency-key"),
    contentSha256,
    bearerSha256: bearer === null ? "-" : await sha256Hex(bearer),
  });
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), raw, encoder.encode(canonical));
  return valid ? { ok: true, keyId: keyId as PilotKeyId } : { ok: false, reason: "signature" };
}
