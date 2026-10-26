/**
 * Server-side check that an AI request comes from a signed-in member.
 *
 * The three paid routes (`/api/studio/generate`, `/api/voice/speak`, `/api/voice/transcribe`) call this
 * BEFORE reading the body and before any provider call. The session token the browser holds is sent as
 * `Authorization: Bearer <access token>` and is checked with the project's own authentication service
 * (`GET /auth/v1/user`, with the publishable key that is already public in `.env`). No secret key is
 * involved, and the token is never logged or echoed.
 *
 *  - no token, a malformed token, or a token the service refuses: 401, no provider call;
 *  - the service cannot be reached, answers an error, or the project address is not configured: 503
 *    (`auth_unavailable`). The check fails CLOSED: when it cannot tell who is calling, the answer is no.
 *
 * What this does not do: it does not cap what a signed-in member spends. Per-member quotas and a
 * spending ceiling need shared storage and belong to a later lot (docs/member-auth/LOT-STUDIO-GENERER.md).
 */

type Env = Record<string, string | undefined>;

export interface MemberAuthConfig {
  /** Project address, e.g. https://<ref>.supabase.co */
  url: string;
  /** Publishable key (public by nature). */
  key: string;
}

export type MemberCheck = { ok: true; userId: string } | { ok: false; response: Response };

export interface MemberCheckOptions {
  /** Defaults to the project address and key built into the app (`.env`). */
  config?: MemberAuthConfig | null;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** How long the authentication service gets to answer before the request is refused. */
export const SESSION_CHECK_TIMEOUT_MS = 4000;
const MAX_TOKEN_CHARS = 4096;
/** A JWT: three base64url parts. Anything else is refused without a network call. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;

function refuse(status: number, error: string, code: string, extra: Record<string, string> = {}) {
  return Response.json(
    { error, code },
    { status, headers: { "Cache-Control": "no-store", ...extra } },
  );
}

/** The project address and publishable key: what the build inlined, else the server environment. */
export function memberAuthConfig(env: Env = {}): MemberAuthConfig | null {
  const url = (
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
    env.SUPABASE_URL ??
    env.VITE_SUPABASE_URL
  )
    ?.trim()
    .replace(/\/+$/, "");
  const key = (
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    env.SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
  if (!url || !key || !/^https?:\/\/\S+$/.test(url)) return null;
  return { url, key };
}

/** The bearer token of a request, or `null` when it is missing or cannot be a session token. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  const match = header ? /^Bearer\s+(\S+)$/i.exec(header.trim()) : null;
  const token = match?.[1];
  if (!token || token.length > MAX_TOKEN_CHARS || !TOKEN_SHAPE.test(token)) return null;
  return token;
}

export async function verifyMemberSession(
  request: Request,
  options: MemberCheckOptions = {},
): Promise<MemberCheck> {
  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: refuse(401, "Sign in to use this feature.", "sign_in_required", {
        "WWW-Authenticate": "Bearer",
      }),
    };
  }

  const config =
    options.config === undefined
      ? memberAuthConfig(typeof process !== "undefined" ? process.env : {})
      : options.config;
  if (!config) {
    return {
      ok: false,
      response: refuse(503, "Sign-in check unavailable.", "auth_unavailable"),
    };
  }

  const unavailable = () => ({
    ok: false as const,
    response: refuse(503, "Sign-in check unavailable.", "auth_unavailable"),
  });

  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(`${config.url}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? SESSION_CHECK_TIMEOUT_MS),
    });
  } catch {
    return unavailable();
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      response: refuse(401, "Your session has expired. Sign in again.", "invalid_session", {
        "WWW-Authenticate": "Bearer",
      }),
    };
  }
  if (!response.ok) return unavailable();

  try {
    const user = (await response.json()) as { id?: unknown };
    if (typeof user?.id === "string" && user.id !== "") return { ok: true, userId: user.id };
  } catch {
    /* an unreadable answer is not a yes */
  }
  return unavailable();
}
