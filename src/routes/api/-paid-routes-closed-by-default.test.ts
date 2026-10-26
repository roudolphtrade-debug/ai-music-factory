import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The delivered state cannot spend: with no server configuration the three paid routes are paused.
// Every provider here is a fake (the AI gateway and the authentication service); the test set-up
// refuses any real host, so nothing paid can run even by mistake.
type Handler = (ctx: { request: Request }) => Promise<Response>;
type Loaded = { options: { server: { handlers: { POST: Handler } } } };
const routes = {
  generate: async () => (await import("./studio/generate")).Route as unknown as Loaded,
  speak: async () => (await import("./voice/speak")).Route as unknown as Loaded,
  transcribe: async () => (await import("./voice/transcribe")).Route as unknown as Loaded,
};
type Name = keyof typeof routes;
const NAMES = Object.keys(routes) as Name[];

const ENV_KEYS = ["LOVABLE_API_KEY", "AI_ROUTES_PAUSED"] as const;
const saved: Record<string, string | undefined> = {};
let provider: ReturnType<typeof vi.fn>;
let auth: ReturnType<typeof vi.fn>;
const ask = (fake: ReturnType<typeof vi.fn>, ...args: unknown[]) =>
  (fake as unknown as (...a: unknown[]) => unknown)(...args);

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  // A provider key IS present, a valid member IS signed in: only the pause stands in the way.
  process.env.LOVABLE_API_KEY = "test-key";
  delete process.env.AI_ROUTES_PAUSED;
  vi.resetModules();
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
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const TOKEN = "aaaaaaaa.bbbbbbbb.cccccccc";
const headers = { "sec-fetch-site": "same-origin", authorization: `Bearer ${TOKEN}` };
const memberRequest = (name: Name): Request => {
  if (name === "transcribe") {
    const form = new FormData();
    form.append("audio", new File([new Uint8Array(2048)], "r.webm", { type: "audio/webm" }));
    return new Request("http://app.test/api/x", { method: "POST", headers, body: form });
  }
  return new Request("http://app.test/api/x", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(name === "generate" ? { prompt: "a calm song" } : { text: "hello" }),
  });
};
async function run(name: Name) {
  return (await routes[name]()).options.server.handlers.POST({ request: memberRequest(name) });
}

describe.each(NAMES)("%s with no server configuration", (name) => {
  it("is paused: 503 ai_paused, and neither the provider nor the session service is called", async () => {
    const res = await run(name);
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("ai_paused");
    expect(provider).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["1", "true", "on", "yes", "", "maybe", "enabled", "2"])(
    "stays paused for the value %j",
    async (value) => {
      process.env.AI_ROUTES_PAUSED = value;
      const res = await run(name);
      expect(res.status).toBe(503);
      expect(provider).not.toHaveBeenCalled();
    },
  );

  it.each(["0", "false", "no", "off", " OFF "])(
    "opens only on the explicit value %j",
    async (value) => {
      process.env.AI_ROUTES_PAUSED = value;
      expect((await run(name)).status).toBe(200);
      expect(provider).toHaveBeenCalled();
    },
  );

  it("is closed again as soon as the variable disappears (read at each request)", async () => {
    process.env.AI_ROUTES_PAUSED = "0";
    expect((await run(name)).status).toBe(200);
    provider.mockClear();
    delete process.env.AI_ROUTES_PAUSED;
    expect((await run(name)).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("the paid routes are guarded in the source itself", () => {
  const root = process.cwd();
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  const sources = files(join(root, "src")).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f),
  );

  // It reads every source file: given room, so that a loaded machine cannot make it time out.
  it("only the three known routes talk to the AI gateway", { timeout: 30_000 }, () => {
    const talking = sources
      .filter((f) => readFileSync(f, "utf8").includes("ai.gateway.lovable.dev"))
      .map((f) => f.replace(root, "").replace(/\\/g, "/"))
      .sort();
    expect(talking).toEqual([
      "/src/routes/api/studio/generate.ts",
      "/src/routes/api/voice/speak.ts",
      "/src/routes/api/voice/transcribe.ts",
    ]);
  });

  it.each([
    "src/routes/api/studio/generate.ts",
    "src/routes/api/voice/speak.ts",
    "src/routes/api/voice/transcribe.ts",
  ])("%s calls the guard before it reads the provider key or fetches anything", (file) => {
    const code = readFileSync(join(root, file), "utf8");
    const guard = code.indexOf("await guardMemberRequest(");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(code.indexOf("process.env.LOVABLE_API_KEY"));
    expect(guard).toBeLessThan(code.indexOf("fetch("));
    expect(code).toMatch(/if \(blocked\) return blocked;/);
  });
});
