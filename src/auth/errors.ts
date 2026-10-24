import type { AuthKey } from "@/i18n/auth";

/** What went wrong, in terms the screens can act on. Raw backend messages are never shown. */
export type AuthFailureKind =
  | "credentials"
  | "not_confirmed"
  | "rate_limit"
  | "network"
  | "weak_password"
  | "same_password"
  | "signup_disabled"
  | "session"
  | "expired"
  | "invalid_email"
  | "handle_taken"
  | "unavailable"
  | "generic";

export interface AuthFailure {
  kind: AuthFailureKind;
  key: AuthKey;
}

const KEY_BY_KIND: Record<AuthFailureKind, AuthKey> = {
  credentials: "errCredentials",
  not_confirmed: "errNotConfirmed",
  rate_limit: "errRateLimit",
  network: "errNetwork",
  weak_password: "errPasswordWeak",
  same_password: "errSamePassword",
  signup_disabled: "errSignupDisabled",
  session: "errSession",
  expired: "expiredDesc",
  invalid_email: "errEmail",
  handle_taken: "errHandleTaken",
  unavailable: "unavailableDesc",
  generic: "errGeneric",
};

export const failure = (kind: AuthFailureKind): AuthFailure => ({ kind, key: KEY_BY_KIND[kind] });

const BY_CODE: Record<string, AuthFailureKind> = {
  invalid_credentials: "credentials",
  email_not_confirmed: "not_confirmed",
  over_request_rate_limit: "rate_limit",
  over_email_send_rate_limit: "rate_limit",
  over_sms_send_rate_limit: "rate_limit",
  weak_password: "weak_password",
  same_password: "same_password",
  signup_disabled: "signup_disabled",
  email_provider_disabled: "signup_disabled",
  session_expired: "session",
  session_not_found: "session",
  refresh_token_not_found: "session",
  refresh_token_already_used: "session",
  otp_expired: "expired",
  validation_failed: "invalid_email",
  email_address_invalid: "invalid_email",
};

/** Maps a supabase-js error (or anything thrown) to a failure, reading `code`, then `status`. */
export function classifyAuthError(error: unknown): AuthFailure {
  const e = (error ?? {}) as {
    code?: unknown;
    status?: unknown;
    name?: unknown;
    message?: unknown;
  };
  const code = typeof e.code === "string" ? e.code : undefined;
  if (code && BY_CODE[code]) return failure(BY_CODE[code]);
  // PostgREST: unique violation (a handle already used by another member).
  if (code === "23505") return failure("handle_taken");
  if (e.name === "AuthWeakPasswordError") return failure("weak_password");
  if (e.name === "AuthRetryableFetchError" || e.name === "TypeError") return failure("network");
  if (e.status === 429) return failure("rate_limit");
  const message = typeof e.message === "string" ? e.message : "";
  if (/failed to fetch|network ?error|load failed/i.test(message)) return failure("network");
  // Older servers answer with a message only.
  if (/invalid login credentials/i.test(message)) return failure("credentials");
  if (/email not confirmed/i.test(message)) return failure("not_confirmed");
  if (/expired/i.test(message)) return failure("expired");
  return failure("generic");
}

/** Codes meaning "this address already has an account": shown like a success, to avoid leaking it. */
export function isAlreadyRegistered(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "user_already_exists" || code === "email_exists";
}
