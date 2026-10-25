export const AUTH_PATHS = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  forgot: "/auth/forgot-password",
  reset: "/auth/reset-password",
  confirm: "/auth/confirm",
  welcome: "/welcome",
} as const;

/** Absolute URL of an app page, for the links inside emails. It must be in the project's allow-list. */
export function absoluteUrl(path: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${path}`;
}

export type AuthUrlOutcome =
  | { kind: "none" }
  | { kind: "error"; expired: boolean; code?: string }
  | { kind: "link"; type?: string };

function params(raw: string): URLSearchParams {
  return new URLSearchParams(raw.replace(/^[#?]/, ""));
}

/**
 * Reads what a confirmation or recovery link brought back: an error (the URL fragment for the
 * implicit flow, the query string otherwise), a session link, or nothing.
 */
export function readAuthUrlOutcome(loc: { hash: string; search: string } | null): AuthUrlOutcome {
  if (!loc) return { kind: "none" };
  for (const raw of [loc.hash, loc.search]) {
    const p = params(raw);
    const code = p.get("error_code") ?? undefined;
    if (p.get("error") || p.get("error_description") || code) {
      const description = p.get("error_description") ?? "";
      return {
        kind: "error",
        code,
        expired: code === "otp_expired" || /expired/i.test(description),
      };
    }
  }
  const hash = params(loc.hash);
  if (hash.get("access_token")) return { kind: "link", type: hash.get("type") ?? undefined };
  const query = params(loc.search);
  if (query.get("code") || query.get("token_hash")) {
    return { kind: "link", type: query.get("type") ?? undefined };
  }
  return { kind: "none" };
}

/** Only same-site paths are allowed as a post-login destination (no open redirect). */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return undefined;
  if (value.startsWith("/auth")) return undefined;
  return value;
}
