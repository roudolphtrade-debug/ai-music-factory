import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberCheck } from "@/lib/member-guard";
import { handlePrivateLyriaRequest } from "./private-demo-handler";
import { aiRoutesPaused, type D1Like, type PilotMessage, type PrivateLyriaBindings, type R2Like } from "./private-pilot-bindings";
import { defaultHasherFactory, hashStream, reprDigestHeader, verifiedStream } from "./private-pilot-integrity";
import { MOCK_LYRICS } from "./private-pilot-mock";
import { PILOT_MAX_HANDOFFS, PILOT_SCHEMA_SQL, SQL } from "./private-pilot-sql";
import { createPilotStore } from "./private-pilot-store";
import {
  consumePrivateLyriaBatch,
  RECONCILE_IDLE_SECONDS,
  RECONCILE_RUNNING_SECONDS,
  runScheduledReconciliation,
  scheduledLogLine,
  type GenerateSong,
} from "./private-pilot-worker";
import { LyriaGenerationError, type LyriaSong } from "./lyria35";

// ---------------------------------------------------------------- the real SQL, on the real SQLite engine
type SqliteDb = { exec(sql: string): void; prepare(sql: string): { get(...v: unknown[]): unknown; all(...v: unknown[]): unknown[]; run(...v: unknown[]): unknown } };
const sqlite = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule?.("node:sqlite") as
  | { DatabaseSync: new (path: string) => SqliteDb }
  | undefined;

/** D1 over node:sqlite (D1 is SQLite). Every call yields once, so concurrent requests really interleave. */
function sqliteD1(db: SqliteDb, faults: { failOn?: string | null } = {}): D1Like {
  return {
    prepare(sql: string) {
      let values: (string | number | null)[] = [];
      const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));
      const guard = () => {
        if (faults.failOn && sql === faults.failOn) throw new Error("injected D1 failure");
      };
      const statement = {
        bind(...v: (string | number | null)[]) {
          values = v;
          return statement;
        },
        async first<T>() {
          await yieldNow();
          guard();
          return (db.prepare(sql).get(...values) ?? null) as T | null;
        },
        async all<T>() {
          await yieldNow();
          guard();
          return { results: db.prepare(sql).all(...values) as T[] };
        },
        async run() {
          await yieldNow();
          guard();
          return db.prepare(sql).run(...values);
        },
      };
      return statement;
    },
  };
}

// ---------------------------------------------------------------- simulated queue, private bucket and provider
class MockQueue {
  sent: PilotMessage[] = [];
  failSends = 0;
  async send(body: PilotMessage) {
    if (this.failSends > 0) {
      this.failSends--;
      throw new Error("injected queue failure");
    }
    this.sent.push(JSON.parse(JSON.stringify(body)) as PilotMessage);
  }
}

const hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

class MockBucket implements R2Like {
  objects = new Map<string, { bytes: Uint8Array; meta: Record<string, string> }>();
  failPuts = 0;
  failHeads = false;
  /** Damages the bytes between the Worker and the bucket (the announced `sha256` is left unchanged). */
  corruptInTransit = false;
  async put(key: string, value: Uint8Array | string, options?: { customMetadata?: Record<string, string>; sha256?: string }) {
    if (this.failPuts > 0) {
      this.failPuts--;
      throw new Error("injected R2 failure");
    }
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value.slice();
    if (this.corruptInTransit && typeof value !== "string") bytes[bytes.length - 1] ^= 0xff;
    // Like R2: a write whose content does not hash to the announced SHA-256 is refused.
    if (options?.sha256 && hex(bytes) !== options.sha256) throw new Error("R2: sha256 mismatch");
    this.objects.set(key, { bytes, meta: { ...(options?.customMetadata ?? {}) } });
    return { size: bytes.byteLength, customMetadata: options?.customMetadata };
  }
  async head(key: string) {
    if (this.failHeads) throw new Error("injected R2 head failure");
    const o = this.objects.get(key);
    return o ? { size: o.bytes.byteLength, customMetadata: o.meta } : null;
  }
  async get(key: string) {
    const o = this.objects.get(key);
    if (!o) return null;
    return {
      size: o.bytes.byteLength,
      customMetadata: o.meta,
      body: new Response(o.bytes.slice()).body as ReadableStream<Uint8Array>,
      text: async () => new TextDecoder().decode(o.bytes),
    };
  }
}

const AUDIO = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0xff, 0xfb, 1, 2, 3, 4, 5, 6, 7, 8]);
const LYRICS = "PRIVATE-LYRICS-MARKER line one";
const API_KEY = "TEST-KEY-not-a-real-gemini-key-000000";
const OWNER = "owner-1";
const song = (overrides: Partial<LyriaSong> = {}): LyriaSong => ({
  model: "lyria-3.5",
  audio: AUDIO,
  mimeType: "audio/mpeg",
  text: LYRICS,
  estimatedCostUsd: 0.08,
  ...overrides,
});
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BODY = { prompt: "A bright afrobeats song", genre: "Afrobeats", language: "French" };

let db: SqliteDb;
let faults: { failOn: string | null };
let queue: MockQueue;
let bucket: MockBucket;
let clock: number;
let providerCalls: number;
let providerBehaviour: () => Promise<LyriaSong>;
let bindings: PrivateLyriaBindings;
const now = () => clock;
const generate: GenerateSong = async () => {
  providerCalls++;
  return providerBehaviour();
};
const verifyAs =
  (userId: string | null): ((r: Request) => Promise<MemberCheck>) =>
  async () =>
    userId
      ? { ok: true, userId }
      : { ok: false, response: Response.json({ error: "Sign in to use this feature.", code: "sign_in_required" }, { status: 401 }) };

function request(method: string, query = "", init: { id?: string; body?: unknown; origin?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { origin: init.origin ?? "https://aimf.test", ...(init.headers ?? {}) };
  if (init.id) headers["idempotency-key"] = init.id;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`https://aimf.test/api/studio/lyria-private${query}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const call = (req: Request, user: string | null = OWNER, b: PrivateLyriaBindings = bindings) =>
  handlePrivateLyriaRequest(req, b, { verify: verifyAs(user), now, processEnv: {} });
const post = (id: string, body: unknown = BODY, user: string | null = OWNER) => call(request("POST", "", { id, body }), user);
const getJob = async (id: string, user: string | null = OWNER) => call(request("GET", `?job=${id}`), user);
const deliver = async (b: PrivateLyriaBindings = bindings) => {
  const messages = queue.sent.splice(0).map((body) => ({ body, ack: vi.fn() }));
  const outcomes = await consumePrivateLyriaBatch({ messages }, b, { generate, now, processEnv: {} });
  for (const m of messages) expect(m.ack).toHaveBeenCalledTimes(1);
  return outcomes;
};
const state = (id: string) =>
  (db.prepare("SELECT state, provider_engaged_at, review_reason FROM aimf_pilot_jobs WHERE id = ?").get(id) ?? null) as
    | { state: string; provider_engaged_at: number | null; review_reason: string | null }
    | null;
const used = () => (db.prepare("SELECT count(*) AS n FROM aimf_pilot_jobs").get() as { n: number }).n;

beforeEach(() => {
  if (!sqlite) return;
  db = new sqlite.DatabaseSync(":memory:");
  db.exec(PILOT_SCHEMA_SQL);
  faults = { failOn: null };
  queue = new MockQueue();
  bucket = new MockBucket();
  clock = 1_800_000_000;
  providerCalls = 0;
  providerBehaviour = async () => song();
  bindings = {
    AIMF_PRIVATE_LYRIA_ENABLED: "1",
    AI_ROUTES_PAUSED: "0",
    AIMF_PRIVATE_LYRIA_PROVIDER: "lyria-3.5", // the provider itself is the injected `generate`: no network
    AIMF_PRIVATE_LYRIA_OWNER_ID: OWNER,
    GEMINI_API_KEY: API_KEY,
    AIMF_PRIVATE_LYRIA_DB: sqliteD1(db, faults),
    AIMF_PRIVATE_LYRIA_QUEUE: queue,
    AIMF_PRIVATE_LYRIA_BUCKET: bucket,
  };
});
afterEach(() => vi.restoreAllMocks());

const describeSql = sqlite ? describe : describe.skip;

// ================================================================ emergency stop and switch
describe("the shared emergency stop AI_ROUTES_PAUSED is fail-closed", () => {
  it.each([
    [undefined, undefined, true],
    ["", undefined, true],
    ["1", undefined, true],
    ["nope", undefined, true],
    ["0", undefined, false],
    [" OFF ", undefined, false],
    [undefined, "false", false],
    ["0", "1", true], // any source saying paused wins
    ["1", "0", true],
  ])("binding %j, process.env %j: paused = %s", (binding, env, paused) => {
    expect(aiRoutesPaused({ AI_ROUTES_PAUSED: binding }, env === undefined ? {} : { AI_ROUTES_PAUSED: env })).toBe(paused);
  });
});

describeSql("HTTP front: refusals spend nothing and reserve nothing", () => {
  it.each([
    ["pilot switch off", { AIMF_PRIVATE_LYRIA_ENABLED: undefined }, 503, "pilot_disabled"],
    ["pilot switch not exactly 1", { AIMF_PRIVATE_LYRIA_ENABLED: "true" }, 503, "pilot_disabled"],
    ["emergency stop absent", { AI_ROUTES_PAUSED: undefined }, 503, "ai_paused"],
    ["emergency stop on", { AI_ROUTES_PAUSED: "1" }, 503, "ai_paused"],
    ["owner not configured", { AIMF_PRIVATE_LYRIA_OWNER_ID: " " }, 503, "pilot_unconfigured"],
    ["no D1 binding", { AIMF_PRIVATE_LYRIA_DB: undefined }, 503, "pilot_unconfigured"],
    ["no queue binding", { AIMF_PRIVATE_LYRIA_QUEUE: undefined }, 503, "pilot_unconfigured"],
    ["no bucket binding", { AIMF_PRIVATE_LYRIA_BUCKET: undefined }, 503, "pilot_unconfigured"],
    ["no provider secret in lyria-3.5 mode", { GEMINI_API_KEY: "" }, 503, "pilot_unconfigured"],
    ["no provider mode", { AIMF_PRIVATE_LYRIA_PROVIDER: undefined }, 503, "pilot_unconfigured"],
    ["provider mode not exact", { AIMF_PRIVATE_LYRIA_PROVIDER: "Lyria" }, 503, "pilot_unconfigured"],
  ])("%s: answers %s, code %s", async (_label, patch, status, code) => {
    const res = await call(request("POST", "", { id: uuid(1), body: BODY }), OWNER, { ...bindings, ...patch } as PrivateLyriaBindings);
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
    expect(used()).toBe(0);
    expect(queue.sent).toHaveLength(0);
  });

  it("the status read is closed too while paused", async () => {
    expect((await call(request("GET"), OWNER, { ...bindings, AI_ROUTES_PAUSED: "1" })).status).toBe(503);
  });

  it("another origin, no session, another member: refused before any read", async () => {
    expect((await call(request("POST", "", { id: uuid(1), body: BODY, origin: "https://evil.test" }))).status).toBe(403);
    expect((await post(uuid(1), BODY, null)).status).toBe(401);
    const other = await post(uuid(1), BODY, "member-2");
    expect(other.status).toBe(403);
    expect((await other.json()).code).toBe("owner_only");
    expect(used()).toBe(0);
  });

  it.each([
    ["no idempotency key", request("POST", "", { body: BODY }), 400],
    ["key that is not a UUID", request("POST", "", { id: "abc", body: BODY }), 400],
    ["no prompt", request("POST", "", { id: uuid(1), body: { genre: "x" } }), 400],
    ["array body", request("POST", "", { id: uuid(1), body: [1] }), 400],
    ["body over 8 KB", request("POST", "", { id: uuid(1), body: { prompt: "x".repeat(9000) } }), 413],
    ["other method", request("PUT"), 405],
  ])("%s: refused (%s) and nothing reserved", async (_label, req, status) => {
    expect((await call(req)).status).toBe(status);
    expect(used()).toBe(0);
  });
});

// ================================================================ the asynchronous path
describeSql("one attempt, end to end, without any network", () => {
  it("POST reserves and enqueues an id only; the consumer calls the provider once and stores the song privately", async () => {
    const res = await post(uuid(1));
    expect(res.status).toBe(202);
    expect((await res.json()).job.state).toBe("queued");
    expect(providerCalls).toBe(0); // never inside the HTTP request
    expect(queue.sent).toEqual([{ v: 1, jobId: uuid(1) }]);
    expect(JSON.stringify(queue.sent[0]).length).toBeLessThan(128 * 1024);

    expect(await deliver()).toEqual(["stored"]);
    expect(providerCalls).toBe(1);
    const view = await (await getJob(uuid(1))).json();
    expect(view.job.state).toBe("stored");
    expect(view.lyrics).toBe(LYRICS);
    expect(JSON.stringify(view)).not.toMatch(/pilot\/|owner-1|input_json/); // no storage address, owner id or input

    const audio = await call(request("GET", `?job=${uuid(1)}&audio=1`));
    expect(audio.status).toBe(200);
    expect(audio.headers.get("content-type")).toBe("audio/mpeg");
    expect(audio.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(AUDIO);
  });

  it("after the tab was closed, the owner finds the attempt and replays the same song later", async () => {
    await post(uuid(1));
    await deliver();
    clock += 3600; // much later, from a new tab
    expect((await (await getJob(uuid(1))).json()).job.state).toBe("stored");
    expect((await call(request("GET", `?job=${uuid(1)}&audio=1`))).status).toBe(200);
    expect(providerCalls).toBe(1);
  });

  it("the audio is refused while not stored", async () => {
    await post(uuid(1));
    expect((await call(request("GET", `?job=${uuid(1)}&audio=1`))).status).toBe(409);
  });
});

// ================================================================ integrity of the stored content
const audioObject = () => {
  const key = [...bucket.objects.keys()].find((k) => k.endsWith(".mp3")) as string;
  return bucket.objects.get(key)!;
};
const readAudio = (b: PrivateLyriaBindings = bindings) => call(request("GET", `?job=${uuid(1)}&audio=1`), OWNER, b);
const serverCheck = (): PrivateLyriaBindings => ({ ...bindings, AIMF_PRIVATE_LYRIA_AUDIO_CHECK: "server" });
const expectedDigest = `sha-256=:${createHash("sha256").update(AUDIO).digest("base64")}:`;

describeSql("integrity: the content is hashed, the metadata proves nothing", () => {
  beforeEach(async () => {
    await post(uuid(1));
    await deliver();
  });

  it.each([
    ["client (default)", () => bindings, "client"],
    ["server", serverCheck, "server-stream+client"],
  ])("%s mode: the song streams with the D1 fingerprint in Repr-Digest", async (_label, b, header) => {
    const res = await readAudio(b());
    expect(res.status).toBe(200);
    expect(res.headers.get("repr-digest")).toBe(expectedDigest);
    expect(res.headers.get("x-aimf-audio-check")).toBe(header);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(AUDIO);
  });

  it("forged metadata on intact content changes nothing: the metadata is neither trusted nor needed", async () => {
    audioObject().meta.sha256 = "0".repeat(64);
    for (const b of [bindings, serverCheck()]) {
      const res = await readAudio(b);
      expect(res.status).toBe(200);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(AUDIO);
    }
  });

  it("content altered in place, server mode: the download fails, never a complete wrong file", async () => {
    audioObject().bytes[5] ^= 0x01;
    const res = await readAudio(serverCheck());
    expect(res.status).toBe(200); // the headers leave before the last byte is hashed
    await expect(res.arrayBuffer()).rejects.toThrow();
  });

  it("content altered in place, client mode: the bytes no longer match Repr-Digest, which the browser checks", async () => {
    audioObject().bytes[5] ^= 0x01;
    const res = await readAudio();
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(`sha-256=:${createHash("sha256").update(bytes).digest("base64")}:`).not.toBe(res.headers.get("repr-digest"));
  });

  it.each([
    ["truncated", (b: Uint8Array) => b.slice(0, b.length - 1)],
    ["extended", (b: Uint8Array) => new Uint8Array([...b, 0])],
  ])("content %s: refused before any byte is sent", async (_label, change) => {
    audioObject().bytes = change(audioObject().bytes);
    const res = await readAudio();
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("audio_unavailable");
  });

  it("server mode without an incremental hash in the runtime: refused, never a claimed check that is not made", async () => {
    const res = await handlePrivateLyriaRequest(request("GET", `?job=${uuid(1)}&audio=1`), serverCheck(), {
      verify: verifyAs(OWNER),
      now,
      processEnv: {},
      hasher: null,
    });
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("audio_unverifiable");
  });
});

describe("integrity helpers", () => {
  const bytes = new Uint8Array(3_000_000).map((_, i) => (i * 31) & 0xff);
  const stream = () => new Response(bytes.slice()).body as ReadableStream<Uint8Array>;
  const hasher = defaultHasherFactory();

  it("Node: the node:crypto hash; Cloudflare: the native DigestStream is preferred when present", async () => {
    expect(hasher).not.toBeNull();
    expect(await hashStream(stream(), hasher!(), 4_000_000)).toEqual({ sha256: hex(bytes), bytes: bytes.length });
    class FakeDigestStream extends WritableStream<Uint8Array> {
      digest: Promise<ArrayBuffer>;
      constructor(algorithm: string) {
        const h = createHash(algorithm === "SHA-256" ? "sha256" : "unknown");
        let done: (b: ArrayBuffer) => void = () => {};
        super({ write: (c) => void h.update(c), close: () => done(new Uint8Array(h.digest()).buffer) });
        this.digest = new Promise((r) => (done = r));
      }
    }
    vi.stubGlobal("crypto", Object.assign(Object.create(globalThis.crypto), { DigestStream: FakeDigestStream }));
    try {
      const native = defaultHasherFactory();
      expect(await hashStream(stream(), native!(), 4_000_000)).toEqual({ sha256: hex(bytes), bytes: bytes.length });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("verifiedStream passes good content through and fails bad content; hashStream stops past its limit", async () => {
    const good = verifiedStream(stream(), { sha256: hex(bytes), bytes: bytes.length }, hasher!());
    expect((await new Response(good).arrayBuffer()).byteLength).toBe(bytes.length);
    const bad = verifiedStream(stream(), { sha256: "f".repeat(64), bytes: bytes.length }, hasher!());
    await expect(new Response(bad).arrayBuffer()).rejects.toThrow(/digest_mismatch/);
    await expect(hashStream(stream(), hasher!(), 1000)).rejects.toThrow(/too_large/);
    expect(reprDigestHeader("00".repeat(32))).toBe(`sha-256=:${"A".repeat(43)}=:`);
  });
});

describeSql("concurrency, cap and duplicates", () => {
  it("20 simultaneous requests with different keys: exactly one attempt is reserved", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => post(uuid(100 + i))));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 202)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(used()).toBe(1);
    expect(providerCalls).toBe(0);
  });

  it("20 simultaneous requests with the SAME key and content: one attempt, the others get it back", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => post(uuid(7))));
    expect(results.filter((r) => r.status === 202)).toHaveLength(1);
    expect(results.filter((r) => r.status === 200)).toHaveLength(19);
    expect(used()).toBe(1);
    expect(queue.sent).toHaveLength(1);
  });

  it("five attempts at most: the sixth is refused, and SQL cannot go past five", async () => {
    for (let n = 1; n <= 5; n++) {
      expect((await post(uuid(n))).status).toBe(202);
      await deliver();
    }
    const sixth = await post(uuid(6));
    expect(sixth.status).toBe(402);
    expect((await sixth.json()).code).toBe("pilot_quota_exhausted");
    expect(providerCalls).toBe(5);
    expect(() =>
      db.exec(`INSERT INTO aimf_pilot_jobs (id, owner_id, request_hash, input_json, state, created_at, updated_at)
        VALUES ('${uuid(9)}', 'x', '${"a".repeat(64)}', '{}', 'reserved', 1, 1)`),
    ).toThrow(/hard cap/);
    expect(() => db.exec("UPDATE aimf_pilot_settings SET max_attempts = 6")).toThrow();
    expect(() => db.exec("DELETE FROM aimf_pilot_jobs")).toThrow(/never deleted/);
  });

  it("the same key again returns the same attempt (and its result); the same key with other content is refused", async () => {
    expect((await post(uuid(1))).status).toBe(202);
    const again = await post(uuid(1));
    expect(again.status).toBe(200);
    expect((await again.json()).replay).toBe(true);
    await deliver();
    expect((await (await post(uuid(1))).json()).job.state).toBe("stored");
    const reused = await post(uuid(1), { prompt: "something else" });
    expect(reused.status).toBe(409);
    expect((await reused.json()).code).toBe("idempotency_key_reused");
    expect(used()).toBe(1);
    expect(providerCalls).toBe(1);
  });
});

describeSql("at-least-once delivery: at most one provider call per attempt", () => {
  it("the same message delivered twice calls the provider once", async () => {
    await post(uuid(1));
    queue.sent.push({ v: 1, jobId: uuid(1) });
    expect(await deliver()).toEqual(["stored", "not_claimed"]);
    expect(providerCalls).toBe(1);
  });

  it("two consumers racing on the same attempt: one call", async () => {
    await post(uuid(1));
    const msg = queue.sent[0];
    queue.sent = [];
    const run = () => consumePrivateLyriaBatch({ messages: [{ body: msg, ack() {} }] }, bindings, { generate, now, processEnv: {} });
    const [a, b] = await Promise.all([run(), run()]);
    expect([...a, ...b].sort()).toEqual(["not_claimed", "stored"]);
    expect(providerCalls).toBe(1);
  });

  it("malformed messages are ignored", async () => {
    queue.sent.push({ v: 2, jobId: uuid(1) } as unknown as PilotMessage, { v: 1, jobId: "x" });
    expect(await deliver()).toEqual(["invalid_message", "invalid_message"]);
    expect(providerCalls).toBe(0);
  });
});

describeSql("interruptions: every window, without a blind provider retry", () => {
  it("D1 -> queue: the hand-off fails; the attempt stays never-engaged and is handed over by the reconciliation", async () => {
    queue.failSends = 1;
    const res = await post(uuid(1));
    expect(res.status).toBe(202);
    expect((await res.json()).handoff).toBe("pending");
    expect(state(uuid(1))).toMatchObject({ state: "reserved", provider_engaged_at: null });
    clock += RECONCILE_IDLE_SECONDS + 1;
    await call(request("GET")); // any owner read reconciles
    expect(queue.sent).toEqual([{ v: 1, jobId: uuid(1) }]);
    await deliver();
    expect(state(uuid(1))?.state).toBe("stored");
    expect(providerCalls).toBe(1);
  });

  it("emergency stop at the consumer: no call, the attempt waits, and resumes once the pilot is open again", async () => {
    await post(uuid(1));
    expect(await deliver({ ...bindings, AI_ROUTES_PAUSED: "1" })).toEqual(["paused"]);
    expect(providerCalls).toBe(0);
    expect(state(uuid(1))).toMatchObject({ state: "queued", provider_engaged_at: null });
    clock += RECONCILE_IDLE_SECONDS + 1;
    await call(request("GET"));
    await deliver();
    expect(state(uuid(1))?.state).toBe("stored");
    expect(providerCalls).toBe(1);
  });

  it("crash after the engagement but before the provider answered: never called again, sent to review", async () => {
    await post(uuid(1));
    await createPilotStore(bindings.AIMF_PRIVATE_LYRIA_DB as D1Like, now).claim(uuid(1)); // engaged, then the isolate dies
    queue.sent.push({ v: 1, jobId: uuid(1) }); // the queue redelivers
    expect(await deliver()).toEqual(["not_claimed", "not_claimed"]);
    clock += RECONCILE_RUNNING_SECONDS + 1;
    await call(request("GET"));
    expect(state(uuid(1))).toMatchObject({ state: "needs_review", review_reason: "outcome_unknown" });
    expect(providerCalls).toBe(0);
    const next = await post(uuid(2));
    expect(next.status).toBe(423); // the pilot is blocked until the owner reviews
    expect((await next.json()).code).toBe("review_required");
  });

  it.each([
    ["provider error", () => Promise.reject(new LyriaGenerationError("upstream_rejected", 502)), "provider_failed"],
    ["provider rate limit", () => Promise.reject(new LyriaGenerationError("upstream_rejected", 429)), "provider_rate_limited"],
    ["provider timeout or network", () => Promise.reject(new Error("aborted")), "provider_failed"],
    ["invalid output", () => Promise.resolve(song({ mimeType: "audio/wav" as "audio/mpeg" })), "provider_invalid_output"],
    ["empty audio", () => Promise.resolve(song({ audio: new Uint8Array() })), "provider_invalid_output"],
  ])("%s: one call, review, no retry", async (_label, behaviour, reason) => {
    providerBehaviour = behaviour as () => Promise<LyriaSong>;
    await post(uuid(1));
    expect(await deliver()).toEqual(["needs_review"]);
    expect(state(uuid(1))).toMatchObject({ state: "needs_review", review_reason: reason });
    queue.sent.push({ v: 1, jobId: uuid(1) });
    await deliver();
    expect(providerCalls).toBe(1);
  });

  it("after the provider, before R2: the write fails twice, the song is lost and said so, no new call", async () => {
    bucket.failPuts = 2;
    await post(uuid(1));
    expect(await deliver()).toEqual(["needs_review"]);
    expect(state(uuid(1))).toMatchObject({ state: "needs_review", review_reason: "storage_failed" });
    expect(providerCalls).toBe(1);
  });

  it("a write damaged on its way to the bucket is refused by the bucket itself (sha256 of the put)", async () => {
    bucket.corruptInTransit = true;
    await post(uuid(1));
    expect(await deliver()).toEqual(["needs_review"]);
    expect(state(uuid(1))).toMatchObject({ state: "needs_review", review_reason: "storage_failed" });
    expect([...bucket.objects.keys()].some((k) => k.endsWith(".mp3"))).toBe(false);
    expect(providerCalls).toBe(1);
  });

  it("after R2, before D1: the song is safe; the reconciliation has its CONTENT hashed, then records it, no call", async () => {
    faults.failOn = SQL.markStored;
    await post(uuid(1));
    expect(await deliver()).toEqual(["stored_unconfirmed"]);
    expect(state(uuid(1))?.state).toBe("running");
    faults.failOn = null;
    clock += RECONCILE_RUNNING_SECONDS + 1;
    await call(request("GET"));
    expect(queue.sent).toEqual([{ v: 1, jobId: uuid(1), op: "recover" }]); // the 10 ms request hashes nothing
    expect(state(uuid(1))?.state).toBe("running");
    expect(await deliver()).toEqual(["stored"]);
    expect(state(uuid(1))?.state).toBe("stored");
    expect((await call(request("GET", `?job=${uuid(1)}&audio=1`))).status).toBe(200);
    expect(providerCalls).toBe(1);
  });

  it("D1 down at the claim: nothing is engaged, nothing is called", async () => {
    await post(uuid(1));
    faults.failOn = SQL.claim;
    expect(await deliver()).toEqual(["unconfigured"]);
    expect(providerCalls).toBe(0);
    expect(state(uuid(1))?.provider_engaged_at).toBeNull();
  });
});

describeSql("a third party never reaches an attempt or a song", () => {
  it("another member: status, attempt and audio refused; no session: refused", async () => {
    await post(uuid(1));
    await deliver();
    for (const q of ["", `?job=${uuid(1)}`, `?job=${uuid(1)}&audio=1`]) {
      expect((await call(request("GET", q), "member-2")).status).toBe(403);
      expect((await call(request("GET", q), null)).status).toBe(401);
    }
  });

  it("an unknown or malformed attempt id answers like a missing one", async () => {
    expect((await getJob(uuid(42))).status).toBe(404);
    expect((await call(request("GET", "?job=nope"))).status).toBe(400);
  });
});

describeSql("secrets and private texts never reach the logs", () => {
  it("a full run with failures logs neither the provider key nor the lyrics", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await post(uuid(1));
    await deliver();
    await getJob(uuid(1));
    providerBehaviour = () => Promise.reject(new LyriaGenerationError("upstream_rejected", 502));
    await post(uuid(2));
    await deliver(); // a failed attempt too
    const logged = spies.flatMap((s) => s.mock.calls.flat().map(String)).join("\n");
    expect(logged).not.toContain(API_KEY);
    expect(logged).not.toContain(LYRICS);
  });
});

// ================================================================ Cron: recovery without any visit of the owner
const cron = (b: PrivateLyriaBindings = bindings) => runScheduledReconciliation(b, { now, processEnv: {} });

describeSql("Cron reconciliation: autonomous, fail-closed, never a provider call", () => {
  it("pilot switch off: not even a read of D1", async () => {
    const prepare = vi.fn();
    const off = { ...bindings, AIMF_PRIVATE_LYRIA_ENABLED: "0", AIMF_PRIVATE_LYRIA_DB: { prepare } as unknown as D1Like };
    expect(await cron(off)).toEqual({ status: "disabled" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([
    ["emergency stop on", { AI_ROUTES_PAUSED: "1" }],
    ["emergency stop missing", { AI_ROUTES_PAUSED: undefined }],
    ["emergency stop unreadable", { AI_ROUTES_PAUSED: "maybe" }],
  ])("%s: nothing at all, even with a lost hand-off waiting", async (_label, patch) => {
    queue.failSends = 1;
    await post(uuid(1));
    clock += RECONCILE_IDLE_SECONDS + 1;
    expect(await cron({ ...bindings, ...patch })).toEqual({ status: "paused" });
    expect(queue.sent).toHaveLength(0);
    expect(state(uuid(1))?.state).toBe("reserved");
  });

  it("a binding missing: nothing", async () => {
    expect((await cron({ ...bindings, AIMF_PRIVATE_LYRIA_QUEUE: undefined })).status).toBe("unconfigured");
    expect((await cron({ ...bindings, AIMF_PRIVATE_LYRIA_PROVIDER: undefined })).status).toBe("unconfigured");
  });

  it("lost hand-off, tab closed, owner never comes back: the Cron hands it over and the song is stored", async () => {
    queue.failSends = 1;
    await post(uuid(1));
    clock += RECONCILE_IDLE_SECONDS + 1;
    const run = await cron();
    expect(run).toMatchObject({ status: "ran", requeued: [uuid(1)] });
    expect(await deliver()).toEqual(["stored"]);
    expect(providerCalls).toBe(1);
  });

  it("consumer died after R2, before D1: the Cron has the content checked, then the song is stored, no call", async () => {
    faults.failOn = SQL.markStored;
    await post(uuid(1));
    await deliver();
    faults.failOn = null;
    clock += RECONCILE_RUNNING_SECONDS + 1;
    expect(await cron()).toMatchObject({ status: "ran", recoveryQueued: [uuid(1)] });
    expect(await cron()).toMatchObject({ status: "ran", recoveryQueued: [] }); // not handed again right away
    expect(await deliver()).toEqual(["stored"]);
    expect(providerCalls).toBe(1);
  });

  it("consumer died after R2 and the stored content was altered: integrity review, never recorded as stored", async () => {
    faults.failOn = SQL.markStored;
    await post(uuid(1));
    await deliver();
    faults.failOn = null;
    audioObject().bytes[4] ^= 0x01;
    clock += RECONCILE_RUNNING_SECONDS + 1;
    await cron();
    expect(await deliver()).toEqual(["needs_review"]);
    expect(state(uuid(1))).toMatchObject({ state: "needs_review", review_reason: "storage_integrity_failed" });
    expect(providerCalls).toBe(1);
  });

  it("consumer died after R2 and the metadata is missing: integrity review", async () => {
    faults.failOn = SQL.markStored;
    await post(uuid(1));
    await deliver();
    faults.failOn = null;
    audioObject().meta = {};
    clock += RECONCILE_RUNNING_SECONDS + 1;
    await cron();
    expect(await deliver()).toEqual(["needs_review"]);
    expect(state(uuid(1))?.review_reason).toBe("storage_integrity_failed");
  });

  it("engaged, then the isolate died before the provider answered: review, zero call", async () => {
    await post(uuid(1));
    await createPilotStore(bindings.AIMF_PRIVATE_LYRIA_DB as D1Like, now).claim(uuid(1));
    queue.sent = [];
    clock += RECONCILE_RUNNING_SECONDS + 1;
    expect(await cron()).toMatchObject({ status: "ran", sentToReview: [uuid(1)] });
    expect(state(uuid(1))).toMatchObject({ state: "needs_review", review_reason: "outcome_unknown" });
    expect(providerCalls).toBe(0);
  });

  it("the bucket cannot be read: nothing is concluded (no false 'lost')", async () => {
    faults.failOn = SQL.markStored;
    await post(uuid(1));
    await deliver();
    faults.failOn = null;
    bucket.failHeads = true;
    clock += RECONCILE_RUNNING_SECONDS + 1;
    expect(await cron()).toMatchObject({ status: "ran", sentToReview: [], recoveryQueued: [] });
    expect(state(uuid(1))?.state).toBe("running");
  });

  it(`a hand-off never consumed: at most ${PILOT_MAX_HANDOFFS} messages, then halted (never engaged, never billed)`, async () => {
    await post(uuid(1)); // hand-off 1, swallowed
    for (let run = 0; run < 6; run++) {
      clock += RECONCILE_IDLE_SECONDS + 1;
      await cron();
    }
    expect(queue.sent).toHaveLength(PILOT_MAX_HANDOFFS);
    expect(state(uuid(1))).toMatchObject({ state: "halted", review_reason: "handoff_exhausted", provider_engaged_at: null });
    queue.sent = [];
    expect((await post(uuid(2))).status).toBe(202); // the pilot is free again, and the halted attempt still counts
    expect(used()).toBe(2);
    expect(providerCalls).toBe(0);
  });

  it("a recover message can never engage the provider, and leaves a live consumer alone", async () => {
    await post(uuid(1));
    queue.sent = [{ v: 1, jobId: uuid(1), op: "recover" }];
    expect(await deliver()).toEqual(["not_claimed"]); // queued, not running
    await createPilotStore(bindings.AIMF_PRIVATE_LYRIA_DB as D1Like, now).claim(uuid(1));
    queue.sent = [{ v: 1, jobId: uuid(1), op: "recover" }];
    expect(await deliver()).toEqual(["not_claimed"]); // running but recent: its consumer may still be working
    queue.sent = [{ v: 1, jobId: uuid(1), op: "erase" } as unknown as PilotMessage];
    expect(await deliver()).toEqual(["invalid_message"]);
    expect(state(uuid(1))?.state).toBe("running");
    expect(providerCalls).toBe(0);
  });

  it("Cron and an owner visit reconciling at the same instant: two hand-offs at most, one provider call", async () => {
    queue.failSends = 1;
    await post(uuid(1));
    clock += RECONCILE_IDLE_SECONDS + 1;
    await Promise.all([cron(), call(request("GET"))]);
    expect(queue.sent.length).toBeGreaterThanOrEqual(1);
    await deliver();
    expect(state(uuid(1))?.state).toBe("stored");
    expect(providerCalls).toBe(1);
  });

  it("the log line holds counts only", () => {
    const line = scheduledLogLine({ status: "ran", requeued: [uuid(1)], recoveryQueued: [], sentToReview: [], halted: [] });
    expect(JSON.parse(line)).toEqual({ event: "aimf_pilot_reconcile", status: "ran", requeued: 1, recoveryQueued: 0, sentToReview: 0, halted: 0 });
    expect(line).not.toContain(uuid(1));
  });
});

// ================================================================ fictitious provider for the Cloudflare recette
describeSql("mock provider: real size, real parsing, no network, no secret", () => {
  it("runs end to end without GEMINI_API_KEY, never touches the network, and says it is fictitious", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const mock: PrivateLyriaBindings = { ...bindings, AIMF_PRIVATE_LYRIA_PROVIDER: "mock", GEMINI_API_KEY: undefined };
    const summary = await (await call(request("GET"), OWNER, mock)).json();
    expect(summary.provider).toBe("mock");
    expect((await call(request("POST", "", { id: uuid(1), body: BODY }), OWNER, mock)).status).toBe(202);
    const messages = queue.sent.splice(0).map((body) => ({ body, ack: vi.fn() }));
    expect(await consumePrivateLyriaBatch({ messages }, mock, { now, processEnv: {} })).toEqual(["stored"]);
    const view = await (await call(request("GET", `?job=${uuid(1)}`), OWNER, mock)).json();
    expect(view.lyrics).toBe(MOCK_LYRICS);
    expect(view.job.audioBytes).toBe(3_000_000);
    const audio = await call(request("GET", `?job=${uuid(1)}&audio=1`), OWNER, mock);
    expect((await audio.arrayBuffer()).byteLength).toBe(3_000_000);
    expect(audioObject().meta.provider).toBe("mock");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lyria-3.5 mode without its secret: the consumer engages nothing", async () => {
    await post(uuid(1));
    expect(await deliver({ ...bindings, GEMINI_API_KEY: " " })).toEqual(["unconfigured"]);
    expect(state(uuid(1))?.provider_engaged_at).toBeNull();
  });
});

// ================================================================ owner review
describeSql("the owner closes a reviewed attempt by hand; the code never does", () => {
  it("needs_review -> reviewed (manual SQL) unblocks the pilot; the attempt stays counted; nothing else is allowed", async () => {
    providerBehaviour = () => Promise.reject(new LyriaGenerationError("upstream_rejected", 502));
    await post(uuid(1));
    await deliver();
    expect((await post(uuid(2))).status).toBe(423);
    expect(() => db.exec(`UPDATE aimf_pilot_jobs SET state = 'queued' WHERE id = '${uuid(1)}'`)).toThrow(/forbidden/);
    db.exec(`UPDATE aimf_pilot_jobs SET state = 'reviewed', updated_at = ${clock} WHERE id = '${uuid(1)}' AND state = 'needs_review'`);
    expect((await (await getJob(uuid(1))).json()).job.state).toBe("reviewed");
    expect((await post(uuid(2))).status).toBe(202);
    expect(used()).toBe(2);
    expect(() => db.exec(`UPDATE aimf_pilot_jobs SET state = 'needs_review' WHERE id = '${uuid(1)}'`)).toThrow(/forbidden/);
  });

  it("no statement of the code writes 'reviewed'", () => {
    expect(Object.values(SQL).join("\n")).not.toContain("'reviewed'");
  });
});

describe("the pilot is a technical circuit breaker, never a second credit wallet", () => {
  const sources = [
    "private-pilot-sql.ts",
    "private-pilot-store.ts",
    "private-pilot-worker.ts",
    "private-pilot-bindings.ts",
    "private-pilot-integrity.ts",
    "private-pilot-mock.ts",
    "private-pilot-entry.ts",
    "private-demo-handler.ts",
  ]
    .map((f) => readFileSync(`src/music/${f}`, "utf8"))
    .join("\n");

  it("touches neither the browser credits nor Supabase data (M1/M2 stay the only ledger)", () => {
    expect(sources).not.toMatch(/@\/library\/credits|useCredits|CreditsProvider|integrations\/supabase|music_credit_ledger|\.from\(\s*["']/);
    expect(PILOT_SCHEMA_SQL).not.toMatch(/credit|balance|price|wallet/i);
  });

  it("the review-only SQL file holds exactly the schema the code runs", () => {
    const norm = (s: string) => s.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
    const doc = readFileSync("docs/music/LYRIA-PRIVATE-DEMO-D1.sql", "utf8");
    expect(norm(doc)).toContain(norm(PILOT_SCHEMA_SQL));
  });
});
