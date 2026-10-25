/**
 * Secret-free diagnosis of a failed account request, for development only.
 *
 * The screens show neutral messages and never the raw backend text. When a request fails, this tells
 * the developer WHICH kind of failure it was, so that the Auth logs of the project can be read at the
 * right time and in the right place:
 *
 *   network          the request got no HTTP answer at all (offline, DNS, blocked, gateway unreachable)
 *   service_refusal  the service answered with a 4xx: it refused the request (rate limit, sign-up closed,
 *                    address refused or not authorised, weak password, invalid key, ...)
 *   smtp             the service accepted the request but could not send the mail (HTTP 5xx and an
 *                    "error sending ... email" answer): a failure of the mail service configuration
 *   service_error    another 5xx: a failure on the service side that is not about mail
 *   unknown          anything else
 *
 * What is recorded: time, operation, category, HTTP status and the Supabase error code. Never the
 * message (it can contain an address), never the request (address, password), never a token or a link.
 * The record lives in memory only, in development builds, at window.__afmAuthDiagnostics.
 */
export type FailureCategory = "network" | "service_refusal" | "smtp" | "service_error" | "unknown";

export interface AuthDiagnostic {
  at: string;
  operation: string;
  category: FailureCategory;
  status: number | null;
  code: string;
}

const CODE = /^[a-z0-9_]{1,64}$/;
const SMTP_WORDS = /error sending|sending .{0,40}(e-?mail|mail)|smtp|mailer/i;
const NETWORK_WORDS = /failed to fetch|network ?error|load failed|fetch failed|timed? ?out/i;

/** Reads only the HTTP status, the Supabase error code and the shape of the message. */
export function diagnoseAuthError(
  error: unknown,
): Pick<AuthDiagnostic, "category" | "status" | "code"> {
  const e = (error ?? {}) as {
    status?: unknown;
    code?: unknown;
    name?: unknown;
    message?: unknown;
  };
  const status = typeof e.status === "number" && Number.isFinite(e.status) ? e.status : null;
  const code = typeof e.code === "string" && CODE.test(e.code) ? e.code : "";
  const message = typeof e.message === "string" ? e.message : "";
  const name = typeof e.name === "string" ? e.name : "";

  const noAnswer = status === null || status === 0;
  if (
    noAnswer &&
    (name === "AuthRetryableFetchError" || name === "TypeError" || NETWORK_WORDS.test(message))
  ) {
    return { category: "network", status: status ?? null, code };
  }
  if (status !== null && status >= 500) {
    // The mail failure of a sign-up is an HTTP 500 answered by the service, with a message about the mail.
    if (SMTP_WORDS.test(message)) return { category: "smtp", status, code };
    return { category: "service_error", status, code };
  }
  if (status !== null && status >= 400) return { category: "service_refusal", status, code };
  return { category: "unknown", status, code };
}

const MAX = 20;
type Holder = { __afmAuthDiagnostics?: AuthDiagnostic[] };

/** Keeps the last few diagnoses in memory (development builds only). Returns what was kept, or null. */
export function recordAuthDiagnostic(operation: string, error: unknown): AuthDiagnostic | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const entry: AuthDiagnostic = {
    at: new Date().toISOString(),
    operation: /^[A-Za-z]{1,32}$/.test(operation) ? operation : "other",
    ...diagnoseAuthError(error),
  };
  const holder = window as unknown as Holder;
  const list = (holder.__afmAuthDiagnostics ??= []);
  list.push(entry);
  if (list.length > MAX) list.splice(0, list.length - MAX);
  return entry;
}
