/**
 * OPTIONAL layer L0 of the dedicated pilot Worker: Cloudflare Access with a service token.
 *
 * When the owner puts the Worker behind Access (decision of P4, nothing here enables it), Access checks the
 * `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers the relay sends and hands the Worker a signed JWT in
 * `Cf-Access-Jwt-Assertion`. The Worker then validates that JWT itself (RS256, keys from
 * `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, `aud` and `iss` checked, not expired), so a request
 * that reached the Worker some other way is refused. The HMAC proof (L1) is required in every case; L0 adds to it.
 *
 * Configuration, fail-closed: both `AIMF_PILOT_ACCESS_AUD` and `AIMF_PILOT_ACCESS_TEAM` absent = layer off; one of
 * them only, or a malformed value = the Worker answers 503 (never "off by mistake").
 */

export interface AccessConfig {
  aud: string;
  team: string;
}

export type AccessSetting = AccessConfig | null | "invalid";

const TEAM_SHAPE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const AUD_SHAPE = /^[A-Za-z0-9_-]{16,256}$/;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_JWT_CHARS = 8192;
/** Clock tolerance on `exp` / `nbf`, in seconds. */
const LEEWAY_SECONDS = 30;
const JWKS_TTL_SECONDS = 600;
const JWKS_TIMEOUT_MS = 4000;

export function accessSetting(bindings: { AIMF_PILOT_ACCESS_AUD?: string; AIMF_PILOT_ACCESS_TEAM?: string } | null | undefined): AccessSetting {
  const aud = bindings?.AIMF_PILOT_ACCESS_AUD?.trim() ?? "";
  const team = bindings?.AIMF_PILOT_ACCESS_TEAM?.trim().toLowerCase() ?? "";
  if (aud === "" && team === "") return null;
  if (!AUD_SHAPE.test(aud) || !TEAM_SHAPE.test(team)) return "invalid";
  return { aud, team };
}

export const accessIssuer = (team: string) => `https://${team}.cloudflareaccess.com`;
export const accessCertsUrl = (team: string) => `${accessIssuer(team)}/cdn-cgi/access/certs`;

interface Jwk {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  alg?: string;
}

/** Per-isolate cache of the team keys (tests pass their own). */
export type JwksCache = Map<string, { keys: Jwk[]; until: number }>;
const defaultCache: JwksCache = new Map();

export interface AccessVerifyDeps {
  fetch?: typeof fetch;
  nowSeconds?: number;
  cache?: JwksCache;
}

export type AccessRefusal = "missing" | "malformed" | "unknown_key" | "signature" | "issuer" | "audience" | "expired" | "jwks";

function decodePart(part: string): unknown {
  const binary = atob(part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
}

function decodeBytes(part: string): Uint8Array {
  const binary = atob(part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function teamKeys(config: AccessConfig, deps: AccessVerifyDeps, now: number): Promise<Jwk[] | null> {
  const cache = deps.cache ?? defaultCache;
  const cached = cache.get(config.team);
  if (cached && cached.until > now) return cached.keys;
  try {
    const response = await (deps.fetch ?? fetch)(accessCertsUrl(config.team), {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(JWKS_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { keys?: unknown };
    const keys = Array.isArray(body?.keys) ? (body.keys as Jwk[]) : [];
    cache.set(config.team, { keys, until: now + JWKS_TTL_SECONDS });
    return keys;
  } catch {
    return null;
  }
}

/** Validates the Access JWT handed by Cloudflare. Never throws. */
export async function verifyAccessJwt(
  token: string | null,
  config: AccessConfig,
  deps: AccessVerifyDeps = {},
): Promise<{ ok: true } | { ok: false; reason: AccessRefusal }> {
  if (!token) return { ok: false, reason: "missing" };
  if (token.length > MAX_JWT_CHARS || !JWT_SHAPE.test(token)) return { ok: false, reason: "malformed" };
  const now = Math.floor(deps.nowSeconds ?? Date.now() / 1000);
  const [h, p, s] = token.split(".");
  let header: { alg?: unknown; kid?: unknown };
  let payload: { iss?: unknown; aud?: unknown; exp?: unknown; nbf?: unknown };
  let signature: Uint8Array;
  try {
    header = decodePart(h) as typeof header;
    payload = decodePart(p) as typeof payload;
    signature = decodeBytes(s);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (header?.alg !== "RS256" || typeof header.kid !== "string") return { ok: false, reason: "malformed" };

  const keys = await teamKeys(config, deps, now);
  if (!keys) return { ok: false, reason: "jwks" };
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === "RSA" && typeof k.n === "string" && typeof k.e === "string");
  if (!jwk) return { ok: false, reason: "unknown_key" };
  let valid = false;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature.slice(), new TextEncoder().encode(`${h}.${p}`));
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "signature" };

  if (payload?.iss !== accessIssuer(config.team)) return { ok: false, reason: "issuer" };
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(config.aud)) return { ok: false, reason: "audience" };
  if (typeof payload.exp !== "number" || payload.exp + LEEWAY_SECONDS <= now) return { ok: false, reason: "expired" };
  if (typeof payload.nbf === "number" && payload.nbf - LEEWAY_SECONDS > now) return { ok: false, reason: "expired" };
  return { ok: true };
}
