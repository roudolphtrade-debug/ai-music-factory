import type { AuthKey } from "@/i18n/auth";
import { diagnoseAuthError } from "./diagnostics";

/** What went wrong, in terms the screens can act on. Raw backend messages are never shown. */
export type AuthFailureKind =
  | "credentials"
  | "not_confirmed"
  | "rate_limit"
  | "network"
  | "email_failed"
  | "service_error"
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
  email_failed: "errEmailSend",
  service_error: "errServiceDown",
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
  // The default mail service only writes to the project team: the mail cannot be sent, nothing to do with the network.
  email_address_not_authorized: "email_failed",
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
  // Network, mail and service failures are told apart by what the request got back, not by the class
  // of the error: auth-js also wraps HTTP 500 and 502 to 504 answers in "AuthRetryableFetchError".
  const kind = diagnoseAuthError(error).category;
  if (kind === "network") return failure("network"); // no HTTP answer at all
  if (kind === "smtp") return failure("email_failed"); // the service answered, the mail could not be sent
  if (kind === "service_error") return failure("service_error"); // the service answered with a failure
  if (e.status === 429) return failure("rate_limit");
  const message = typeof e.message === "string" ? e.message : "";
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
