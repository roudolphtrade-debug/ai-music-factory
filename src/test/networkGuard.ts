/**
 * Test set-up: no test may reach a real provider.
 *
 * Every test file starts with `fetch` replaced by a version that refuses any request to a real host
 * (the AI gateway, the Supabase project, anything on the internet) and lets through only relative
 * addresses and reserved test hosts. A test that needs an answer installs its own fake with
 * `vi.stubGlobal("fetch", ...)`; one that forgets to does not spend a cent, it fails. The AI provider
 * key is also removed from the environment, so no test can pick up a real one by accident.
 */
const ALLOWED_HOST =
  /^(localhost|127\.0\.0\.1|\[::1\]|example\.com|example\.org|example\.net|[a-z0-9.-]+\.(test|invalid|example|localhost))$/i;

/** True when `host` is a real internet host that tests must never call. */
export function isRealNetworkHost(host: string): boolean {
  return host !== "" && !ALLOWED_HOST.test(host);
}

function hostOf(input: unknown): string {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : ((input as { url?: string } | null)?.url ?? "");
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? new URL(raw).hostname : "";
  } catch {
    return "";
  }
}

export class RealNetworkBlocked extends Error {
  constructor(host: string) {
    super(`Real network call blocked in tests (${host}). Stub fetch with a fake provider.`);
    this.name = "RealNetworkBlocked";
  }
}

const MARK = Symbol.for("afm.networkGuard");
type Guarded = typeof fetch & { [MARK]?: true };

const current = globalThis.fetch as Guarded | undefined;
if (current && !current[MARK]) {
  const real = current.bind(globalThis);
  const guarded: Guarded = ((input: RequestInfo | URL, init?: RequestInit) => {
    const host = hostOf(input);
    if (isRealNetworkHost(host)) return Promise.reject(new RealNetworkBlocked(host));
    return real(input, init);
  }) as Guarded;
  guarded[MARK] = true;
  globalThis.fetch = guarded;
}

delete process.env.LOVABLE_API_KEY;
