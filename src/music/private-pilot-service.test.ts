/**
 * P3a, security of the server-to-server link (plan P3 section 7, T-S1 to T-S25). Every test runs locally: the
 * Worker front, the relay, the session service, D1, the queue and the bucket are simulated or in memory.
 */
import { createHmac, generateKeyPairSync, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import entry from "./private-pilot-entry";
import { handlePilotServiceRequest } from "./private-pilot-service";
import { createPilotRelay, createRelayLimiter, relayConfig } from "./private-pilot-relay";
import {
  canonicalQuery,
  canonicalString,
  PILOT_INTERNAL_PATH,
  PILOT_SIG_SCHEME,
  signPilotRequest,
  verifyPilotSignature,
} from "./private-pilot-hmac";
import type { PrivateLyriaBindings } from "./private-pilot-bindings";
import {
  APP_ORIGIN,
  BODY,
  fakeSupabase,
  MockBucket,
  MockQueue,
  openBindings,
  OTHER_TOKEN,
  OWNER,
  OWNER_TOKEN,
  relayEnv,
  sha256HexNode,
  signedRequest,
  sqlite,
  sqliteD1,
  TEST_K1,
  TEST_K2,
  uuid,
  WORKER_ORIGIN,
  type D1Counter,
  type SqliteDb,
} from "@/test/pilot-harness";
import { PILOT_SCHEMA_SQL } from "./private-pilot-sql";

const T0 = 1_800_000_000;
let clock: number;
let db: SqliteDb;
let counter: D1Counter;
let queue: MockQueue;
let bucket: MockBucket;
let bindings: PrivateLyriaBindings;
let supa: ReturnType<typeof fakeSupabase>;
let logs: string[];

const describeSql = sqlite ? describe : describe.skip;

beforeEach(() => {
  clock = T0;
  logs = [];
  counter = { statements: 0 };
  queue = new MockQueue();
  bucket = new MockBucket();
  supa = fakeSupabase({ [OWNER_TOKEN]: OWNER, [OTHER_TOKEN]: "member-2" });
  vi.stubGlobal("fetch", supa.fetch);
  if (!sqlite) return;
  db = new sqlite.DatabaseSync(":memory:");
  db.exec(PILOT_SCHEMA_SQL);
  bindings = openBindings(sqliteD1(db, {}, counter), queue, bucket);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const service = (req: Request, b: PrivateLyriaBindings = bindings) =>
  handlePilotServiceRequest(req, b, { now: () => clock, processEnv: {}, log: (l) => logs.push(l) });
const used = () => (db.prepare("SELECT count(*) AS n FROM aimf_pilot_jobs").get() as { n: number }).n;
const sign = (o: Partial<Parameters<typeof signedRequest>[0]> = {}) => signedRequest({ nowSeconds: clock, ...o });
const signedPost = (id: string, o: Partial<Parameters<typeof signedRequest>[0]> = {}) =>
  sign({ method: "POST", body: BODY, idempotencyKey: id, ...o });
const nothingTouched = () => {
  expect(supa.calls).toBe(0);
  expect(counter.statements).toBe(0);
  expect(queue.sent).toHaveLength(0);
  expect(bucket.ops).toBe(0);
};
const expectServiceAuthFailed = async (res: Response) => {
  expect(res.status).toBe(401);
  expect(await res.text()).toBe('{"error":"Private music generation unavailable.","code":"service_auth_failed"}');
};

describeSql("T-S1 to T-S15: the Worker verifies the relay's proof before anything else", () => {
  it("T-S1 no signature: 401 service_auth_failed, and not one call to Supabase, D1, the queue or the bucket", async () => {
    const res = await service(
      new Request(`${WORKER_ORIGIN}${PILOT_INTERNAL_PATH}`, { method: "GET", headers: { authorization: `Bearer ${OWNER_TOKEN}` } }),
    );
    await expectServiceAuthFailed(res);
    nothingTouched();
  });

  it("T-S2 wrong, truncated, other-key or unknown-key signature: 401 with the same body each time", async () => {
    const good = await sign();
    const sig = good.headers.get("x-aimf-signature")!;
    const cases = [
      await sign({ secret: "TEST-ONLY-another-secret-of-32-bytes-0000" }),
      await sign({ overrideHeaders: { "x-aimf-signature": sig.slice(0, 20) } }),
      // One character changed in the middle (the last of the 43 also carries 2 padding bits).
      await sign({ overrideHeaders: { "x-aimf-signature": `${sig.slice(0, 10)}${sig[10] === "A" ? "B" : "A"}${sig.slice(11)}` } }),
      await sign({ keyId: "k2", secret: TEST_K2 }), // k2 is not configured on this Worker
      await sign({ overrideHeaders: { "x-aimf-key-id": "k9" } }),
      await sign({ overrideHeaders: { "x-aimf-sig-version": "2" } }),
    ];
    for (const req of cases) await expectServiceAuthFailed(await service(req));
    nothingTouched();
    expect((await service(good)).status).toBe(200);
  });

  it("T-S3 timestamp: -61 s and +61 s refused, the bounds -60 s and +60 s accepted", async () => {
    for (const skew of [-61, 61, -3600]) await expectServiceAuthFailed(await service(await sign({ nowSeconds: clock + skew })));
    nothingTouched();
    for (const skew of [-60, 60, 0]) expect((await service(await sign({ nowSeconds: clock + skew }))).status).toBe(200);
  });

  it("T-S4 body changed by one byte after signing: 401, nothing reserved", async () => {
    const signed = new TextEncoder().encode(JSON.stringify(BODY));
    const sent = signed.slice();
    sent[12] ^= 0x01;
    await expectServiceAuthFailed(await service(await signedPost(uuid(1), { signBytes: signed, sendBytes: sent })));
    nothingTouched();
  });

  it("T-S5 Idempotency-Key changed or removed: 401 (the key cannot be swapped to create another attempt)", async () => {
    await expectServiceAuthFailed(await service(await signedPost(uuid(1), { sendIdempotencyKey: uuid(2) })));
    await expectServiceAuthFailed(await service(await signedPost(uuid(1), { sendIdempotencyKey: null })));
    await expectServiceAuthFailed(await service(await sign({ method: "POST", body: BODY, sendIdempotencyKey: uuid(3) })));
    nothingTouched();
    // The case of the key does not matter (it is normalized on both sides, and D1 stores it lower case).
    expect((await service(await signedPost(uuid(1).toUpperCase()))).status).toBe(202);
  });

  it("T-S6 query changed (job, audio=1, added parameter): 401; the order of the parameters alone is normalized", async () => {
    const q = `?job=${uuid(1)}&audio=1`;
    await expectServiceAuthFailed(await service(await sign({ query: `?job=${uuid(1)}`, sendQuery: `?job=${uuid(2)}` })));
    await expectServiceAuthFailed(await service(await sign({ query: `?job=${uuid(1)}`, sendQuery: q })));
    await expectServiceAuthFailed(await service(await sign({ query: q, sendQuery: `${q}&x=1` })));
    await expectServiceAuthFailed(await service(await sign({ query: "", sendQuery: "?job=" })));
    nothingTouched();
    const reordered = await service(await sign({ query: q, sendQuery: `?audio=1&job=${uuid(1)}` }));
    expect(reordered.status).toBe(404); // accepted by the proof; the attempt does not exist
    expect(canonicalQuery("?b=2&a=1&a=0")).toBe("a=0&a=1&b=2");
    expect(canonicalQuery("?x=a b&y=%27")).toBe("x=a%20b&y=%27");
  });

  it("T-S7 the same signed POST replayed inside the window: the same attempt (replay), one hand-off, one attempt used", async () => {
    const first = await service(await signedPost(uuid(1)));
    expect(first.status).toBe(202);
    clock += 30;
    const replay = await service(await signedPost(uuid(1), { nowSeconds: T0 }));
    expect(replay.status).toBe(200);
    expect((await replay.json()).replay).toBe(true);
    expect(queue.sent).toHaveLength(1);
    expect(used()).toBe(1);
  });

  it("T-S8 signed for session A, sent with session B: 401", async () => {
    await expectServiceAuthFailed(await service(await sign({ token: OWNER_TOKEN, sendToken: OTHER_TOKEN })));
    await expectServiceAuthFailed(await service(await sign({ token: OWNER_TOKEN, sendToken: null })));
    nothingTouched();
  });

  it("T-S9 a valid proof with the valid session of another member: 403 owner_only, nothing reserved", async () => {
    const res = await service(await signedPost(uuid(1), { token: OTHER_TOKEN }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("owner_only");
    expect(used()).toBe(0);
    expect(supa.calls).toBe(1); // the session is re-verified by the Worker itself
  });

  it.each([
    ["absent", { AIMF_PILOT_HMAC_K1: undefined }],
    ["empty", { AIMF_PILOT_HMAC_K1: "" }],
    ["blank", { AIMF_PILOT_HMAC_K1: "   " }],
    ["31 bytes", { AIMF_PILOT_HMAC_K1: "x".repeat(31) }],
    ["k1 fine but k2 too short", { AIMF_PILOT_HMAC_K2: "short" }],
  ])("T-S10 Worker secret %s: 503 pilot_unconfigured, never an acceptance", async (_label, patch) => {
    const b = { ...bindings, ...patch } as PrivateLyriaBindings;
    const emptyKeySig = createHmac("sha256", "").update("anything").digest("base64url");
    for (const req of [
      await sign({ secret: TEST_K1 }),
      await sign({ overrideHeaders: { "x-aimf-signature": emptyKeySig } }),
    ]) {
      const res = await service(req, b);
      expect(res.status).toBe(503);
      expect((await res.json()).code).toBe("pilot_unconfigured");
    }
    nothingTouched();
    await expect(signPilotRequest({ method: "GET", search: "", body: new Uint8Array(), authorization: null, idempotencyKey: null, audience: "a", keyId: "k1", secret: "", nowSeconds: T0 })).rejects.toThrow();
  });

  it("T-S11 rotation: k1 and k2 both accepted during the overlap; k1 refused once removed", async () => {
    const both = { ...bindings, AIMF_PILOT_HMAC_K2: TEST_K2 };
    expect((await service(await sign({ keyId: "k1", secret: TEST_K1 }), both)).status).toBe(200);
    expect((await service(await sign({ keyId: "k2", secret: TEST_K2 }), both)).status).toBe(200);
    const k2only = { ...bindings, AIMF_PILOT_HMAC_K1: undefined, AIMF_PILOT_HMAC_K2: TEST_K2 };
    await expectServiceAuthFailed(await service(await sign({ keyId: "k1", secret: TEST_K1 }), k2only));
    expect((await service(await sign({ keyId: "k2", secret: TEST_K2 }), k2only)).status).toBe(200);
    // A signature made with k2's secret but labelled k1 is refused too.
    await expectServiceAuthFailed(await service(await sign({ keyId: "k1", secret: TEST_K2 }), both));
  });

  it("T-S12 the audience of another environment is refused by the recette Worker, and the reverse", async () => {
    await expectServiceAuthFailed(await service(await sign({ audience: "aimf-lyria-pilot-production" })));
    const production = { ...bindings, AIMF_PILOT_AUDIENCE: "aimf-lyria-pilot-production" };
    await expectServiceAuthFailed(await service(await sign(), production));
    expect((await service(await sign({ audience: "aimf-lyria-pilot-production" }), production)).status).toBe(200);
  });

  it("T-S13 a body over 8 KiB, declared or streamed: 413 before any HMAC is computed", async () => {
    const verify = vi.spyOn(crypto.subtle, "verify");
    const big = new Uint8Array(8 * 1024 + 1).fill(0x20);
    const declared = await signedPost(uuid(1), { sendBytes: big, extraHeaders: { "content-length": String(big.byteLength) } });
    const streamHeaders = new Headers(declared.headers);
    streamHeaders.delete("content-length");
    const streamed = new Request(`${WORKER_ORIGIN}${PILOT_INTERNAL_PATH}`, {
      method: "POST",
      headers: streamHeaders,
      body: new ReadableStream({
        pull(c) {
          c.enqueue(new Uint8Array(4096));
        },
      }),
      duplex: "half",
    } as RequestInit);
    for (const req of [declared, streamed]) {
      const res = await service(req);
      expect(res.status).toBe(413);
      expect((await res.json()).code).toBe("too_large");
    }
    expect(verify).not.toHaveBeenCalled();
    nothingTouched();
  });

  it.each([
    ["emergency stop on", { AI_ROUTES_PAUSED: "1" }, "ai_paused"],
    ["emergency stop absent", { AI_ROUTES_PAUSED: undefined }, "ai_paused"],
    ["switch off", { AIMF_PRIVATE_LYRIA_ENABLED: "0" }, "pilot_disabled"],
  ])("T-S14 %s: 503 before any cryptographic or network operation", async (_label, patch, code) => {
    const req = await signedPost(uuid(1));
    const spies = ["verify", "sign", "digest", "importKey"].map((m) => vi.spyOn(crypto.subtle, m as "verify"));
    const res = await service(req, { ...bindings, ...patch } as PrivateLyriaBindings);
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe(code);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    nothingTouched();
  });

  it("T-S15 the old public path, any other path, and a browser request without proof: 404 or 401", async () => {
    for (const path of ["/api/studio/lyria-private", "/", "/internal/v1/lyria-pilot/", "/internal/v2/lyria-pilot"]) {
      const res = await entry.fetch(await sign({ path }), bindings);
      expect(res.status).toBe(404);
    }
    const browser = new Request(`${WORKER_ORIGIN}${PILOT_INTERNAL_PATH}`, {
      headers: { origin: WORKER_ORIGIN, "sec-fetch-site": "same-origin", authorization: `Bearer ${OWNER_TOKEN}` },
    });
    await expectServiceAuthFailed(await entry.fetch(browser, { ...bindings }));
    nothingTouched();
  });
});

// ================================================================ relay (Lovable side)
const relayRequest = (method: "GET" | "POST", query = "", init: { token?: string | null; origin?: string; body?: unknown; id?: string; headers?: Record<string, string> } = {}) => {
  const headers: Record<string, string> = { origin: init.origin ?? APP_ORIGIN, ...(init.headers ?? {}) };
  const token = init.token === undefined ? OWNER_TOKEN : init.token;
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.id) headers["idempotency-key"] = init.id;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${APP_ORIGIN}/api/studio/lyria-private${query}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
};

/** A relay whose outbound fetch reaches the simulated Worker in process, with a spy on what it sends. */
function wiredRelay(env = relayEnv(), workerBindings?: () => PrivateLyriaBindings) {
  const outbound: Request[] = [];
  const workerFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    outbound.push(req.clone());
    return service(req, workerBindings ? workerBindings() : bindings);
  });
  const relay = createPilotRelay({
    fetch: workerFetch as unknown as typeof fetch,
    nowSeconds: () => clock,
    processEnv: {},
    limiter: createRelayLimiter(() => clock * 1000),
    log: (l) => logs.push(l),
  });
  return { relay: (r: Request) => relay(r, env), outbound, workerFetch };
}

describeSql("T-S16 to T-S25: the Lovable relay", () => {
  it.each([
    ["no session", relayRequest("POST", "", { token: null, body: BODY, id: uuid(1) }), relayEnv(), 401],
    ["another origin", relayRequest("POST", "", { origin: "https://evil.test", body: BODY, id: uuid(1) }), relayEnv(), 403],
    ["emergency stop on", relayRequest("POST", "", { body: BODY, id: uuid(1) }), relayEnv({ AI_ROUTES_PAUSED: "1" }), 503],
    ["emergency stop absent", relayRequest("POST", "", { body: BODY, id: uuid(1) }), relayEnv({ AI_ROUTES_PAUSED: undefined }), 503],
    ["relay not configured", relayRequest("POST", "", { body: BODY, id: uuid(1) }), relayEnv({ AIMF_PILOT_WORKER_URL: undefined }), 503],
    ["secret too short", relayRequest("POST", "", { body: BODY, id: uuid(1) }), relayEnv({ AIMF_PILOT_HMAC_K1: "short" }), 503],
    ["Worker address in plain http", relayRequest("GET"), relayEnv({ AIMF_PILOT_WORKER_URL: "http://pilot-worker.test" }), 503],
    ["other method", new Request(`${APP_ORIGIN}/api/studio/lyria-private`, { method: "DELETE", headers: { origin: APP_ORIGIN } }), relayEnv(), 405],
  ])("T-S16 %s: refused without any outbound request", async (_label, req, env, status) => {
    const { relay, workerFetch } = wiredRelay(env);
    const res = await relay(req);
    expect(res.status).toBe(status);
    expect(workerFetch).not.toHaveBeenCalled();
    expect(supa.calls).toBe(0);
    expect(used()).toBe(0);
  });

  it("T-S16 another member: refused by the relay itself, the Worker is never asked", async () => {
    const { relay, workerFetch } = wiredRelay();
    const res = await relay(relayRequest("POST", "", { token: OTHER_TOKEN, body: BODY, id: uuid(1) }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("owner_only");
    expect(workerFetch).not.toHaveBeenCalled();
  });

  it("T-S17 the Worker refuses the service proof: the browser gets 503 pilot_unavailable, never 401", async () => {
    const { relay } = wiredRelay(relayEnv({ AIMF_PILOT_HMAC_K1: "TEST-ONLY-a-secret-the-worker-does-not-know" }));
    for (const req of [relayRequest("GET"), relayRequest("POST", "", { body: BODY, id: uuid(1) })]) {
      const res = await relay(req);
      expect(res.status).toBe(503);
      expect((await res.json()).code).toBe("pilot_unavailable");
      expect(res.headers.get("www-authenticate")).toBeNull();
    }
    expect(used()).toBe(0);
  });

  it("T-S17 a session the Worker finds expired stays a 401 the browser can renew (WWW-Authenticate relayed)", async () => {
    const stale = "eyTESTstaleaaaa.bbbbbbbbstale.ccccccccstale"; // unknown to the session service
    const relay = createPilotRelay({
      fetch: (async (i: RequestInfo | URL, init?: RequestInit) => service(new Request(i, init))) as typeof fetch,
      verify: async () => ({ ok: true, userId: OWNER }), // the relay's own check passed a moment earlier
      nowSeconds: () => clock,
      processEnv: {},
      limiter: createRelayLimiter(),
    });
    const res = await relay(relayRequest("GET", "", { token: stale }), relayEnv());
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("invalid_session");
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
  });

  it("T-S18 the song through the relay: headers kept, stream passed through, no-store, no cookie", async () => {
    const { relay } = wiredRelay();
    expect((await relay(relayRequest("POST", "", { body: BODY, id: uuid(1) }))).status).toBe(202);
    const { consumePrivateLyriaBatch } = await import("./private-pilot-worker");
    await consumePrivateLyriaBatch({ messages: queue.sent.splice(0).map((body) => ({ body, ack() {} })) }, bindings, { now: () => clock, processEnv: {}, mockAudioBytes: 4096 });
    const res = await relay(relayRequest("GET", `?job=${uuid(1)}&audio=1`, { headers: { cookie: "sb=secret-cookie", range: "bytes=0-99" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store, no-transform");
    expect(res.headers.get("accept-ranges")).toBe("none");
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("set-cookie")).toBeNull();
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.byteLength).toBe(Number(res.headers.get("content-length")));
    expect(res.headers.get("repr-digest")).toBe(`sha-256=:${Buffer.from(sha256HexNode(bytes), "hex").toString("base64")}:`);
  });

  it("T-S19 logs (console spy): no token, signature, secret, body or owner id, through successes and failures", async () => {
    const lines: string[] = [];
    for (const m of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void lines.push(a.map(String).join(" ")));
    }
    const relay = createPilotRelay({ fetch: (async (i: RequestInfo | URL, init?: RequestInit) => handlePilotServiceRequest(new Request(i, init), bindings, { now: () => clock, processEnv: {} })) as typeof fetch, nowSeconds: () => clock, processEnv: {} });
    await relay(relayRequest("POST", "", { body: BODY, id: uuid(1) }), relayEnv());
    await relay(relayRequest("GET"), relayEnv({ AIMF_PILOT_HMAC_K1: "TEST-ONLY-a-secret-the-worker-does-not-know" }));
    await handlePilotServiceRequest(await sign({ nowSeconds: clock - 999 }), bindings, { now: () => clock, processEnv: {} });
    const broken = createPilotRelay({ fetch: (async () => { throw new Error(`boom ${OWNER_TOKEN}`); }) as typeof fetch, processEnv: {} });
    await broken(relayRequest("GET"), relayEnv());
    expect(lines.length).toBeGreaterThan(0);
    const all = lines.join("\n");
    for (const secret of [OWNER_TOKEN, TEST_K1, OWNER, BODY.prompt, "x-aimf-signature", "TEST-ONLY"]) expect(all).not.toContain(secret);
    expect(all).not.toMatch(/[A-Za-z0-9_-]{43}/); // no signature value
  });

  it("T-S20 the relay secret lives only on the server: no VITE_ name, and the client code never imports the relay", () => {
    const relaySource = readFileSync("src/music/private-pilot-relay.ts", "utf8");
    expect(relaySource).not.toMatch(/VITE_AIMF|import\.meta\.env/);
    const server = readFileSync("src/server.ts", "utf8");
    expect(server).toContain('import("./music/private-pilot-relay")');
    // The bundle itself is searched after the build (see the P3a report): name and test value absent from the client.
  });

  it("T-S21 known-answer vector: the canonical string and its HMAC, computed independently here", async () => {
    const body = new TextEncoder().encode('{"prompt":"x"}');
    const expectedCanonical = [
      "AIMF-PILOT-HMAC-SHA256-v1",
      "aimf-lyria-pilot-recette",
      "POST",
      "/internal/v1/lyria-pilot",
      "a=1&job=2",
      String(T0),
      uuid(7),
      sha256HexNode(body),
      sha256HexNode(OWNER_TOKEN),
    ].join("\n");
    const headers = await signPilotRequest({
      method: "post",
      search: "?job=2&a=1",
      body,
      authorization: `Bearer ${OWNER_TOKEN}`,
      idempotencyKey: uuid(7).toUpperCase(),
      audience: "aimf-lyria-pilot-recette",
      keyId: "k1",
      secret: TEST_K1,
      nowSeconds: T0,
    });
    expect(headers["x-aimf-signature"]).toBe(createHmac("sha256", TEST_K1).update(expectedCanonical).digest("base64url"));
    expect(headers["x-aimf-content-sha256"]).toBe(sha256HexNode(body));
    expect(PILOT_SIG_SCHEME).toBe("AIMF-PILOT-HMAC-SHA256-v1");
    expect(
      canonicalString({ audience: "aimf-lyria-pilot-recette", method: "post", search: "?job=2&a=1", timestamp: String(T0), idempotencyKey: uuid(7), contentSha256: sha256HexNode(body), bearerSha256: sha256HexNode(OWNER_TOKEN) }),
    ).toBe(expectedCanonical);
  });

  it("T-S21 every field of the signed string is bound: changing any single one of them alone is refused", async () => {
    const base = { method: "POST", search: "?job=2", body: new TextEncoder().encode("{}"), headers: new Headers({ authorization: `Bearer ${OWNER_TOKEN}`, "idempotency-key": uuid(1) }), audience: "aud-a", secrets: { k1: TEST_K1 }, nowSeconds: T0 };
    const signed = await signPilotRequest({ method: "POST", search: "?job=2", body: base.body, authorization: `Bearer ${OWNER_TOKEN}`, idempotencyKey: uuid(1), audience: "aud-a", keyId: "k1", secret: TEST_K1, nowSeconds: T0 });
    const withSig = (h: Headers) => {
      const out = new Headers(h);
      for (const [k, v] of Object.entries(signed)) out.set(k, v);
      return out;
    };
    expect((await verifyPilotSignature({ ...base, headers: withSig(base.headers) })).ok).toBe(true);
    const variants: [string, Parameters<typeof verifyPilotSignature>[0]][] = [
      ["audience", { ...base, headers: withSig(base.headers), audience: "aud-b" }],
      ["method", { ...base, headers: withSig(base.headers), method: "GET" }],
      ["query", { ...base, headers: withSig(base.headers), search: "?job=3" }],
      ["timestamp", { ...base, headers: (() => { const h = withSig(base.headers); h.set("x-aimf-timestamp", String(T0 + 1)); return h; })() }],
      ["idempotency key", { ...base, headers: (() => { const h = withSig(base.headers); h.set("idempotency-key", uuid(2)); return h; })() }],
      ["content hash", { ...base, body: new TextEncoder().encode("[]"), headers: (() => { const h = withSig(base.headers); h.set("x-aimf-content-sha256", sha256HexNode("[]")); return h; })() }],
      ["bearer", { ...base, headers: (() => { const h = withSig(base.headers); h.set("authorization", `Bearer ${OTHER_TOKEN}`); return h; })() }],
    ];
    for (const [, input] of variants) expect((await verifyPilotSignature(input)).ok).toBe(false);
  });

  it("T-S22 Cloudflare Access (simulated JWKS): absent, wrong aud, wrong iss, expired, forged or unknown key: 401", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = { ...(publicKey.export({ format: "jwk" }) as Record<string, string>), kid: "kid-1", alg: "RS256" };
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const jwt = (payload: Record<string, unknown>, key = privateKey, kid = "kid-1") => {
      const head = `${b64({ alg: "RS256", kid, typ: "JWT" })}.${b64(payload)}`;
      return `${head}.${createSign("RSA-SHA256").update(head).sign(key).toString("base64url")}`;
    };
    const AUD = "a".repeat(64);
    const iss = "https://aimf-team.cloudflareaccess.com";
    const good = { aud: [AUD], iss, exp: T0 + 300, iat: T0 - 10 };
    const jwksFetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://aimf-team.cloudflareaccess.com/cdn-cgi/access/certs");
      return Response.json({ keys: [jwk] });
    });
    const withAccess = { ...bindings, AIMF_PILOT_ACCESS_AUD: AUD, AIMF_PILOT_ACCESS_TEAM: "aimf-team" };
    const call = async (token: string | null) =>
      handlePilotServiceRequest(await sign({ extraHeaders: token ? { "cf-access-jwt-assertion": token } : {} }), withAccess, {
        now: () => clock,
        processEnv: {},
        log: (l) => logs.push(l),
        accessFetch: jwksFetch as unknown as typeof fetch,
        jwksCache: new Map(),
      });
    for (const token of [
      null,
      jwt({ ...good, aud: ["b".repeat(64)] }),
      jwt({ ...good, iss: "https://other-team.cloudflareaccess.com" }),
      jwt({ ...good, exp: T0 - 120 }),
      jwt(good, other.privateKey),
      jwt(good, privateKey, "kid-unknown"),
      "not.a.jwt",
    ]) {
      await expectServiceAuthFailed(await call(token));
    }
    expect(supa.calls).toBe(0);
    expect((await call(jwt(good))).status).toBe(200);
    // Half a configuration is an error, never "Access off".
    const half = await service(await sign(), { ...bindings, AIMF_PILOT_ACCESS_AUD: AUD });
    expect(half.status).toBe(503);
  });

  it("T-S23 Supabase unreachable after a valid proof: 503 auth_unavailable, no reservation", async () => {
    supa.down = true;
    const res = await service(await signedPost(uuid(1)));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("auth_unavailable");
    expect(used()).toBe(0);
    expect(queue.sent).toHaveLength(0);
  });

  it("T-S24 the relay signs and sends the SAME bytes: the hash of what the Worker receives is the signed hash", async () => {
    const { relay, outbound } = wiredRelay();
    const res = await relay(relayRequest("POST", "", { body: { ...BODY, lyrics: "é ünicode ✓" }, id: uuid(1) }));
    expect(res.status).toBe(202);
    const sent = outbound[0];
    const bytes = new Uint8Array(await sent.arrayBuffer());
    expect(sha256HexNode(bytes)).toBe(sent.headers.get("x-aimf-content-sha256"));
    expect(new TextDecoder().decode(bytes)).toBe(JSON.stringify({ ...BODY, lyrics: "é ünicode ✓" }));
    expect(sent.url).toBe(`${WORKER_ORIGIN}${PILOT_INTERNAL_PATH}`);
    expect(sent.headers.get("idempotency-key")).toBe(uuid(1));
  });

  it("T-S25 the relay never retries: one fetch after a network error, after a timeout, and after a 503", async () => {
    for (const behaviour of ["throw", "hang", "503"] as const) {
      const workerFetch = vi.fn(async (_i: RequestInfo | URL, init?: RequestInit) => {
        if (behaviour === "throw") throw new TypeError("network down");
        if (behaviour === "503") return Response.json({ error: "x", code: "pilot_unavailable" }, { status: 503 });
        return new Promise<Response>((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
      });
      const relay = createPilotRelay({ fetch: workerFetch as unknown as typeof fetch, nowSeconds: () => clock, processEnv: {}, headerTimeoutMs: 20, limiter: createRelayLimiter() });
      const res = await relay(relayRequest("POST", "", { body: BODY, id: uuid(1) }), relayEnv());
      expect(res.status).toBe(503);
      expect(workerFetch).toHaveBeenCalledTimes(1);
    }
  });
});

describe("relay configuration is fail-closed", () => {
  it.each([
    ["complete", relayEnv(), true],
    ["no owner", relayEnv({ AIMF_PRIVATE_LYRIA_OWNER_ID: " " }), false],
    ["address with a path", relayEnv({ AIMF_PILOT_WORKER_URL: `${WORKER_ORIGIN}/x` }), false],
    ["address with credentials", relayEnv({ AIMF_PILOT_WORKER_URL: "https://u:p@pilot-worker.test" }), false],
    ["local bench address", relayEnv({ AIMF_PILOT_WORKER_URL: "http://127.0.0.1:8787" }), true],
    ["key id k2 without k2", relayEnv({ AIMF_PILOT_HMAC_KEY_ID: "k2" }), false],
    ["unknown key id", relayEnv({ AIMF_PILOT_HMAC_KEY_ID: "k3" }), false],
    ["Access id without its secret", relayEnv({ AIMF_PILOT_ACCESS_CLIENT_ID: "id.access" }), false],
  ])("%s: usable = %s", (_label, env, ok) => {
    expect(relayConfig(env, {}) !== null).toBe(ok);
  });
});
