import { safeRedirect } from "./redirects";

/**
 * Where to bring the member back after signing in or signing up: a same-site path remembered in this
 * browser for 24 hours. It survives what the address cannot: the sign-up page, the e-mail
 * confirmation, the welcome page and the trip to Google and back. Only paths `safeRedirect` accepts are
 * stored or returned, and reading it never navigates anywhere by itself.
 *
 * Limit: it lives in this browser's storage, so a confirmation link opened on another device does not
 * find it (the member then lands on the home page as before).
 */
export const RETURN_TO_KEY = "afm-return-to";
export const RETURN_TO_TTL_MS = 24 * 60 * 60 * 1000;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function rememberReturnTo(path: string, now = Date.now()): void {
  const safe = safeRedirect(path);
  const storage = store();
  if (!safe || !storage) return;
  try {
    storage.setItem(RETURN_TO_KEY, JSON.stringify({ path: safe, at: now }));
  } catch {
    /* storage full or blocked: the member simply lands on the home page */
  }
}

/** The remembered path if it is still valid; an expired or invalid one is removed. */
export function peekReturnTo(now = Date.now()): string | undefined {
  const storage = store();
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(RETURN_TO_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as { path?: unknown; at?: unknown };
    const path = safeRedirect(value?.path);
    if (
      path &&
      typeof value.at === "number" &&
      now - value.at >= 0 &&
      now - value.at < RETURN_TO_TTL_MS
    ) {
      return path;
    }
    storage.removeItem(RETURN_TO_KEY);
  } catch {
    /* unreadable: ignored */
  }
  return undefined;
}

export function clearReturnTo(): void {
  try {
    store()?.removeItem(RETURN_TO_KEY);
  } catch {
    /* nothing to clear */
  }
}
