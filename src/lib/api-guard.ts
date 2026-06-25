/**
 * Lightweight abuse guard for the AI gateway endpoints.
 *
 * These routes spend server-side AI credits, so we block obvious anonymous
 * abuse without requiring a full auth system:
 *  - Same-origin check: the request must originate from our own app
 *    (browser `fetch` sends `Origin` / `Sec-Fetch-Site` headers; a raw `curl`
 *    hit from the public internet does not).
 *  - In-memory sliding-window rate limit per client IP.
 *
 * Note: error responses never leak upstream gateway internals — callers only
 * ever receive a sanitised message.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

function sameOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  // Browser same-origin requests always carry one of these signals.
  if (fetchSite === "same-origin" || fetchSite === "none") return true;
  if (origin && host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  // No Origin and no Sec-Fetch-Site → almost certainly a scripted external call.
  return false;
}

/**
 * Returns a `Response` to short-circuit the handler when the request is
 * rejected, or `null` when it is allowed to proceed.
 */
export function guardAiRequest(request: Request): Response | null {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const ip = clientIp(request);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return Response.json(
      { error: "Too many requests, slow down." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return null;
}
