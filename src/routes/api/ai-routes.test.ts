import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_LIMITS } from "@/lib/ai-limits";

// The three handlers run for real, with a synthetic Request and a mocked `fetch`: no network and no
// AI credit is ever used. Modules are reloaded per test so the guard counters start from zero.
type Handler = (ctx: { request: Request }) => Promise<Response>;
type Loaded = { options: { server: { handlers: { POST: Handler } } } };
const routes = {
  generate: async () => (await import("./studio/generate")).Route as unknown as Loaded,
  speak: async () => (await import("./voice/speak")).Route as unknown as Loaded,
  transcribe: async () => (await import("./voice/transcribe")).Route as unknown as Loaded,
};
async function handler(name: keyof typeof routes) {
  return (await routes[name]()).options.server.handlers.POST;
}

const ENV_KEYS = ["LOVABLE_API_KEY", "AI_ROUTES_PAUSED"] as const;
const savedEnv: Record<string, string | undefined> = {};
let upstream: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.LOVABLE_API_KEY = "test-key";
  delete process.env.AI_ROUTES_PAUSED;
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] }); // frozen clock: the 60 s window never moves under a test
  vi.setSystemTime(1_700_000_000_000);
  vi.spyOn(console, "error").mockImplementation(() => {});
  upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

const same = { "sec-fetch-site": "same-origin" };
function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://app.test/api/x", {
    method: "POST",
    headers: { ...same, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
function audioRequest(bytes: number, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.append("audio", new File([new Uint8Array(bytes)], "r.webm", { type: "audio/webm" }));
  return new Request("http://app.test/api/x", {
    method: "POST",
    headers: { ...same, ...headers },
    body: form,
  });
}
const mp3 = () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });
const fail = (status: number) => new Response("upstream detail", { status });
const sentJson = (call: number) =>
  JSON.parse((upstream.mock.calls[call][1] as RequestInit).body as string);
const urlOf = (call: number) => String(upstream.mock.calls[call][0]);

describe("POST /api/voice/speak", () => {
  it("cuts the text read aloud to 800 characters", async () => {
    upstream.mockResolvedValue(mp3());
    const res = await (
      await handler("speak")
    )({ request: jsonRequest({ text: "a".repeat(1000) }) });
    expect(res.status).toBe(200);
    expect(sentJson(0).input).toHaveLength(AI_LIMITS.speechChars);
    expect(AI_LIMITS.speechChars).toBe(800);
  });

  it("falls back to the default voice for an unknown or non-string voice", async () => {
    upstream.mockImplementation(async () => mp3());
    const post = await handler("speak");
    await post({ request: jsonRequest({ text: "hi", voice: "constructor" }) });
    await post({ request: jsonRequest({ text: "hi", voice: ["ash"] }) });
    await post({ request: jsonRequest({ text: "hi", voice: "ash" }) });
    expect([0, 1, 2].map((i) => sentJson(i).voice)).toEqual(["sage", "sage", "ash"]);
  });

  it("answers 400 without calling upstream when there is no usable text", async () => {
    const post = await handler("speak");
    for (const body of [{}, { text: "   " }, { text: 42 }, "{not json"]) {
      expect((await post({ request: jsonRequest(body) })).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it("keeps the upstream 402 and 429, and maps anything else to 502", async () => {
    const post = await handler("speak");
    const statuses: number[] = [];
    for (const status of [402, 429, 500]) {
      upstream.mockResolvedValueOnce(fail(status));
      statuses.push((await post({ request: jsonRequest({ text: "hi" }) })).status);
    }
    expect(statuses).toEqual([402, 429, 502]);
  });

  it("refuses a JSON body over 8 KB before any upstream call", async () => {
    const post = await handler("speak");
    const big = JSON.stringify({ text: "x".repeat(AI_LIMITS.jsonBytes) });
    const res = await post({ request: jsonRequest(big) });
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe("too_large");
    const declared = await post({
      request: jsonRequest({ text: "hi" }, { "content-length": "9000" }),
    });
    expect(declared.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("accepts 60 requests per window, refuses the 61st with 429 and no upstream call", async () => {
    upstream.mockImplementation(async () => mp3());
    const post = await handler("speak");
    for (let i = 0; i < 60; i++) {
      expect((await post({ request: jsonRequest({ text: "hi" }) })).status).toBe(200);
    }
    const res = await post({ request: jsonRequest({ text: "hi" }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(upstream).toHaveBeenCalledTimes(60);
    // The other routes keep their own counter.
    upstream.mockImplementation(async (url: string) =>
      String(url).endsWith("/chat/completions")
        ? Response.json({ choices: [{ message: { content: "la la" } }] })
        : mp3(),
    );
    expect(
      (await (await handler("generate"))({ request: jsonRequest({ prompt: "p" }) })).status,
    ).toBe(200);
  });
});

describe("POST /api/studio/generate", () => {
  const chatThenSpeech = (lyrics: string) =>
    upstream.mockImplementation(async (url: string) =>
      String(url).endsWith("/chat/completions")
        ? Response.json({ choices: [{ message: { content: lyrics } }] })
        : mp3(),
    );

  it("caps the completion at 200 tokens and the prompt at 600 characters", async () => {
    chatThenSpeech("four\nlines\nof\nhook");
    const res = await (
      await handler("generate")
    )({
      request: jsonRequest({
        prompt: "p".repeat(2000),
        genre: "Pop",
        mood: "warm",
        voice: "Soprano",
      }),
    });
    expect(res.status).toBe(200);
    expect(urlOf(0)).toMatch(/\/chat\/completions$/);
    expect(sentJson(0).max_tokens).toBe(200);
    const brief: string = sentJson(0).messages[1].content;
    expect(brief.length).toBeLessThan(700);
    expect(brief).toContain("p".repeat(600));
    expect(brief).not.toContain("p".repeat(601));
    expect(sentJson(1).voice).toBe("shimmer");
  });

  it("sings and returns at most 600 characters of lyrics, the same text in both", async () => {
    chatThenSpeech("é".repeat(2000));
    const res = await (await handler("generate"))({ request: jsonRequest({ prompt: "p" }) });
    expect(sentJson(1).input).toHaveLength(AI_LIMITS.lyricsChars);
    const header = Buffer.from(res.headers.get("X-Lyrics")!, "base64").toString("utf-8");
    expect(header).toBe(sentJson(1).input);
    expect(AI_LIMITS.lyricsChars).toBe(600);
  });

  it("falls back to the prompt when the model returns nothing", async () => {
    chatThenSpeech("   ");
    await (
      await handler("generate")
    )({ request: jsonRequest({ prompt: "my brief" }) });
    expect(sentJson(1).input).toBe("my brief");
  });

  it("does not crash on non-string genre, mood or voice", async () => {
    chatThenSpeech("hook");
    const res = await (
      await handler("generate")
    )({
      request: jsonRequest({ prompt: "p", genre: 5, mood: {}, voice: "__proto__" }),
    });
    expect(res.status).toBe(200);
    expect(sentJson(0).messages[1].content).toBe("Genre: Pop. Mood: warm. Brief: p");
    expect(sentJson(1).voice).toBe("sage");
  });

  it("keeps the upstream 402 and 429 from either step, and maps anything else to 502", async () => {
    const post = await handler("generate");
    const statuses: number[] = [];
    for (const status of [402, 429, 500]) {
      upstream.mockReset().mockResolvedValueOnce(fail(status));
      statuses.push((await post({ request: jsonRequest({ prompt: "p" }) })).status); // chat step
    }
    for (const status of [402, 429, 500]) {
      upstream
        .mockReset()
        .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "hook" } }] }))
        .mockResolvedValueOnce(fail(status));
      statuses.push((await post({ request: jsonRequest({ prompt: "p" }) })).status); // speech step
    }
    expect(statuses).toEqual([402, 429, 502, 402, 429, 502]);
  });

  it("answers 400 without a prompt and 413 over 8 KB, with no upstream call", async () => {
    const post = await handler("generate");
    expect((await post({ request: jsonRequest({ prompt: "  " }) })).status).toBe(400);
    const big = JSON.stringify({ prompt: "x".repeat(AI_LIMITS.jsonBytes) });
    expect((await post({ request: jsonRequest(big) })).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe("POST /api/voice/transcribe", () => {
  it("accepts a recording of exactly 6 MB and refuses one byte more", async () => {
    upstream.mockImplementation(async () => Response.json({ text: "hello" }));
    const post = await handler("transcribe");
    const ok = await post({ request: audioRequest(AI_LIMITS.audioBytes) });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ text: "hello" });
    expect(upstream).toHaveBeenCalledTimes(1);

    const over = await post({ request: audioRequest(AI_LIMITS.audioBytes + 1) });
    expect(over.status).toBe(413);
    expect((await over.json()).code).toBe("too_large");
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("refuses on the declared Content-Length before reading the body", async () => {
    const declared = String(AI_LIMITS.audioBytes + 64 * 1024 + 1);
    const res = await (
      await handler("transcribe")
    )({ request: audioRequest(2048, { "content-length": declared }) });
    expect(res.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("answers 400 for a missing or too short recording and for a non multipart body", async () => {
    const post = await handler("transcribe");
    expect((await post({ request: audioRequest(100) })).status).toBe(400);
    expect((await post({ request: jsonRequest({}) })).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("keeps the upstream 402 and 429, and maps anything else to 502", async () => {
    const post = await handler("transcribe");
    const statuses: number[] = [];
    for (const status of [402, 429, 500]) {
      upstream.mockResolvedValueOnce(fail(status));
      statuses.push((await post({ request: audioRequest(2048) })).status);
    }
    expect(statuses).toEqual([402, 429, 502]);
  });
});

describe("emergency pause on the three routes", () => {
  const requests = {
    generate: () => jsonRequest({ prompt: "p" }),
    speak: () => jsonRequest({ text: "hi" }),
    transcribe: () => audioRequest(2048),
  };

  it("is off by default: nothing is paused without the variable", async () => {
    upstream.mockImplementation(async (url: string) =>
      String(url).endsWith("/chat/completions") ? Response.json({ choices: [] }) : mp3(),
    );
    for (const name of ["generate", "speak"] as const) {
      expect((await (await handler(name))({ request: requests[name]() })).status).toBe(200);
    }
  });

  it("answers 503 ai_paused with no upstream call, then resumes when the variable is cleared", async () => {
    process.env.AI_ROUTES_PAUSED = "true";
    for (const name of ["generate", "speak", "transcribe"] as const) {
      const res = await (await handler(name))({ request: requests[name]() });
      expect(res.status, name).toBe(503);
      expect((await res.json()).code).toBe("ai_paused");
    }
    expect(upstream).not.toHaveBeenCalled();

    delete process.env.AI_ROUTES_PAUSED;
    upstream.mockResolvedValue(mp3());
    expect((await (await handler("speak"))({ request: requests.speak() })).status).toBe(200);
  });
});

describe("access without the API key or from outside", () => {
  it("keeps the 500 for a missing key and the 403 for a foreign caller", async () => {
    const post = await handler("speak");
    delete process.env.LOVABLE_API_KEY;
    expect((await post({ request: jsonRequest({ text: "hi" }) })).status).toBe(500);
    process.env.LOVABLE_API_KEY = "test-key";
    const foreign = new Request("http://app.test/api/x", { method: "POST", body: "{}" });
    expect((await post({ request: foreign })).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
});

// Bodies built chunk by chunk by the test: no Content-Length, and they would never end by themselves
// (they close at 10 MB only so that a missing cut-off cannot run away with memory).
function endlessRequest(contentType: string, headers: Record<string, string> = {}, chunk = 65536) {
  const stats = { bytes: 0, pulls: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (stats.cancelled) return;
        if (stats.bytes >= 10 * 1024 * 1024) return controller.close();
        stats.pulls++;
        stats.bytes += chunk;
        controller.enqueue(new Uint8Array(chunk));
      },
      cancel() {
        stats.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request("http://app.test/api/x", {
    method: "POST",
    headers: { ...same, "content-type": contentType, ...headers },
    body,
    duplex: "half",
  } as RequestInit);
  return { request, stats };
}
const MULTIPART = "multipart/form-data; boundary=x";
const MULTIPART_CAP = AI_LIMITS.audioBytes + 64 * 1024;

describe("oversize bodies without Content-Length", () => {
  it("transcribe: a multipart over the limit gets 413, the stream is cancelled, no provider call", async () => {
    const { request, stats } = endlessRequest(MULTIPART);
    expect(request.headers.get("content-length")).toBeNull();
    const res = await (await handler("transcribe"))({ request });
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe("too_large");
    expect(stats.cancelled).toBe(true);
    expect(stats.bytes).toBeGreaterThan(MULTIPART_CAP);
    expect(stats.bytes).toBeLessThanOrEqual(MULTIPART_CAP + 2 * 65536);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each(["generate", "speak"] as const)(
    "%s: a JSON body over 8 KB gets 413, the stream is cancelled, no provider call",
    async (name) => {
      const { request, stats } = endlessRequest("application/json", {}, 1024);
      const res = await (await handler(name))({ request });
      expect(res.status).toBe(413);
      expect((await res.json()).code).toBe("too_large");
      expect(stats.cancelled).toBe(true);
      expect(stats.bytes).toBeLessThanOrEqual(AI_LIMITS.jsonBytes + 2 * 1024);
      expect(upstream).not.toHaveBeenCalled();
    },
  );

  it.each(["abc", "", "NaN"])(
    "transcribe: a non numeric Content-Length (%j) does not skip the cut-off",
    async (value) => {
      const { request, stats } = endlessRequest(MULTIPART, { "content-length": value });
      const res = await (await handler("transcribe"))({ request });
      expect(res.status).toBe(413);
      expect(stats.cancelled).toBe(true);
      expect(upstream).not.toHaveBeenCalled();
    },
  );

  it.each(["abc", "NaN"])(
    "speak: a non numeric Content-Length (%j) does not skip the cut-off",
    async (value) => {
      const { request, stats } = endlessRequest(
        "application/json",
        { "content-length": value },
        1024,
      );
      const res = await (await handler("speak"))({ request });
      expect(res.status).toBe(413);
      expect(stats.cancelled).toBe(true);
      expect(upstream).not.toHaveBeenCalled();
    },
  );
});

describe("what counts against the local safety net", () => {
  it("a request admitted and then rejected for its size stays counted", async () => {
    upstream.mockResolvedValue(mp3());
    const post = await handler("speak");
    for (let i = 0; i < 60; i++) {
      const tooBig = await post({
        request: jsonRequest({ text: "hi" }, { "content-length": "9000" }),
      });
      expect(tooBig.status).toBe(413);
    }
    // 60 admitted-then-rejected requests used the whole window: a valid request is now refused.
    const refused = await post({ request: jsonRequest({ text: "hi" }) });
    expect(refused.status).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
    // They stop counting 60 s after they were admitted.
    vi.setSystemTime(1_700_000_000_000 + 60_000);
    expect((await post({ request: jsonRequest({ text: "hi" }) })).status).toBe(200);
  });

  it("a request refused by the limiter uses no quota", async () => {
    upstream.mockResolvedValue(mp3());
    const post = await handler("speak");
    for (let i = 0; i < 60; i++) await post({ request: jsonRequest({ text: "hi" }) });
    for (let i = 0; i < 100; i++) {
      expect((await post({ request: jsonRequest({ text: "hi" }) })).status).toBe(429);
    }
    // The 100 refusals left no trace: the whole window is free again as soon as the 60 expire.
    vi.setSystemTime(1_700_000_000_000 + 60_000);
    for (let i = 0; i < 60; i++) {
      expect((await post({ request: jsonRequest({ text: "hi" }) })).status, String(i)).toBe(200);
    }
    expect((await post({ request: jsonRequest({ text: "hi" }) })).status).toBe(429);
  });
});
