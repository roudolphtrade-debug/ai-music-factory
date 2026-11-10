/**
 * P3a, concurrency and cost cap (plan P3a section 5, T-C1 to T-C6 and T-K1 to T-K4).
 *
 *  - Thread races: N worker threads, each with its OWN SQLite connection on one WAL file, released together by a
 *    barrier, run the EXACT statements of `private-pilot-sql.ts` (imported, not copied).
 *  - Request races: N signed requests through the real Worker front (HMAC, session, handler), each with its own
 *    connection on the same file, started together and interleaving between statements.
 * Nothing reaches a real host; the provider is a spy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handlePrivateLyriaRequest } from "./private-demo-handler";
import type { PilotMessage, PrivateLyriaBindings } from "./private-pilot-bindings";
import { handlePilotServiceRequest } from "./private-pilot-service";
import { PILOT_HARD_MAX_ATTEMPTS, PILOT_MAX_HANDOFFS, PILOT_SCHEMA_SQL, SQL } from "./private-pilot-sql";
import { createPilotStore } from "./private-pilot-store";
import {
  consumePrivateLyriaBatch,
  processPilotMessage,
  reconcilePilot,
  RECONCILE_IDLE_SECONDS,
  RECONCILE_RUNNING_SECONDS,
  runScheduledReconciliation,
  type GenerateSong,
} from "./private-pilot-worker";
import { LyriaGenerationError, type LyriaSong } from "./lyria35";
import {
  AUDIO,
  BODY,
  fakeSupabase,
  MockBucket,
  MockQueue,
  openBindings,
  OWNER,
  OWNER_TOKEN,
  pilotDbFile,
  signedRequest,
  sqlite,
  sqliteD1,
  uuid,
  type D1Faults,
  type SqliteDb,
} from "@/test/pilot-harness";

const describeSql = sqlite ? describe : describe.skip;
const N = 32;
const T0 = 1_800_000_000;
let clock: number;
let queue: MockQueue;
let bucket: MockBucket;
let providerCalls: Map<string, number>;
let opened: SqliteDb[];

const song = (overrides: Partial<LyriaSong> = {}): LyriaSong => ({
  model: "lyria-3.5",
  audio: AUDIO,
  mimeType: "audio/mpeg",
  text: "la la la",
  estimatedCostUsd: 0.08,
  ...overrides,
});
let providerBehaviour: (jobHint: string) => Promise<LyriaSong>;
const totalCalls = () => [...providerCalls.values()].reduce((a, b) => a + b, 0);
const generateFor =
  (jobId: string): GenerateSong =>
  async () => {
    providerCalls.set(jobId, (providerCalls.get(jobId) ?? 0) + 1);
    return providerBehaviour(jobId);
  };

beforeEach(() => {
  clock = T0;
  queue = new MockQueue();
  bucket = new MockBucket();
  providerCalls = new Map();
  providerBehaviour = async () => song();
  opened = [];
  vi.stubGlobal("fetch", fakeSupabase({ [OWNER_TOKEN]: OWNER }).fetch);
});
afterEach(() => {
  for (const db of opened) {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  }
  vi.unstubAllGlobals();
});

/** A shared database file; each call of `connection()` opens one more connection on it. */
function sharedDb() {
  const { file, open } = pilotDbFile();
  const connection = () => {
    const db = open();
    opened.push(db);
    return db;
  };
  return { file, connection, inspect: connection() };
}

const WORKER = resolve("src/test/pilot-sql-race.worker.mjs");

/** N threads run the same statement at the same instant; returns how many got a row back. */
async function threadRace(file: string, op: keyof typeof SQL, argsList: unknown[][]) {
  const barrier = new SharedArrayBuffer(4);
  const runs = argsList.map(
    (args) =>
      new Promise<{ won: boolean; error: string | null }>((ok, ko) => {
        const w = new Worker(WORKER, { workerData: { file, sql: SQL[op], args, barrier } });
        w.once("message", ok);
        w.once("error", ko);
      }),
  );
  await new Promise((r) => setTimeout(r, 400)); // every thread has opened its connection and waits
  Atomics.store(new Int32Array(barrier), 0, 1);
  Atomics.notify(new Int32Array(barrier), 0);
  const results = await Promise.all(runs);
  return { won: results.filter((r) => r.won).length, errors: results.filter((r) => r.error).map((r) => r.error) };
}

const rows = (db: SqliteDb) => (db.prepare("SELECT count(*) AS n FROM aimf_pilot_jobs").get() as { n: number }).n;
const job = (db: SqliteDb, id: string) =>
  db.prepare("SELECT state, handoffs, provider_engaged_at, review_reason, updated_at FROM aimf_pilot_jobs WHERE id = ?").get(id) as {
    state: string;
    handoffs: number;
    provider_engaged_at: number | null;
    review_reason: string | null;
    updated_at: number;
  };

/** One signed request through the real Worker front, on its own connection. */
const serviceCall = async (connection: () => SqliteDb, req: Request) =>
  handlePilotServiceRequest(req, openBindings(sqliteD1(connection()), queue, bucket), { now: () => clock, processEnv: {}, log: () => {} });

// ================================================================ T-C: concurrency and idempotency
describeSql("T-C concurrency: one attempt, one engagement, one hand-off", () => {
  it(`T-C1 ${N} simultaneous signed POSTs, same key: 1 row, one 202 and ${N - 1} replays, one queue.send`, async () => {
    const { connection, inspect } = sharedDb();
    const reqs = await Promise.all(Array.from({ length: N }, () => signedRequest({ method: "POST", body: BODY, idempotencyKey: uuid(1), nowSeconds: clock })));
    const res = await Promise.all(reqs.map((r) => serviceCall(connection, r)));
    const bodies = await Promise.all(res.map((r) => r.json()));
    expect(res.filter((r) => r.status === 202)).toHaveLength(1);
    expect(res.filter((r, i) => r.status === 200 && bodies[i].replay === true)).toHaveLength(N - 1);
    expect(new Set(bodies.map((b) => b.job.id))).toEqual(new Set([uuid(1)]));
    expect(rows(inspect)).toBe(1);
    expect(queue.sent).toEqual([{ v: 1, jobId: uuid(1) }]);
  });

  it(`T-C2 ${N} simultaneous signed POSTs, different keys: 1 row, ${N - 1} answers 409 generation_in_progress`, async () => {
    const { connection, inspect } = sharedDb();
    const reqs = await Promise.all(Array.from({ length: N }, (_, i) => signedRequest({ method: "POST", body: BODY, idempotencyKey: uuid(100 + i), nowSeconds: clock })));
    const res = await Promise.all(reqs.map((r) => serviceCall(connection, r)));
    const codes = await Promise.all(res.map(async (r) => (r.status === 202 ? "accepted" : (await r.json()).code)));
    expect(codes.filter((c) => c === "accepted")).toHaveLength(1);
    expect(codes.filter((c) => c === "generation_in_progress")).toHaveLength(N - 1);
    expect(rows(inspect)).toBe(1);
    expect(queue.sent).toHaveLength(1);
  });

  it(`T-C3 ${N} threads run claim at the same instant: one engagement`, async () => {
    const { file, inspect } = sharedDb();
    inspect.prepare(SQL.reserve).get(uuid(2), OWNER, "a".repeat(64), JSON.stringify(BODY), clock);
    const race = await threadRace(file, "claim", Array.from({ length: N }, () => [uuid(2), clock + 1]));
    expect(race).toEqual({ won: 1, errors: [] });
    expect(job(inspect, uuid(2))).toMatchObject({ state: "running", provider_engaged_at: clock + 1 });
  });

  it(`T-C3 ${N} deliveries of the same message, each on its own connection: the provider spy is called once`, async () => {
    const { connection, inspect } = sharedDb();
    inspect.prepare(SQL.reserve).get(uuid(2), OWNER, "a".repeat(64), JSON.stringify(BODY), clock);
    const outcomes = await Promise.all(
      Array.from({ length: N }, () =>
        processPilotMessage({ v: 1, jobId: uuid(2) }, openBindings(sqliteD1(connection()), queue, bucket), { now: () => clock, processEnv: {}, generate: generateFor(uuid(2)) }),
      ),
    );
    expect(providerCalls.get(uuid(2))).toBe(1);
    expect(outcomes.filter((o) => o === "stored")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "not_claimed")).toHaveLength(N - 1);
  });

  it("T-C4 (C-1) 2 and then 32 threads lease the same idle hand-off: one winner, handoffs + 1", async () => {
    const { file, inspect } = sharedDb();
    inspect.prepare(SQL.reserve).get(uuid(3), OWNER, "a".repeat(64), JSON.stringify(BODY), clock);
    const seen = job(inspect, uuid(3)).updated_at;
    expect(await threadRace(file, "leaseHandoff", [[uuid(3), clock + 61, seen], [uuid(3), clock + 61, seen]])).toEqual({ won: 1, errors: [] });
    expect(job(inspect, uuid(3)).handoffs).toBe(1);
    const seen2 = job(inspect, uuid(3)).updated_at;
    expect((await threadRace(file, "leaseHandoff", Array.from({ length: N }, () => [uuid(3), clock + 122, seen2]))).won).toBe(1);
    expect(job(inspect, uuid(3)).handoffs).toBe(2);
  });

  it("T-C4 (C-1) Cron and owner visits reconciling at the same instant: ONE message, handoffs counted once", async () => {
    const { connection, inspect } = sharedDb();
    queue.failSends = 1; // the hand-off of the reservation is lost
    const post = await serviceCall(connection, await signedRequest({ method: "POST", body: BODY, idempotencyKey: uuid(4), nowSeconds: clock }));
    expect((await post.json()).handoff).toBe("pending");
    expect(job(inspect, uuid(4))).toMatchObject({ state: "reserved", handoffs: 0 });
    clock += RECONCILE_IDLE_SECONDS + 1;
    const store = () => createPilotStore(sqliteD1(connection()), () => clock);
    await Promise.all([
      runScheduledReconciliation(openBindings(sqliteD1(connection()), queue, bucket), { now: () => clock, processEnv: {} }),
      ...Array.from({ length: 7 }, () => reconcilePilot(store(), bucket, queue, { canEnqueue: true })),
      ...(await Promise.all(Array.from({ length: 8 }, () => signedRequest({ nowSeconds: clock })))).map((r) => serviceCall(connection, r)),
    ]);
    expect(queue.sent).toEqual([{ v: 1, jobId: uuid(4) }]);
    expect(job(inspect, uuid(4))).toMatchObject({ state: "queued", handoffs: 1 });
  });

  it("T-C4 (C-1) the same for the recover message of a silent engaged attempt: one message", async () => {
    const { connection, inspect } = sharedDb();
    inspect.prepare(SQL.reserve).get(uuid(5), OWNER, "a".repeat(64), JSON.stringify(BODY), clock);
    inspect.prepare(SQL.claim).get(uuid(5), clock);
    await bucket.put(`pilot/${OWNER}/${uuid(5)}.mp3`, AUDIO);
    clock += RECONCILE_RUNNING_SECONDS + 1;
    await Promise.all(Array.from({ length: 16 }, () => reconcilePilot(createPilotStore(sqliteD1(connection()), () => clock), bucket, queue, { canEnqueue: true })));
    expect(queue.sent).toEqual([{ v: 1, jobId: uuid(5), op: "recover" }]);
  });

  it("T-C5 reconciliations racing a LIVE consumer (engaged less than 20 min ago): no recover, no review", async () => {
    const { connection, inspect } = sharedDb();
    const b = () => openBindings(sqliteD1(connection()), queue, bucket);
    let release!: () => void;
    providerBehaviour = () => new Promise<LyriaSong>((ok) => (release = () => ok(song())));
    inspect.prepare(SQL.reserve).get(uuid(6), OWNER, "a".repeat(64), JSON.stringify(BODY), clock);
    const consumer = processPilotMessage({ v: 1, jobId: uuid(6) }, b(), { now: () => clock, processEnv: {}, generate: generateFor(uuid(6)) });
    await vi.waitFor(() => expect(job(inspect, uuid(6)).state).toBe("running"));
    for (const later of [5 * 60, RECONCILE_RUNNING_SECONDS - 1]) {
      clock = T0 + later;
      const reports = await Promise.all(Array.from({ length: 8 }, () => reconcilePilot(createPilotStore(sqliteD1(connection()), () => clock), bucket, queue, { canEnqueue: true })));
      for (const r of reports) expect(r).toEqual({ requeued: [], recoveryQueued: [], sentToReview: [], halted: [] });
      // A stray recover message cannot touch it either while it is young.
      expect(await processPilotMessage({ v: 1, jobId: uuid(6), op: "recover" }, b(), { now: () => clock, processEnv: {} })).toBe("not_claimed");
    }
    release();
    expect(await consumer).toBe("stored");
    expect(job(inspect, uuid(6))).toMatchObject({ state: "stored", review_reason: null });
    expect(queue.sent).toEqual([]);
    expect(totalCalls()).toBe(1);
  });

  it("T-C6 same key, two different contents, all at once: 1 row; the other content gets 409 idempotency_key_reused", async () => {
    const { connection, inspect } = sharedDb();
    const other = { ...BODY, prompt: "Another song entirely" };
    const reqs = await Promise.all(
      Array.from({ length: N }, (_, i) => signedRequest({ method: "POST", body: i % 2 ? other : BODY, idempotencyKey: uuid(7), nowSeconds: clock })),
    );
    const res = await Promise.all(reqs.map((r) => serviceCall(connection, r)));
    const out = await Promise.all(res.map(async (r, i) => ({ i, status: r.status, body: await r.json() })));
    const winner = out.find((o) => o.status === 202)!;
    const sameAsWinner = out.filter((o) => o.i % 2 === winner.i % 2);
    const otherContent = out.filter((o) => o.i % 2 !== winner.i % 2);
    expect(out.filter((o) => o.status === 202)).toHaveLength(1);
    expect(sameAsWinner.filter((o) => o.status === 200 && o.body.replay === true)).toHaveLength(N / 2 - 1);
    expect(otherContent.every((o) => o.status === 409 && o.body.code === "idempotency_key_reused")).toBe(true);
    expect(rows(inspect)).toBe(1);
    expect(queue.sent).toHaveLength(1);
  });
});

// ================================================================ T-K: the cap, on every path
type Scenario = {
  name: string;
  run: (h: Harness) => Promise<void>;
  expectCalls: number;
};
interface Harness {
  db: SqliteDb;
  faults: D1Faults;
  bindings: PrivateLyriaBindings;
  post: (id: string, body?: unknown) => Promise<Response>;
  get: (query?: string) => Promise<Response>;
  deliver: (dup?: boolean) => Promise<string[]>;
  cron: () => Promise<unknown>;
}
function harness(): Harness {
  const db = new sqlite!.DatabaseSync(":memory:");
  db.exec(PILOT_SCHEMA_SQL);
  const faults: D1Faults = {};
  const bindings = openBindings(sqliteD1(db, faults), queue, bucket, { AIMF_PRIVATE_LYRIA_PROVIDER: "lyria-3.5", GEMINI_API_KEY: "TEST-KEY-not-a-real-key-000000000" });
  const verify = async () => ({ ok: true as const, userId: OWNER });
  const request = (method: string, query = "", init: { id?: string; body?: unknown } = {}) =>
    new Request(`https://aimf.test/api/studio/lyria-private${query}`, {
      method,
      headers: { origin: "https://aimf.test", ...(init.id ? { "idempotency-key": init.id } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  const deps = () => ({ verify, now: () => clock, processEnv: {} });
  return {
    db,
    faults,
    bindings,
    post: (id, body = BODY) => handlePrivateLyriaRequest(request("POST", "", { id, body }), bindings, deps()),
    get: (query = "") => handlePrivateLyriaRequest(request("GET", query), bindings, deps()),
    async deliver(dup = false) {
      const taken = queue.sent.splice(0);
      const messages = (dup ? [...taken, ...taken] : taken).map((body: PilotMessage) => ({ body, ack() {} }));
      const out: string[] = [];
      for (const m of messages) out.push(...(await consumePrivateLyriaBatch({ messages: [m] }, bindings, { now: () => clock, processEnv: {}, generate: generateFor(m.body.jobId) })));
      return out;
    },
    cron: () => runScheduledReconciliation(bindings, { now: () => clock, processEnv: {} }),
  };
}
const engagedRows = (db: SqliteDb) => (db.prepare("SELECT count(*) AS n FROM aimf_pilot_jobs WHERE provider_engaged_at IS NOT NULL").get() as { n: number }).n;

const SCENARIOS: Scenario[] = [
  {
    name: "D1 down at the reservation: 503, nothing reserved",
    expectCalls: 0,
    run: async (h) => {
      h.faults.down = true;
      expect((await h.post(uuid(1))).status).toBe(503);
      h.faults.down = false;
      expect(rows(h.db)).toBe(0);
    },
  },
  {
    name: "reservation recorded, answer lost: the same key again is the same attempt",
    expectCalls: 1,
    run: async (h) => {
      await h.post(uuid(1));
      expect((await (await h.post(uuid(1))).json()).replay).toBe(true);
      await h.deliver();
      expect(rows(h.db)).toBe(1);
    },
  },
  {
    name: "queue down: relayed by the reconciliation at most 4 times, then halted, never engaged",
    expectCalls: 0,
    run: async (h) => {
      queue.down = true;
      await h.post(uuid(1));
      for (let i = 0; i < 8; i++) {
        clock += RECONCILE_IDLE_SECONDS + 1;
        await h.cron();
      }
      expect(job(h.db, uuid(1))).toMatchObject({ state: "halted", review_reason: "handoff_exhausted", provider_engaged_at: null });
      expect(job(h.db, uuid(1)).handoffs).toBeLessThanOrEqual(PILOT_MAX_HANDOFFS);
      queue.down = false;
    },
  },
  {
    name: "message delivered twice: one claim wins",
    expectCalls: 1,
    run: async (h) => {
      await h.post(uuid(1));
      expect((await h.deliver(true)).sort()).toEqual(["not_claimed", "stored"]);
    },
  },
  {
    name: "claim fails on D1: no provider call",
    expectCalls: 0,
    run: async (h) => {
      await h.post(uuid(1));
      h.faults.failOn = SQL.claim;
      expect(await h.deliver()).toEqual(["unconfigured"]);
      h.faults.failOn = null;
    },
  },
  {
    name: "consumer dies between claim and the provider call: review outcome_unknown after 20 min, zero call",
    expectCalls: 0,
    run: async (h) => {
      await h.post(uuid(1));
      queue.sent = [];
      await createPilotStore(h.bindings.AIMF_PRIVATE_LYRIA_DB!, () => clock).claim(uuid(1));
      clock += RECONCILE_RUNNING_SECONDS + 1;
      await h.cron();
      expect(job(h.db, uuid(1))).toMatchObject({ state: "needs_review", review_reason: "outcome_unknown" });
    },
  },
  ...(["error", "429", "timeout"] as const).map((kind) => ({
    name: `provider ${kind}: needs_review, never called again`,
    expectCalls: 1,
    run: async (h: Harness) => {
      providerBehaviour = async () => {
        if (kind === "429") throw new LyriaGenerationError("upstream_rejected", 429);
        if (kind === "timeout") throw new DOMException("timed out", "TimeoutError");
        throw new Error("provider down");
      };
      await h.post(uuid(1));
      queue.sent.push({ v: 1, jobId: uuid(1) });
      await h.deliver(true);
      expect(job(h.db, uuid(1)).state).toBe("needs_review");
      clock += RECONCILE_RUNNING_SECONDS + 1;
      await h.cron();
      await h.deliver();
    },
  })),
  {
    name: "song received, R2 write fails: storage_failed, no new call",
    expectCalls: 1,
    run: async (h) => {
      bucket.failPuts = 2;
      await h.post(uuid(1));
      await h.deliver();
      expect(job(h.db, uuid(1))).toMatchObject({ state: "needs_review", review_reason: "storage_failed" });
    },
  },
  {
    name: "song stored, markStored fails: recover after 20 min, content hashed, stored, no new call",
    expectCalls: 1,
    run: async (h) => {
      await h.post(uuid(1));
      h.faults.failOn = SQL.markStored;
      expect(await h.deliver()).toEqual(["stored_unconfirmed"]);
      h.faults.failOn = null;
      clock += RECONCILE_RUNNING_SECONDS + 1;
      await h.cron();
      expect(await h.deliver()).toEqual(["stored"]);
    },
  },
  {
    name: "pilot paused at the delivery: paused, acknowledged, relayed once open again",
    expectCalls: 1,
    run: async (h) => {
      await h.post(uuid(1));
      h.bindings.AI_ROUTES_PAUSED = "1";
      expect(await h.deliver()).toEqual(["paused"]);
      h.bindings.AI_ROUTES_PAUSED = "0";
      clock += RECONCILE_IDLE_SECONDS + 1;
      await h.cron();
      expect(await h.deliver()).toEqual(["stored"]);
    },
  },
  {
    name: "a GET replayed many times: reads and reconciles, never a call",
    expectCalls: 0,
    run: async (h) => {
      for (let i = 0; i < 20; i++) await h.get();
      expect(rows(h.db)).toBe(0);
    },
  },
];

describeSql("T-K1 every error and recovery path: provider calls <= attempts <= 5", () => {
  it.each(SCENARIOS.map((s) => [s.name, s] as const))("%s", async (_name, scenario) => {
    const h = harness();
    await scenario.run(h);
    expect(totalCalls()).toBe(scenario.expectCalls);
    expect(totalCalls()).toBeLessThanOrEqual(engagedRows(h.db));
    expect(rows(h.db)).toBeLessThanOrEqual(PILOT_HARD_MAX_ATTEMPTS);
    for (const n of providerCalls.values()) expect(n).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------- T-K2 fuzz
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describeSql("T-K2 random walk (fixed seed): the invariants hold after every event", () => {
  const SEQUENCES = 1000;
  const EVENTS = 200;
  it(`${SEQUENCES} sequences of ${EVENTS} events`, async () => {
    const rand = mulberry32(0xa1af2026);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
    const stats = { events: 0, calls: 0, stored: 0, reviews: 0, halted: 0, manualReviews: 0, maxRows: 0 };
    for (let s = 0; s < SEQUENCES; s++) {
      clock = T0;
      queue = new MockQueue();
      bucket = new MockBucket();
      providerCalls = new Map();
      const db = new sqlite!.DatabaseSync(":memory:");
      db.exec(PILOT_SCHEMA_SQL);
      const faults: D1Faults = {};
      const bindings = openBindings(sqliteD1(db, faults, undefined, "microtask"), queue, bucket, {
        AIMF_PRIVATE_LYRIA_PROVIDER: "lyria-3.5",
        GEMINI_API_KEY: "TEST-KEY-not-a-real-key-000000000",
      });
      const verify = async () => ({ ok: true as const, userId: OWNER });
      const deps = { verify, now: () => clock, processEnv: {} };
      const keys: string[] = [];
      let manualReviews = 0;
      let lastRows = 0;
      const engagedAt = new Map<string, number>();
      providerBehaviour = async () => {
        const r = rand();
        if (r < 0.15) throw new Error("provider down");
        if (r < 0.22) throw new LyriaGenerationError("upstream_rejected", 429);
        if (r < 0.26) return song({ audio: new Uint8Array(0) });
        return song();
      };
      const req = (method: string, query = "", id?: string, body?: unknown) =>
        new Request(`https://aimf.test/api/studio/lyria-private${query}`, {
          method,
          headers: { origin: "https://aimf.test", ...(id ? { "idempotency-key": id } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      const actions: (() => Promise<unknown>)[] = [
        async () => {
          const id = uuid(s * 1000 + keys.length + 1);
          keys.push(id);
          return handlePrivateLyriaRequest(req("POST", "", id, BODY), bindings, deps);
        },
        async () => (keys.length ? handlePrivateLyriaRequest(req("POST", "", pick(keys), BODY), bindings, deps) : null),
        async () => (keys.length ? handlePrivateLyriaRequest(req("POST", "", pick(keys), { prompt: "other" }), bindings, deps) : null),
        async () => handlePrivateLyriaRequest(req("GET"), bindings, deps),
        async () => (keys.length ? handlePrivateLyriaRequest(req("GET", `?job=${pick(keys)}${rand() < 0.5 ? "&audio=1" : ""}`), bindings, deps) : null),
        async () => runScheduledReconciliation(bindings, { now: () => clock, processEnv: {} }),
        async () => {
          const taken = queue.sent.splice(0, 1 + Math.floor(rand() * 2));
          const messages = (rand() < 0.3 ? [...taken, ...taken] : taken).map((body) => ({ body, ack() {} }));
          for (const m of messages) {
            await consumePrivateLyriaBatch({ messages: [m] }, bindings, { now: () => clock, processEnv: {}, generate: generateFor(m.body.jobId) });
          }
        },
        async () => {
          // A consumer that dies right after its claim: engaged, provider never called.
          const m = queue.sent.shift();
          if (m && m.op !== "recover") await createPilotStore(bindings.AIMF_PRIVATE_LYRIA_DB!, () => clock).claim(m.jobId).catch(() => null);
        },
        async () => void (faults.down = rand() < 0.5),
        async () => void (faults.failOn = rand() < 0.5 ? pick([SQL.claim, SQL.markStored, SQL.markQueued, SQL.leaseHandoff, SQL.reserve, SQL.markNeedsReview]) : null),
        async () => void (bucket.down = rand() < 0.3),
        async () => void (bucket.failPuts = rand() < 0.3 ? 2 : 0),
        async () => void (queue.down = rand() < 0.3),
        async () => void (bindings.AI_ROUTES_PAUSED = rand() < 0.3 ? "1" : "0"),
        async () => void (clock += 1 + Math.floor(rand() * 1500)),
        async () => {
          // The owner closes a review by hand (the only writer of `reviewed`).
          const r = db.prepare("UPDATE aimf_pilot_jobs SET state = 'reviewed' WHERE state = 'needs_review' RETURNING id").all();
          manualReviews += r.length;
        },
      ];
      for (let e = 0; e < EVENTS; e++) {
        const burst = rand() < 0.2 ? 2 + Math.floor(rand() * 2) : 1;
        await Promise.all(Array.from({ length: burst }, () => pick(actions)().catch(() => null)));
        stats.events += burst;
        // ---- invariants
        const all = db.prepare("SELECT id, state, provider_engaged_at, handoffs FROM aimf_pilot_jobs").all() as {
          id: string;
          state: string;
          provider_engaged_at: number | null;
          handoffs: number;
        }[];
        expect(all.length).toBeGreaterThanOrEqual(lastRows); // nothing deleted
        expect(all.length).toBeLessThanOrEqual(PILOT_HARD_MAX_ATTEMPTS);
        lastRows = all.length;
        const engaged = all.filter((r) => r.provider_engaged_at !== null);
        expect(totalCalls()).toBeLessThanOrEqual(engaged.length);
        expect(totalCalls()).toBeLessThanOrEqual(PILOT_HARD_MAX_ATTEMPTS);
        for (const [id, n] of providerCalls) {
          expect(n).toBeLessThanOrEqual(1);
          expect(engaged.some((r) => r.id === id)).toBe(true);
        }
        for (const r of engaged) {
          if (engagedAt.has(r.id)) expect(r.provider_engaged_at).toBe(engagedAt.get(r.id));
          else engagedAt.set(r.id, r.provider_engaged_at!);
        }
        expect(all.filter((r) => r.state === "reviewed")).toHaveLength(manualReviews);
        for (const r of all) expect(r.handoffs).toBeLessThanOrEqual(PILOT_MAX_HANDOFFS);
      }
      stats.calls += totalCalls();
      stats.maxRows = Math.max(stats.maxRows, lastRows);
      const final = db.prepare("SELECT state FROM aimf_pilot_jobs").all() as { state: string }[];
      stats.stored += final.filter((r) => r.state === "stored").length;
      stats.reviews += final.filter((r) => r.state === "needs_review" || r.state === "reviewed").length;
      stats.halted += final.filter((r) => r.state === "halted").length;
      stats.manualReviews += manualReviews;
      db.close();
    }
    console.info(`[T-K2] ${JSON.stringify(stats)}`);
    expect(stats.events).toBeGreaterThanOrEqual(SEQUENCES * EVENTS);
    // The walk really explores: songs stored, reviews, halts and full caps all occur.
    expect(stats.stored).toBeGreaterThan(0);
    expect(stats.reviews).toBeGreaterThan(0);
    expect(stats.halted).toBeGreaterThan(0);
    expect(stats.maxRows).toBe(PILOT_HARD_MAX_ATTEMPTS);
  }, 900_000);
});

describeSql("T-K3 the schema refuses every way around the cap", () => {
  it("direct insert past five, max_attempts = 6, DELETE, re-engagement, and a claim of a row already engaged", () => {
    const db = new sqlite!.DatabaseSync(":memory:");
    db.exec(PILOT_SCHEMA_SQL);
    for (let i = 0; i < 5; i++) {
      const id = uuid(200 + i);
      db.prepare(SQL.reserve).get(id, OWNER, "a".repeat(64), JSON.stringify(BODY), 1);
      db.prepare(SQL.claim).get(id, 2);
      db.prepare(SQL.markNeedsReview).get(id, "provider_failed", 3);
      db.prepare("UPDATE aimf_pilot_jobs SET state = 'reviewed' WHERE id = ?").run(id);
    }
    expect(db.prepare(SQL.reserve).get(uuid(299), OWNER, "a".repeat(64), "{}", 4) ?? null).toBeNull();
    expect(() =>
      db.prepare("INSERT INTO aimf_pilot_jobs (id, owner_id, request_hash, input_json, state, created_at, updated_at) VALUES (?, ?, ?, '{}', 'reserved', 1, 1)").run(uuid(298), OWNER, "a".repeat(64)),
    ).toThrow(/hard cap of five/);
    expect(() => db.exec("UPDATE aimf_pilot_settings SET max_attempts = 6")).toThrow(/CHECK/);
    expect(() => db.exec("DELETE FROM aimf_pilot_jobs")).toThrow(/never deleted/);
    expect(() => db.prepare("UPDATE aimf_pilot_jobs SET provider_engaged_at = 99 WHERE id = ?").run(uuid(200))).toThrow(/written once/);
    expect(rows(db)).toBe(5);

    // Defence in depth: a row marked engaged while still queued (by hand) can never be claimed again.
    const fresh = new sqlite!.DatabaseSync(":memory:");
    fresh.exec(PILOT_SCHEMA_SQL);
    fresh.prepare(SQL.reserve).get(uuid(300), OWNER, "a".repeat(64), "{}", 1);
    fresh.prepare("UPDATE aimf_pilot_jobs SET state = 'queued', provider_engaged_at = 5 WHERE id = ?").run(uuid(300));
    expect(fresh.prepare(SQL.claim).get(uuid(300), 6) ?? null).toBeNull();
    db.close();
    fresh.close();
  });
});

describe("T-K4 (C-2) the Lovable application has no second consumer", () => {
  it("src/server.ts exports fetch only: no queue(), no scheduled()", async () => {
    const server = (await import("@/server")).default as Record<string, unknown>;
    expect(Object.keys(server)).toEqual(["fetch"]);
  });

  it("the application relays the pilot path without loading D1, the queue consumer or the provider", async () => {
    const imports = ["src/server.ts", "src/music/private-pilot-relay.ts"].flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/g)].map((m) => m[1]),
    );
    expect(imports).toContain("./music/private-pilot-relay");
    const forbidden = /private-demo-handler|private-pilot-worker|private-pilot-store|private-pilot-sql|lyria35|private-pilot-entry|private-pilot-service/;
    expect(imports.filter((i) => forbidden.test(i))).toEqual([]);
    const server = (await import("@/server")).default as { fetch: (r: Request, e: unknown, c: unknown) => Promise<Response> };
    const res = await server.fetch(new Request("https://aimf.test/api/studio/lyria-private", { headers: { origin: "https://aimf.test" } }), {}, {});
    expect(res.status).toBe(503); // closed: no emergency-stop value, no relay configuration
  });

  it("only the signed service front may call the handler without the same-origin check", () => {
    const callers = ["src/server.ts", "src/music/private-pilot-relay.ts", "src/music/private-pilot-entry.ts", "src/music/private-pilot-worker.ts", "src/components/premium/PrivateLyriaPilot.tsx"]
      .filter((f) => readFileSync(f, "utf8").includes("handleVerifiedPilotRequest"));
    expect(callers).toEqual([]);
    expect(readFileSync("src/music/private-pilot-service.ts", "utf8")).toContain("handleVerifiedPilotRequest(verified");
    expect(readFileSync("docs/music/cloudflare/wrangler.recette.jsonc", "utf8")).toContain('"main": "../../../src/music/private-pilot-entry.ts"');
  });
});
