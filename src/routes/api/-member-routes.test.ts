import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The three paid handlers run for real with a synthetic Request. `fetch` is replaced by a router with
// two fakes: the authentication service (GET .../auth/v1/user) and the AI provider (everything else).
// Nothing reaches a real host (the test set-up refuses it) and no AI credit is ever used.
type Handler = (ctx: { request: Request }) => Promise<Response>;
type Loaded = { options: { server: { handlers: { POST: Handler } } } };
const routes = {
  generate: async () => (await import("./studio/generate")).Route as unknown as Loaded,
  speak: async () => (await import("./voice/speak")).Route as unknown as Loaded,
  transcribe: async () => (await import("./voice/transcribe")).Route as unknown as Loaded,
};
type Name = keyof typeof routes;
const NAMES = Object.keys(routes) as Name[];
async function handler(name: Name) {
  return (await routes[name]()).options.server.handlers.POST;
}

const ENV_KEYS = ["LOVABLE_API_KEY", "AI_ROUTES_PAUSED"] as const;
const saved: Record<string, string | undefined> = {};
let provider: ReturnType<typeof vi.fn>;
let auth: ReturnType<typeof vi.fn>;
const ask = (fake: ReturnType<typeof vi.fn>, ...args: unknown[]) =>
  (fake as unknown as (...a: unknown[]) => unknown)(...args);

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.LOVABLE_API_KEY = "test-key";
  process.env.AI_ROUTES_PAUSED = "0"; // the routes are paused unless opened on purpose
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(1_700_000_000_000);
  vi.spyOn(console, "error").mockImplementation(() => {});
  provider = vi.fn(async (input: unknown) =>
    String(input).endsWith("/chat/completions")
      ? Response.json({ choices: [{ message: { content: "la la la" } }] })
      : new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
  );
  auth = vi.fn(async () => Response.json({ id: "user-1" }));
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown, init?: unknown) =>
      String(input).endsWith("/auth/v1/user") ? ask(auth, input, init) : ask(provider, input, init),
    ),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const TOKEN = "aaaaaaaa.bbbbbbbb.cccccccc";
const same = { "sec-fetch-site": "same-origin" };
const valid: Record<Name, () => Request> = {
  generate: () => post({ prompt: "a calm song" }, { ...same, authorization: `Bearer ${TOKEN}` }),
  speak: () => post({ text: "hello" }, { ...same, authorization: `Bearer ${TOKEN}` }),
  transcribe: () => {
    const form = new FormData();
    form.append("audio", new File([new Uint8Array(2048)], "r.webm", { type: "audio/webm" }));
    return new Request("http://app.test/api/x", {
      method: "POST",
      headers: { ...same, authorization: `Bearer ${TOKEN}` },
      body: form,
    });
  },
};
function post(body: unknown, headers: Record<string, string>) {
  return new Request("http://app.test/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
/** Any request that would be accepted, except for what the test changes. */
const without = (name: Name, headers: Record<string, string>) => {
  const base = valid[name]();
  const request = new Request(base.url, {
    method: "POST",
    headers: headers,
    body: base.body,
    // @ts-expect-error Node's fetch needs `duplex` for a streamed body
    duplex: "half",
  });
  return request;
};

describe.each(NAMES)("%s: a signed-in member only", (name) => {
  it("serves a request whose token the authentication service recognises", async () => {
    const res = await (await handler(name))({ request: valid[name]() });
    expect(res.status).toBe(200);
    expect(auth).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalled();
    // the session token goes to the authentication service only, never to the AI provider
    for (const call of provider.mock.calls) {
      expect(JSON.stringify(call[1] ?? {})).not.toContain(TOKEN);
    }
  });

  it("answers 401 without a token and never reads the body nor calls the provider", async () => {
    const request = post("{ this is not even json", { ...same });
    const res = await (await handler(name))({ request });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("sign_in_required");
    expect(auth).not.toHaveBeenCalled(); // no network call for a request with no token
    expect(provider).not.toHaveBeenCalled();
    expect(request.bodyUsed).toBe(false);
  });

  it("answers 401 for a malformed token without asking the service or the provider", async () => {
    const res = await (
      await handler(name)
    )({
      request: without(name, { ...same, authorization: "Bearer not-a-token" }),
    });
    expect(res.status).toBe(401);
    expect(auth).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("answers 401 invalid_session when the service refuses the token, with no provider call", async () => {
    auth.mockResolvedValue(Response.json({ msg: "invalid JWT" }, { status: 401 }));
    const res = await (await handler(name))({ request: valid[name]() });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("invalid_session");
    expect(provider).not.toHaveBeenCalled();
  });

  it("fails closed with 503 auth_unavailable when the service is down, with no provider call", async () => {
    for (const outage of [
      () => Promise.reject(new TypeError("fetch failed")),
      () => Promise.resolve(new Response("down", { status: 500 })),
      () => Promise.reject(new DOMException("timed out", "TimeoutError")),
    ]) {
      auth.mockImplementationOnce(outage);
      const res = await (await handler(name))({ request: valid[name]() });
      expect(res.status).toBe(503);
      expect((await res.json()).code).toBe("auth_unavailable");
    }
    expect(provider).not.toHaveBeenCalled();
  });

  it("keeps the manual pause ahead of the session check: 503 ai_paused, no call to anyone", async () => {
    process.env.AI_ROUTES_PAUSED = "1";
    const res = await (await handler(name))({ request: without(name, { ...same }) });
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("ai_paused");
    expect(auth).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("keeps the same-origin check ahead of the session check: 403, no call to anyone", async () => {
    const res = await (
      await handler(name)
    )({
      request: without(name, { authorization: `Bearer ${TOKEN}` }),
    });
    expect(res.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("the local limit counts members only", () => {
  it("calls without a session do not use up the window of those who have one", async () => {
    const post60 = await handler("speak");
    for (let i = 0; i < 70; i++) {
      const res = await post60({ request: post({ text: "hi" }, { ...same }) });
      expect(res.status).toBe(401);
    }
    const ok = await post60({ request: valid.speak() });
    expect(ok.status).toBe(200);
  });
});
