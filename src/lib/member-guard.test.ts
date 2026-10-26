import { describe, expect, it, vi } from "vitest";
import {
  bearerToken,
  memberAuthConfig,
  SESSION_CHECK_TIMEOUT_MS,
  verifyMemberSession,
} from "./member-guard";

// Fake authentication service only: the real project is never called (the test set-up refuses it).
const CONFIG = { url: "https://project.example.test", key: "sb_publishable_testkey" };
const TOKEN = "aaaaaaaa.bbbbbbbb.cccccccc";
const request = (headers: Record<string, string> = {}) =>
  new Request("http://app.test/api/x", { method: "POST", headers, body: "{}" });
const bearer = { authorization: `Bearer ${TOKEN}` };
const member = (body: unknown = { id: "user-1" }, status = 200) =>
  vi.fn(async (..._args: unknown[]) => Response.json(body, { status }));
const run = (req: Request, fetchFn: ReturnType<typeof member>, config = CONFIG) =>
  verifyMemberSession(req, { config, fetch: fetchFn as unknown as typeof fetch });

async function refusal(result: Awaited<ReturnType<typeof verifyMemberSession>>) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  return {
    status: result.response.status,
    body: await result.response.clone().json(),
    response: result.response,
  };
}

describe("bearerToken", () => {
  it("reads a well-formed token and nothing else", () => {
    expect(bearerToken(request(bearer))).toBe(TOKEN);
    expect(bearerToken(request({ authorization: `bearer ${TOKEN}` }))).toBe(TOKEN);
    for (const bad of [
      "",
      "Bearer",
      "Bearer not-a-token",
      "Bearer a.b",
      `Basic ${TOKEN}`,
      `Bearer ${TOKEN} extra`,
      `Bearer ${"a".repeat(5000)}.bbbbbbbb.cccccccc`,
      "Bearer aaaaaaaa.bbbbbbbb.cc cccccc",
    ]) {
      expect(bearerToken(request({ authorization: bad })), bad).toBeNull();
    }
    expect(bearerToken(request())).toBeNull();
  });
});

describe("verifyMemberSession", () => {
  it("accepts a token the authentication service recognises, asking it with the public key", async () => {
    const fetchFn = member({ id: "user-42", email: "ignored@example.test" });
    const result = await run(request(bearer), fetchFn);
    expect(result).toEqual({ ok: true, userId: "user-42" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://project.example.test/auth/v1/user");
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({ apikey: CONFIG.key, Authorization: `Bearer ${TOKEN}` });
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses without a token or with a malformed one, without any network call", async () => {
    const cases: Record<string, string>[] = [
      {},
      { authorization: "Bearer nope" },
      { authorization: "Basic x" },
    ];
    for (const headers of cases) {
      const fetchFn = member();
      const { status, body, response } = await refusal(await run(request(headers), fetchFn));
      expect(status).toBe(401);
      expect(body.code).toBe("sign_in_required");
      expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(fetchFn).not.toHaveBeenCalled();
    }
  });

  it("answers 401 invalid_session when the service refuses the token (401 or 403)", async () => {
    for (const upstream of [401, 403]) {
      const { status, body } = await refusal(await run(request(bearer), member({}, upstream)));
      expect(status).toBe(401);
      expect(body.code).toBe("invalid_session");
    }
  });

  it("fails closed with 503 when the service cannot say who is calling", async () => {
    const cases: [string, ReturnType<typeof member>][] = [
      ["server error", member({}, 500)],
      ["rate limited", member({}, 429)],
      ["bad gateway", member({}, 502)],
      ["no id in the answer", member({ email: "x@example.test" })],
      ["empty id", member({ id: "" })],
      ["not JSON", vi.fn(async () => new Response("<html>", { status: 200 }))],
      ["network error", vi.fn(async () => Promise.reject(new TypeError("fetch failed")))],
      ["timeout", vi.fn(async () => Promise.reject(new DOMException("timed out", "TimeoutError")))],
    ];
    for (const [label, fetchFn] of cases) {
      const { status, body } = await refusal(await run(request(bearer), fetchFn));
      expect(status, label).toBe(503);
      expect(body.code, label).toBe("auth_unavailable");
    }
  });

  it("fails closed with 503 when the project address or key is not configured", async () => {
    const fetchFn = member();
    const { status, body } = await refusal(
      await verifyMemberSession(request(bearer), {
        config: null,
        fetch: fetchFn as unknown as typeof fetch,
      }),
    );
    expect(status).toBe(503);
    expect(body.code).toBe("auth_unavailable");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("gives the service four seconds", () => {
    expect(SESSION_CHECK_TIMEOUT_MS).toBe(4000);
  });

  it("never echoes the token or the service's own words in a refusal", async () => {
    const upstream = Response.json({ message: "RAW SERVICE TEXT " + TOKEN }, { status: 401 });
    const { response } = await refusal(
      await run(request(bearer), vi.fn(async () => upstream) as ReturnType<typeof member>),
    );
    const text = await response.clone().text();
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain("RAW SERVICE TEXT");
  });
});

describe("memberAuthConfig", () => {
  it("uses the public values the build inlines from .env, which win over the server environment", () => {
    const built = {
      url: String(import.meta.env.VITE_SUPABASE_URL)
        .trim()
        .replace(/\/+$/, ""),
      key: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).trim(),
    };
    expect(memberAuthConfig({})).toEqual(built);
    expect(
      memberAuthConfig({
        SUPABASE_URL: "https://other.example.test",
        SUPABASE_PUBLISHABLE_KEY: "k",
      }),
    ).toEqual(built);
  });
});
