/**
 * P3a, the song through the Lovable relay (plan P3a section 5.4, T-A1 to T-A7, T-A6 being the separate local bench).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPilotRelay, createRelayLimiter, RELAY_HEADER_TIMEOUT_MS } from "./private-pilot-relay";
import { handlePilotServiceRequest } from "./private-pilot-service";
import { consumePrivateLyriaBatch } from "./private-pilot-worker";
import { PILOT_SCHEMA_SQL } from "./private-pilot-sql";
import type { PrivateLyriaBindings } from "./private-pilot-bindings";
import {
  APP_ORIGIN,
  BODY,
  fakeSupabase,
  MockBucket,
  MockQueue,
  openBindings,
  OWNER,
  OWNER_TOKEN,
  relayEnv,
  sha256HexNode,
  sqlite,
  sqliteD1,
  uuid,
} from "@/test/pilot-harness";

const describeSql = sqlite ? describe : describe.skip;
const T0 = 1_800_000_000;
let queue: MockQueue;
let bucket: MockBucket;
let bindings: PrivateLyriaBindings;

beforeEach(() => {
  queue = new MockQueue();
  bucket = new MockBucket();
  vi.stubGlobal("fetch", fakeSupabase({ [OWNER_TOKEN]: OWNER }).fetch);
  if (!sqlite) return;
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec(PILOT_SCHEMA_SQL);
  bindings = openBindings(sqliteD1(db), queue, bucket);
});
afterEach(() => vi.unstubAllGlobals());

const browserGet = (query: string, headers: Record<string, string> = {}, signal?: AbortSignal) =>
  new Request(`${APP_ORIGIN}/api/studio/lyria-private${query}`, {
    headers: { origin: APP_ORIGIN, authorization: `Bearer ${OWNER_TOKEN}`, ...headers },
    signal,
  });
const relayWith = (fetchImpl: typeof fetch, headerTimeoutMs?: number) => {
  const relay = createPilotRelay({ fetch: fetchImpl, nowSeconds: () => T0, processEnv: {}, headerTimeoutMs, limiter: createRelayLimiter(), log: () => {} });
  return (r: Request) => relay(r, relayEnv());
};
/** Upstream answer of a given shape (the Worker simulated at the HTTP level). */
const upstream = (status: number, headers: Record<string, string>, body: BodyInit | null = new Uint8Array([1, 2, 3])) =>
  relayWith((async () => new Response(body, { status, headers })) as typeof fetch);
const AUDIO_HEADERS = { "content-type": "audio/mpeg", "content-length": "3", "repr-digest": "sha-256=:AAAA:" };

/** A stored song in the real Worker, reached by the relay through the signed front. */
async function storedSong(bytes = 4096) {
  const relay = relayWith((async (i: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(i, init);
    seen.push(req.clone());
    return handlePilotServiceRequest(req, bindings, { now: () => T0, processEnv: {}, log: () => {} });
  }) as typeof fetch);
  const seen: Request[] = [];
  const post = new Request(`${APP_ORIGIN}/api/studio/lyria-private`, {
    method: "POST",
    headers: { origin: APP_ORIGIN, authorization: `Bearer ${OWNER_TOKEN}`, "idempotency-key": uuid(1), "content-type": "application/json" },
    body: JSON.stringify(BODY),
  });
  expect((await relay(post)).status).toBe(202);
  await consumePrivateLyriaBatch({ messages: queue.sent.splice(0).map((body) => ({ body, ack() {} })) }, bindings, { now: () => T0, processEnv: {}, mockAudioBytes: bytes });
  seen.length = 0;
  return { relay, seen };
}

describeSql("T-A the song through the relay", () => {
  it("T-A1 a Range from the browser is removed by the relay; the Worker answers 200 with the whole file and Accept-Ranges: none", async () => {
    const { relay, seen } = await storedSong(4096);
    const res = await relay(browserGet(`?job=${uuid(1)}&audio=1`, { range: "bytes=0-99", "if-range": "x", "if-none-match": "x", "accept-encoding": "gzip, br", cookie: "sb-access=1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("accept-ranges")).toBe("none");
    expect((await res.arrayBuffer()).byteLength).toBe(4096);
    const out = seen[0];
    for (const h of ["range", "if-range", "if-none-match", "cookie", "origin"]) expect(out.headers.get(h)).toBeNull();
    expect(out.headers.get("accept-encoding")).toBe("identity");
    expect([...out.headers.keys()].sort()).toEqual(
      ["accept-encoding", "authorization", "x-aimf-content-sha256", "x-aimf-key-id", "x-aimf-sig-version", "x-aimf-signature", "x-aimf-timestamp"].sort(),
    );
  });

  it.each([
    ["206", 206, AUDIO_HEADERS],
    ["200 with Content-Range", 200, { ...AUDIO_HEADERS, "content-range": "bytes 0-2/10" }],
    ["200 without Content-Length", 200, { "content-type": "audio/mpeg", "repr-digest": "sha-256=:AAAA:" }],
    ["200 compressed", 200, { ...AUDIO_HEADERS, "content-encoding": "gzip" }],
    ["200 of another type", 200, { ...AUDIO_HEADERS, "content-type": "text/html" }],
    ["200 without fingerprint", 200, { "content-type": "audio/mpeg", "content-length": "3" }],
  ])("T-A2 the upstream answers %s: 502 audio_unavailable", async (_label, status, headers) => {
    const res = await upstream(status, headers)(browserGet(`?job=${uuid(1)}&audio=1`));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("audio_unavailable");
  });

  it("T-A3 a stream cut at 50 %: the response the browser reads fails, it never gets a complete file", async () => {
    const half = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(50));
        c.error(new Error("connection reset"));
      },
    });
    const res = await upstream(200, { ...AUDIO_HEADERS, "content-length": "100" }, half)(browserGet(`?job=${uuid(1)}&audio=1`));
    expect(res.status).toBe(200); // headers were already relayed...
    await expect(res.arrayBuffer()).rejects.toThrow(); // ...but the body fails, so the component never plays it
  });

  it("T-A4 relayed headers: length, fingerprint, check mode, no-store no-transform; no Set-Cookie, no internal header", async () => {
    const res = await upstream(200, {
      ...AUDIO_HEADERS,
      "x-aimf-audio-check": "client",
      "content-disposition": 'inline; filename="aimf-lyria-x.mp3"',
      "set-cookie": "session=leak",
      "cf-ray": "internal",
      "x-internal-debug": "1",
      "cache-control": "public, max-age=3600",
    })(browserGet(`?job=${uuid(1)}&audio=1`));
    expect(Object.fromEntries(res.headers)).toEqual({
      "accept-ranges": "none",
      "cache-control": "private, no-store, no-transform",
      "content-disposition": 'inline; filename="aimf-lyria-x.mp3"',
      "content-length": "3",
      "content-type": "audio/mpeg",
      "repr-digest": "sha-256=:AAAA:",
      "x-aimf-audio-check": "client",
      "x-content-type-options": "nosniff",
    });
  });

  it("T-A4 the real Worker's fingerprint arrives unchanged and matches the bytes", async () => {
    const { relay } = await storedSong(3000);
    const res = await relay(browserGet(`?job=${uuid(1)}&audio=1`));
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(res.headers.get("repr-digest")).toBe(`sha-256=:${Buffer.from(sha256HexNode(bytes), "hex").toString("base64")}:`);
    expect(res.headers.get("x-aimf-audio-check")).toBe("client");
  });

  it(`T-A5 no headers from the Worker: 503 after the header timeout (${RELAY_HEADER_TIMEOUT_MS} ms in production), never stuck`, async () => {
    let aborted = false;
    const hang = (async (_i: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_ok, ko) =>
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          ko(new Error("aborted"));
        }),
      )) as typeof fetch;
    const started = Date.now();
    const res = await relayWith(hang, 50)(browserGet(`?job=${uuid(1)}&audio=1`));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("pilot_unavailable");
    expect(aborted).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("T-A5 the timer covers the headers only: a slow body after the headers is not cut", async () => {
    const slow = new ReadableStream<Uint8Array>({
      async pull(c) {
        await new Promise((r) => setTimeout(r, 120));
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.close();
      },
    });
    const res = await relayWith((async () => new Response(slow, { status: 200, headers: AUDIO_HEADERS })) as typeof fetch, 50)(browserGet(`?job=${uuid(1)}&audio=1`));
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("T-A7 the client cancels mid-stream: the upstream stream is cancelled", async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(c) {
        pulls++;
        c.enqueue(new Uint8Array(1024));
      },
      cancel,
    });
    const res = await upstream(200, { ...AUDIO_HEADERS, "content-length": String(1024 * 1024) }, endless)(browserGet(`?job=${uuid(1)}&audio=1`));
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel("tab closed");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(pulls).toBeLessThan(10); // nothing was read ahead into memory
  });

  it("T-A7 the client goes away before the headers: the upstream request is aborted", async () => {
    let aborted = false;
    const hang = (async (_i: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_ok, ko) =>
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          ko(new Error("aborted"));
        }),
      )) as typeof fetch;
    let asked!: () => void;
    const upstreamAsked = new Promise<void>((r) => (asked = r));
    const spied = (async (i: RequestInfo | URL, init?: RequestInit) => {
      asked();
      return hang(i, init);
    }) as typeof fetch;
    const client = new AbortController();
    const pending = relayWith(spied, 60_000)(browserGet(`?job=${uuid(1)}&audio=1`, {}, client.signal));
    await upstreamAsked; // the relay is waiting for the Worker's headers
    client.abort();
    expect((await pending).status).toBe(503);
    expect(aborted).toBe(true);
  });

  it("T-A7 a client gone before the relay even started waiting: aborted at once, not after the timeout", async () => {
    let aborted = false;
    const hang = (async (_i: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_ok, ko) => {
        if (init?.signal?.aborted) {
          aborted = true;
          return ko(new Error("aborted"));
        }
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          ko(new Error("aborted"));
        });
      })) as typeof fetch;
    const client = new AbortController();
    client.abort();
    const started = Date.now();
    expect((await relayWith(hang, 60_000)(browserGet(`?job=${uuid(1)}&audio=1`, {}, client.signal))).status).toBe(503);
    expect(aborted).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("JSON answers of the contract pass through with their status and code; no Set-Cookie", async () => {
    const res = await upstream(409, { "content-type": "application/json", "set-cookie": "x=1" }, JSON.stringify({ error: "x", code: "not_ready" }))(browserGet(`?job=${uuid(1)}&audio=1`));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not_ready");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
    for (const [status, headers] of [[302, { location: "https://evil.test/" }], [500, { "content-type": "application/json" }], [200, { "content-type": "text/html" }]] as const) {
      const r = await upstream(status, headers, status === 302 ? null : "{}")(browserGet(""));
      expect(r.status).toBe(503);
      expect(r.headers.get("location")).toBeNull();
    }
  });
});
