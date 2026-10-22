import { describe, expect, it } from "vitest";
import {
  AI_LIMITS,
  createAiGuard,
  readBodyLimited,
  readFormLimited,
  readJsonLimited,
  type AiRoute,
} from "./api-guard";

// Every test builds its own guard, clock and environment: no counter is shared between tests.
const T0 = 1_700_000_000_000;
type Env = Record<string, string | undefined>;

function setup(env: Env = {}) {
  let clock = T0;
  const guard = createAiGuard({ now: () => clock, env: () => env });
  return {
    env,
    at(ms: number) {
      clock = T0 + ms;
    },
    call(route: AiRoute, headers: Record<string, string> = {}) {
      return guard(
        new Request("http://app.test/api/x", {
          method: "POST",
          headers: { "sec-fetch-site": "same-origin", ...headers },
          body: "{}",
        }),
        route,
      );
    },
  };
}
type Harness = ReturnType<typeof setup>;

/** Sends one request at each offset (ms) and returns how many were refused, by index. */
function refusedAt(
  h: Harness,
  route: AiRoute,
  offsets: number[],
  headers?: () => Record<string, string>,
) {
  return offsets.map((ms) => {
    h.at(ms);
    return h.call(route, headers?.()) !== null;
  });
}
const every = (n: number, step: number, from = 0) =>
  Array.from({ length: n }, (_, i) => from + i * step);
const count = (flags: boolean[]) => flags.filter(Boolean).length;

describe("local safety net · 60 requests per route, per instance, sliding 60 s", () => {
  it("keeps the planned threshold at 60 over 60 s", () => {
    expect(AI_LIMITS.localRequestsPerWindow).toBe(60);
    expect(AI_LIMITS.windowMs).toBe(60_000);
  });

  it("scenario A: 40 users x 2 calls/min (1 generate + 1 speak) stay under the cap, 0 refusal in 3 min", () => {
    const h = setup();
    // 40 calls per route per minute, one every 1.5 s; speak interleaved 0.75 s after generate.
    const generate = refusedAt(h, "generate", every(120, 1500));
    const speak = refusedAt(h, "speak", every(120, 1500, 750));
    expect(count(generate)).toBe(0);
    expect(count(speak)).toBe(0);
  });

  it("at the threshold: the 60th request is accepted, the 61st in the window is refused", () => {
    const h = setup();
    expect(count(refusedAt(h, "speak", every(60, 1000)))).toBe(0); // t = 0 .. 59 000
    h.at(59_999);
    expect(h.call("speak")?.status).toBe(429);
  });

  it("at the boundary: an accepted request stops counting exactly 60 000 ms later", () => {
    const h = setup();
    refusedAt(h, "speak", every(60, 1000)); // oldest at t = 0
    h.at(59_999);
    expect(h.call("speak")).not.toBeNull();
    h.at(60_000);
    expect(h.call("speak")).toBeNull();
  });

  it("scenario B: 40 users x 2 calls/min on one route (80 in 60 s) → 60 accepted, 20 refused", () => {
    const h = setup();
    const flags = refusedAt(h, "speak", every(80, 750)); // t = 0 .. 59 250
    expect(count(flags)).toBe(20);
    expect(flags.slice(0, 60).some(Boolean)).toBe(false); // the first 60 pass
    expect(flags.slice(60).every(Boolean)).toBe(true); // the last 20 are refused
  });

  it("scenario B repeats: 25 % refused per cycle of 80 calls in steady state", () => {
    const h = setup();
    const flags = refusedAt(h, "speak", every(160, 750));
    expect(count(flags.slice(0, 80))).toBe(20);
    expect(count(flags.slice(80))).toBe(20);
  });

  it("does not count refused requests, so insisting does not extend the wait", () => {
    const h = setup();
    refusedAt(h, "generate", Array(60).fill(0)); // 60 accepted at t = 0
    const insisting = refusedAt(h, "generate", every(100, 500, 1000)); // refused until t = 50 500
    expect(insisting.every(Boolean)).toBe(true);
    h.at(59_999);
    expect(h.call("generate")).not.toBeNull();
    h.at(60_000); // the 60 accepted ones leave together; the 100 refused left no trace
    expect(count(refusedAt(h, "generate", Array(60).fill(60_000)))).toBe(0);
    expect(h.call("generate")).not.toBeNull();
  });

  it("keeps one independent counter per route", () => {
    const h = setup();
    refusedAt(h, "speak", Array(60).fill(0));
    expect(h.call("speak")?.status).toBe(429);
    expect(h.call("generate")).toBeNull();
    expect(h.call("transcribe")).toBeNull();
  });

  it("gives the seconds to wait in Retry-After and a code, never an address or a setting", async () => {
    const h = setup({ AI_ROUTES_PAUSED: "0" });
    const forged = { "x-forwarded-for": "203.0.113.7" };
    refusedAt(h, "speak", Array(60).fill(0), () => forged);
    h.at(10_000);
    const res = h.call("speak", forged)!;
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("50");
    const text = await res.text();
    expect(JSON.parse(text).code).toBe("rate_limited");
    expect(text).not.toMatch(/203\.0\.113\.7|forwarded|AI_ROUTES/i);
  });

  it("behaves the same for 40 users on one address and for 40 users on 40 addresses", () => {
    const sameAddress = setup();
    const distinct = setup();
    let i = 0;
    const a = refusedAt(sameAddress, "speak", every(80, 750), () => ({
      "x-forwarded-for": "198.51.100.1",
    }));
    const b = refusedAt(distinct, "speak", every(80, 750), () => ({
      "x-forwarded-for": `198.51.100.${(i++ % 40) + 1}`,
    }));
    expect(a).toEqual(b);
    expect(count(a)).toBe(20);
  });
});

describe("no caller identification", () => {
  it("has no per-address limit left", () => {
    expect("perAddressRequestsPerWindow" in AI_LIMITS).toBe(false);
  });

  it("ignores x-forwarded-for entirely, however it is forged", () => {
    const h = setup();
    let i = 0;
    const flags = refusedAt(h, "speak", Array(61).fill(0), () => ({
      "x-forwarded-for": `10.0.${i >> 8}.${i++ & 255}`,
    }));
    expect(count(flags)).toBe(1); // rotating the header did not buy a single extra request
  });

  it.each([
    ["no setting", {}],
    ["a leftover AI_GUARD_TRUSTED_IP_HEADER", { AI_GUARD_TRUSTED_IP_HEADER: "x-real-ip" }],
    ["that setting naming x-forwarded-for", { AI_GUARD_TRUSTED_IP_HEADER: "x-forwarded-for" }],
  ])("uses no header to tell callers apart, with %s", (_label, env) => {
    const headersFor = (address: string) => ({
      "x-real-ip": address,
      "cf-connecting-ip": address,
      "x-forwarded-for": address,
      forwarded: `for=${address}`,
    });
    // 80 calls from one address on one route: only the shared counter of 60 acts. A per-address cap
    // of 30 would have refused 50.
    const same = setup(env);
    const sameFlags = refusedAt(same, "speak", every(80, 750), () => headersFor("198.51.100.1"));
    expect(count(sameFlags)).toBe(20);
    // A different address on every call buys nothing extra.
    const rotating = setup(env);
    let i = 0;
    const flags = refusedAt(rotating, "speak", Array(61).fill(0), () =>
      headersFor(`10.1.${i >> 8}.${i++ & 255}`),
    );
    expect(count(flags)).toBe(1);
  });
});

describe("emergency pause", () => {
  const routes: AiRoute[] = ["generate", "speak", "transcribe"];

  it("is off by default and for falsy values", () => {
    for (const value of [undefined, "", "0", "false", "off", "no"]) {
      const h = setup({ AI_ROUTES_PAUSED: value });
      for (const route of routes) expect(h.call(route), `${value}/${route}`).toBeNull();
    }
  });

  it("answers 503 ai_paused on the three routes, whatever the case of the value", async () => {
    for (const value of ["1", "true", "TRUE", " yes ", "On"]) {
      const h = setup({ AI_ROUTES_PAUSED: value });
      for (const route of routes) {
        const res = h.call(route)!;
        expect(res.status, `${value}/${route}`).toBe(503);
        expect((await res.json()).code).toBe("ai_paused");
      }
    }
  });

  it("is read at each request and does not use up the counters while paused", () => {
    const h = setup({ AI_ROUTES_PAUSED: "1" });
    for (let i = 0; i < 100; i++) expect(h.call("speak")?.status).toBe(503);
    h.env.AI_ROUTES_PAUSED = "0";
    expect(count(refusedAt(h, "speak", Array(60).fill(0)))).toBe(0);
    expect(h.call("speak")?.status).toBe(429);
  });

  it("is answered after the origin check, so an outside caller learns nothing", () => {
    const h = setup({ AI_ROUTES_PAUSED: "1" });
    const res = createAiGuard({ env: () => h.env })(
      new Request("http://app.test/api/x", { method: "POST" }),
      "speak",
    );
    expect(res?.status).toBe(403);
  });
});

describe("origin check (kept; not sufficient against a scripted client)", () => {
  it("refuses a request without Origin or Sec-Fetch-Site, and does not count it", () => {
    const h = setup();
    const guard = createAiGuard({ now: () => T0, env: () => ({}) });
    for (let i = 0; i < 100; i++) {
      expect(guard(new Request("http://app.test/x", { method: "POST" }), "speak")?.status).toBe(
        403,
      );
    }
    expect(h.call("speak")).toBeNull();
  });

  it("accepts a same-host Origin and refuses a foreign one", () => {
    const guard = createAiGuard({ now: () => T0, env: () => ({}) });
    const make = (origin: string) =>
      new Request("http://app.test/x", { method: "POST", headers: { host: "app.test", origin } });
    expect(guard(make("http://app.test"), "speak")).toBeNull();
    expect(guard(make("http://evil.test"), "speak")?.status).toBe(403);
  });
});

describe("bounded body reading", () => {
  const post = (body: BodyInit | ReadableStream, headers: Record<string, string> = {}) =>
    new Request("http://app.test/x", {
      method: "POST",
      headers,
      body,
      duplex: "half",
    } as RequestInit);

  it("refuses on Content-Length alone, before reading a single byte", async () => {
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(10));
      },
    });
    const request = post(stream, { "content-length": "9000" });
    expect(await readBodyLimited(request, 8192)).toBeNull();
    // Never locked by a reader, never consumed.
    expect(request.bodyUsed).toBe(false);
    expect(request.body?.locked).toBe(false);
    await request.body?.cancel(); // release the test stream
  });

  it("cuts a body without Content-Length as soon as it exceeds the cap", async () => {
    let chunks = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (cancelled) return;
        chunks++;
        controller.enqueue(new Uint8Array(4096));
      },
      cancel() {
        cancelled = true;
      },
    });
    expect(await readBodyLimited(post(stream), 8192)).toBeNull();
    expect(cancelled).toBe(true);
    expect(chunks).toBeLessThan(10); // it did not drain an endless stream
  });

  it("accepts a JSON body of exactly 8 KB and refuses one byte more", async () => {
    const pad = (n: number) => JSON.stringify({ p: "x".repeat(n - 8) }); // {"p":""} is 8 bytes
    const exact = pad(AI_LIMITS.jsonBytes);
    expect(new TextEncoder().encode(exact).length).toBe(8192);
    const ok = await readJsonLimited(post(exact));
    expect(ok.ok).toBe(true);
    const over = await readJsonLimited(post(pad(AI_LIMITS.jsonBytes + 1)));
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.response.status).toBe(413);
      expect((await over.response.json()).code).toBe("too_large");
    }
  });

  it("answers 400 for invalid or empty JSON", async () => {
    for (const body of ["{nope", ""]) {
      const res = await readJsonLimited(post(body));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.response.status).toBe(400);
    }
  });

  it("parses multipart under the audio cap and refuses above cap + framing", async () => {
    const form = new FormData();
    form.append("audio", new File([new Uint8Array(2048)], "r.webm", { type: "audio/webm" }));
    const ok = await readFormLimited(post(form));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect((ok.form.get("audio") as File).size).toBe(2048);

    // Over cap + 64 KB of framing, declared up front: refused without reading the body.
    const declared = String(AI_LIMITS.audioBytes + 64 * 1024 + 1);
    const over = await readFormLimited(post(form, { "content-length": declared }));
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.response.status).toBe(413);
  });

  it("answers 400 for a non multipart body", async () => {
    const res = await readFormLimited(post("hello", { "content-type": "text/plain" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(400);
  });

  // A body built chunk by chunk by the test: it has no Content-Length and never ends by itself
  // (it stops at 10 MB only so that a missing cut-off cannot run away with memory).
  const CHUNK = 64 * 1024;
  const MULTIPART_CAP = AI_LIMITS.audioBytes + 64 * 1024;
  function endless(headers: Record<string, string> = {}, chunkSize = CHUNK) {
    const stats = { pulls: 0, bytes: 0, cancelled: false };
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (stats.cancelled) return;
          if (stats.bytes >= 10 * 1024 * 1024) return controller.close();
          stats.pulls++;
          stats.bytes += chunkSize;
          controller.enqueue(new Uint8Array(chunkSize));
        },
        cancel() {
          stats.cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const request = post(stream, { "content-type": "multipart/form-data; boundary=x", ...headers });
    return { request, stats };
  }
  async function expectTooLarge(res: { ok: boolean; response?: Response }) {
    expect(res.ok).toBe(false);
    expect(res.response?.status).toBe(413);
    expect((await res.response!.json()).code).toBe("too_large");
  }

  it("cuts an oversize multipart that has no Content-Length: 413, stream cancelled", async () => {
    const { request, stats } = endless();
    expect(request.headers.get("content-length")).toBeNull();
    await expectTooLarge(await readFormLimited(request));
    expect(stats.cancelled).toBe(true);
    // It read up to the cap and stopped at the chunk that crossed it: nothing like 400 chunks.
    expect(stats.bytes).toBeGreaterThan(MULTIPART_CAP);
    expect(stats.bytes).toBeLessThanOrEqual(MULTIPART_CAP + 2 * CHUNK);
  });

  it("cuts a single chunk larger than the cap and cancels the stream", async () => {
    const { request, stats } = endless({}, MULTIPART_CAP + 1);
    await expectTooLarge(await readFormLimited(request));
    expect(stats.cancelled).toBe(true);
    expect(stats.pulls).toBeLessThanOrEqual(2);
  });

  // Number(value) is NaN, or not over the cap: the header cannot be used to skip the cut-off.
  it.each(["abc", "", " ", "-5", "1e3", "0x10", "12abc", "NaN", "null"])(
    "a non numeric or small Content-Length (%j) does not skip the cut-off",
    async (value) => {
      const { request, stats } = endless({ "content-length": value });
      await expectTooLarge(await readFormLimited(request));
      expect(stats.cancelled).toBe(true);
      expect(stats.bytes).toBeLessThanOrEqual(MULTIPART_CAP + 2 * CHUNK);
    },
  );

  it.each(["abc", "NaN"])("the same holds for JSON (Content-Length %j)", async (value) => {
    const { request, stats } = endless({ "content-length": value }, 1024);
    const res = await readJsonLimited(request);
    await expectTooLarge(res.ok ? { ok: true } : res);
    expect(stats.cancelled).toBe(true);
    expect(stats.bytes).toBeLessThanOrEqual(AI_LIMITS.jsonBytes + 2 * 1024);
  });

  // A declared length over the cap (even in a form Number() reads oddly) is refused unread.
  it.each(["6356993", "1e9", "Infinity", "9999999999999999999999"])(
    "a declared Content-Length over the cap (%j) is refused without reading",
    async (value) => {
      const { request, stats } = endless({ "content-length": value });
      await expectTooLarge(await readFormLimited(request));
      expect(request.bodyUsed).toBe(false);
      expect(request.body?.locked).toBe(false);
      await request.body?.cancel(); // release the test stream
      expect(stats.bytes).toBeLessThanOrEqual(2 * CHUNK); // at most what the runtime read ahead
    },
  );

  it("still parses a small legitimate multipart whose Content-Length is not a number", async () => {
    const enc = new TextEncoder();
    const head = enc.encode(
      '--B\r\nContent-Disposition: form-data; name="audio"; filename="r.webm"\r\nContent-Type: audio/webm\r\n\r\n',
    );
    const tail = enc.encode("\r\n--B--\r\n");
    const bytes = new Uint8Array(head.length + 2048 + tail.length);
    bytes.set(head);
    bytes.fill(7, head.length, head.length + 2048);
    bytes.set(tail, head.length + 2048);
    const res = await readFormLimited(
      post(bytes, { "content-type": "multipart/form-data; boundary=B", "content-length": "abc" }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect((res.form.get("audio") as File).size).toBe(2048);
  });
});
