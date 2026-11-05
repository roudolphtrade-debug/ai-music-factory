/**
 * HTTP front of the DEDICATED pilot Worker, reached only by the Lovable relay (`private-pilot-relay.ts`), never by a
 * browser. One path, `/internal/v1/lyria-pilot`; anything else is 404 (the old public path included).
 *
 * Order of the checks, each refusal costing nothing beyond itself:
 *   1. path and method                         404 / 405
 *   2. pilot switch, emergency stop            503 (before any cryptography or input/output)
 *   3. service secrets and Access settings     503 pilot_unconfigured when absent, empty, too short or partial
 *   4. body size (8 KiB, declared or streamed)  413, before the signature is computed
 *   5. HMAC of the relay (L1)                   401 service_auth_failed: ONE body whatever the reason (no oracle)
 *   6. Cloudflare Access JWT (L0, optional)      401 service_auth_failed
 *   7. then the existing contract: Supabase session (re-verified here) = owner, D1 reservation keyed by the
 *      Idempotency-Key, queue, private bucket (`handleVerifiedPilotRequest`).
 *
 * Only the Authorization, Idempotency-Key and Content-Type headers of the signed request reach the contract, with
 * the exact bytes that were signed. Logs hold a reason code only: never a token, a signature, a secret or a body.
 */
import { readBodyLimited } from "@/lib/api-guard";
import { handleVerifiedPilotRequest, type PrivateLyriaDependencies } from "./private-demo-handler";
import { accessSetting, verifyAccessJwt, type JwksCache } from "./private-pilot-access";
import { aiRoutesPaused, pilotEnabled, type PrivateLyriaBindings } from "./private-pilot-bindings";
import {
  PILOT_DEFAULT_AUDIENCE,
  PILOT_INTERNAL_PATH,
  PILOT_KEY_IDS,
  PILOT_MAX_BODY_BYTES,
  usableSecret,
  verifyPilotSignature,
  type PilotKeyId,
} from "./private-pilot-hmac";

export interface PilotServiceDeps extends PrivateLyriaDependencies {
  /** Seconds since the epoch for the signature window (defaults to `now`, then the clock). */
  nowSeconds?: () => number;
  /** Network used to fetch the Access keys (L0 only). */
  accessFetch?: typeof fetch;
  jwksCache?: JwksCache;
  log?: (line: string) => void;
}

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function failure(status: number, code: string): Response {
  return Response.json({ error: "Private music generation unavailable.", code }, { status, headers: NO_STORE });
}

/** The single answer to any failed service proof. */
export const serviceAuthFailed = () => failure(401, "service_auth_failed");

/**
 * The signing secrets of this Worker, or `null` (503) when none is usable or one is set but unusable: a
 * half-configured rotation is a configuration error, never a reason to accept.
 */
export function serviceSecrets(bindings: PrivateLyriaBindings | null | undefined): Partial<Record<PilotKeyId, string>> | null {
  const raw: Record<PilotKeyId, string | undefined> = { k1: bindings?.AIMF_PILOT_HMAC_K1, k2: bindings?.AIMF_PILOT_HMAC_K2 };
  const secrets: Partial<Record<PilotKeyId, string>> = {};
  for (const id of PILOT_KEY_IDS) {
    const value = raw[id];
    if (value === undefined || value.trim() === "") continue;
    const secret = usableSecret(value);
    if (!secret) return null;
    secrets[id] = secret;
  }
  return Object.keys(secrets).length > 0 ? secrets : null;
}

export const serviceAudience = (bindings: PrivateLyriaBindings | null | undefined) =>
  bindings?.AIMF_PILOT_AUDIENCE?.trim() || PILOT_DEFAULT_AUDIENCE;

export async function handlePilotServiceRequest(
  request: Request,
  bindings: PrivateLyriaBindings | null | undefined,
  deps: PilotServiceDeps = {},
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== PILOT_INTERNAL_PATH) {
    return new Response("Not found", { status: 404, headers: NO_STORE });
  }
  if (request.method !== "POST" && request.method !== "GET") return failure(405, "method_not_allowed");
  if (!pilotEnabled(bindings)) return failure(503, "pilot_disabled");
  if (aiRoutesPaused(bindings, deps.processEnv)) return failure(503, "ai_paused");
  const secrets = serviceSecrets(bindings);
  const access = accessSetting(bindings);
  if (!secrets || access === "invalid") return failure(503, "pilot_unconfigured");

  const body = await readBodyLimited(request, PILOT_MAX_BODY_BYTES);
  if (body === null) return failure(413, "too_large");

  const log = deps.log ?? ((line: string) => console.warn(line));
  const refuse = (layer: "hmac" | "access", reason: string) => {
    log(JSON.stringify({ event: "aimf_pilot_service_auth", result: "refused", layer, reason }));
    return serviceAuthFailed();
  };
  const nowSeconds = (deps.nowSeconds ?? deps.now ?? (() => Date.now() / 1000))();
  const verdict = await verifyPilotSignature({
    method: request.method,
    search: url.search,
    headers: request.headers,
    body,
    audience: serviceAudience(bindings),
    secrets,
    nowSeconds,
  });
  if (!verdict.ok) return refuse("hmac", verdict.reason);
  if (access) {
    const checked = await verifyAccessJwt(request.headers.get("cf-access-jwt-assertion"), access, {
      fetch: deps.accessFetch,
      nowSeconds,
      cache: deps.jwksCache,
    });
    if (!checked.ok) return refuse("access", checked.reason);
  }

  const headers = new Headers();
  for (const name of ["authorization", "idempotency-key", "content-type"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const verified = new Request(url, {
    method: request.method,
    headers,
    body: request.method === "POST" ? body : undefined,
  });
  return handleVerifiedPilotRequest(verified, bindings, deps);
}
