import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client for the member backend (Supabase project aimf-dev).
 *
 * Only two public values are read, both from the environment at build time:
 *   VITE_SUPABASE_URL              project URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  publishable key (safe in the browser; data is protected by RLS)
 * No secret key and no SMTP credential ever belongs in this repository or in the browser. When
 * either value is missing the app keeps working and simply offers no sign-in.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

export const isAuthConfigured = Boolean(url && key && /^https?:\/\/\S+$/.test(url));

/** Where the browser client keeps the session (supabase-js `storageKey`). */
export const AUTH_STORAGE_KEY = "afm-auth";

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;
const readyListeners = new Set<(sb: SupabaseClient) => void>();

/**
 * The browser client, loaded on demand: supabase-js is about 57 KB gzipped, which visitors who only
 * browse and listen should not download. Resolves to `null` when the backend is not configured or
 * on the server.
 */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!isAuthConfigured || typeof window === "undefined") return Promise.resolve(null);
  // The link a member opens from an email carries the outcome in the URL. Keep a copy before the
  // client reads and cleans it, so the confirmation page can tell expired from valid.
  takeAuthUrlSnapshot();
  loading ??= import("@supabase/supabase-js").then(({ createClient }) => {
    client = createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Implicit flow: sessions live in the browser and a link also works when opened on another
        // device, which a PKCE link does not. Private data is protected by RLS, not by the page.
        flowType: "implicit",
        storageKey: AUTH_STORAGE_KEY,
      },
    });
    for (const listener of [...readyListeners]) listener(client);
    return client;
  });
  return loading;
}

let settings: Promise<unknown> | null = null;

/**
 * The project's public sign-in settings (GET /auth/v1/settings, with the publishable key): which
 * providers are switched on. Resolves to `null` on any failure, so that nothing is shown on a doubt.
 */
export function loadAuthSettings(): Promise<unknown> {
  if (!isAuthConfigured || typeof window === "undefined") return Promise.resolve(null);
  settings ??= fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key! },
    signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(6000) : undefined,
  })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)
    .then((value) => {
      if (value === null) settings = null; // retry on the next screen
      return value;
    });
  return settings;
}

/** Calls back with the client as soon as it exists (now, if it already does). Returns a way to stop. */
export function whenSupabaseReady(listener: (sb: SupabaseClient) => void): () => void {
  if (client) listener(client);
  else readyListeners.add(listener);
  return () => void readyListeners.delete(listener);
}

/**
 * Whether the client must start with the page: a stored session to restore, or an email link
 * (confirmation, recovery, expired) in the address. Otherwise it waits until an account page or
 * a sign-in actually needs it.
 */
export function authNeededAtStart(): boolean {
  if (!isAuthConfigured || typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(AUTH_STORAGE_KEY)) return true;
  } catch {
    // Storage blocked: no session can be restored.
  }
  const { hash, search } = window.location;
  return /access_token|refresh_token|error_code|error_description|type=(signup|recovery|magiclink|invite|email_change)|[?&]code=/.test(
    hash + search,
  );
}

export interface AuthUrlSnapshot {
  path: string;
  hash: string;
  search: string;
}
let snapshot: AuthUrlSnapshot | null = null;

/** Records the URL the page was first opened with (once). Also done when this module loads. */
export function takeAuthUrlSnapshot(): AuthUrlSnapshot | null {
  if (typeof window === "undefined") return null;
  snapshot ??= {
    path: window.location.pathname,
    hash: window.location.hash,
    search: window.location.search,
  };
  return snapshot;
}

/** Returns the first-load URL once, and only if it was the given page; later calls get `null`. */
export function consumeAuthUrlSnapshot(path: string): AuthUrlSnapshot | null {
  const taken = takeAuthUrlSnapshot();
  if (!taken) return null;
  snapshot = { path: "", hash: "", search: "" };
  return taken.path === path ? taken : null;
}

takeAuthUrlSnapshot();
