/**
 * Test support of the private Lyria pilot (P3a): the real SQL on the real SQLite engine, a queue, a private bucket,
 * a fake Supabase session service and signed requests. Used by tests only; nothing here reaches a real host.
 */
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { D1Like, PilotMessage, PrivateLyriaBindings, R2Like } from "@/music/private-pilot-bindings";
import { PILOT_INTERNAL_PATH, signPilotRequest, type PilotKeyId } from "@/music/private-pilot-hmac";
import { PILOT_SCHEMA_SQL } from "@/music/private-pilot-sql";

export type SqliteDb = {
  exec(sql: string): void;
  close(): void;
  prepare(sql: string): { get(...v: unknown[]): unknown; all(...v: unknown[]): unknown[]; run(...v: unknown[]): unknown };
};
export const sqlite = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule?.("node:sqlite") as
  | { DatabaseSync: new (path: string) => SqliteDb }
  | undefined;

export interface D1Faults {
  /** Every statement fails while true (D1 unavailable). */
  down?: boolean;
  /** Only this exact statement fails. */
  failOn?: string | null;
}

export interface D1Counter {
  statements: number;
}

/**
 * D1 over node:sqlite. `pause: "timer"` yields a macrotask before each statement (concurrent requests interleave
 * between statements, like D1 serializing them); `"microtask"` is the fast variant for long fuzz runs.
 */
export function sqliteD1(db: SqliteDb, faults: D1Faults = {}, counter?: D1Counter, pause: "timer" | "microtask" = "timer"): D1Like {
  const yieldNow = pause === "timer" ? () => new Promise<void>((r) => setTimeout(r, 0)) : () => Promise.resolve();
  return {
    prepare(sql: string) {
      let values: (string | number | null)[] = [];
      const guard = () => {
        if (counter) counter.statements++;
        if (faults.down || (faults.failOn && sql === faults.failOn)) throw new Error("injected D1 failure");
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

/** A database FILE in WAL mode, so several connections (or threads) share it like D1 clients share one database. */
export function pilotDbFile(): { file: string; open: () => SqliteDb } {
  if (!sqlite) throw new Error("node:sqlite unavailable");
  const file = join(mkdtempSync(join(tmpdir(), "aimf-p3a-")), "pilot.db");
  const open = () => {
    const db = new sqlite!.DatabaseSync(file);
    db.exec("PRAGMA busy_timeout = 10000;");
    return db;
  };
  const first = open();
  first.exec("PRAGMA journal_mode = WAL;");
  first.exec(PILOT_SCHEMA_SQL);
  first.close();
  return { file, open };
}

export class MockQueue {
  sent: PilotMessage[] = [];
  failSends = 0;
  down = false;
  async send(body: PilotMessage) {
    if (this.down) throw new Error("injected queue outage");
    if (this.failSends > 0) {
      this.failSends--;
      throw new Error("injected queue failure");
    }
    this.sent.push(JSON.parse(JSON.stringify(body)) as PilotMessage);
  }
}

export const sha256HexNode = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

export class MockBucket implements R2Like {
  objects = new Map<string, { bytes: Uint8Array; meta: Record<string, string> }>();
  ops = 0;
  failPuts = 0;
  down = false;
  async put(key: string, value: Uint8Array | string, options?: { customMetadata?: Record<string, string>; sha256?: string }) {
    this.ops++;
    if (this.down) throw new Error("injected R2 outage");
    if (this.failPuts > 0) {
      this.failPuts--;
      throw new Error("injected R2 failure");
    }
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value.slice();
    if (options?.sha256 && sha256HexNode(bytes) !== options.sha256) throw new Error("R2: sha256 mismatch");
    this.objects.set(key, { bytes, meta: { ...(options?.customMetadata ?? {}) } });
    return { size: bytes.byteLength, customMetadata: options?.customMetadata };
  }
  async head(key: string) {
    this.ops++;
    if (this.down) throw new Error("injected R2 outage");
    const o = this.objects.get(key);
    return o ? { size: o.bytes.byteLength, customMetadata: o.meta } : null;
  }
  async get(key: string) {
    this.ops++;
    if (this.down) throw new Error("injected R2 outage");
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

/** A string shaped like a session JWT (three base64url parts), unique per name. Not a real token. */
export const sessionToken = (name: string) => `eyTEST${name}aaaa.bbbbbbbb${name}.cccccccc${name}`;

/**
 * The project's session service, simulated: `GET .../auth/v1/user` answers the user of a known token, 401 for an
 * unknown one. `down` = unreachable. Any other address is refused (no real network in tests).
 */
export function fakeSupabase(users: Record<string, string>) {
  const state = { calls: 0, down: false };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.endsWith("/auth/v1/user")) throw new Error(`unexpected fetch in test: ${new URL(url).host}`);
    state.calls++;
    if (state.down) throw new TypeError("network unreachable (injected)");
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const user = users[token];
    return user ? Response.json({ id: user }) : Response.json({ msg: "invalid" }, { status: 401 });
  }) as typeof fetch;
  return Object.assign(state, { fetch: fetchImpl });
}

export const TEST_K1 = "TEST-ONLY-k1-not-a-real-secret-000000000001";
export const TEST_K2 = "TEST-ONLY-k2-not-a-real-secret-000000000002";
export const WORKER_ORIGIN = "https://pilot-worker.test";
export const APP_ORIGIN = "https://aimf.test";
export const OWNER = "owner-1";
export const OWNER_TOKEN = sessionToken("owner");
export const OTHER_TOKEN = sessionToken("other");
export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const BODY = { prompt: "A bright afrobeats song", genre: "Afrobeats", language: "French" };
export const AUDIO = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0xff, 0xfb, 1, 2, 3, 4, 5, 6, 7, 8]);

export interface SignedOptions {
  method?: "GET" | "POST" | "PUT";
  query?: string;
  body?: unknown;
  /** Raw bytes sent instead of the JSON of `body` (the signature still covers `body` unless `signBytes` is set). */
  sendBytes?: Uint8Array;
  signBytes?: Uint8Array;
  token?: string | null;
  sendToken?: string | null;
  idempotencyKey?: string | null;
  sendIdempotencyKey?: string | null;
  keyId?: PilotKeyId | string;
  secret?: string;
  audience?: string;
  nowSeconds: number;
  sendQuery?: string;
  extraHeaders?: Record<string, string>;
  path?: string;
  dropHeaders?: string[];
  overrideHeaders?: Record<string, string>;
}

/** A request as the relay would send it to the Worker, with knobs to break each part of it. */
export async function signedRequest(o: SignedOptions): Promise<Request> {
  const method = o.method ?? "GET";
  const bytes = o.body === undefined ? new Uint8Array(0) : new TextEncoder().encode(JSON.stringify(o.body));
  const signBytes = o.signBytes ?? bytes;
  const sendBytes = o.sendBytes ?? bytes;
  const token = o.token === undefined ? OWNER_TOKEN : o.token;
  const sendToken = o.sendToken === undefined ? token : o.sendToken;
  const idem = o.idempotencyKey ?? null;
  const sendIdem = o.sendIdempotencyKey === undefined ? idem : o.sendIdempotencyKey;
  const query = o.query ?? "";
  const signature = await signPilotRequest({
    method: method === "PUT" ? "PUT" : method,
    search: query,
    body: signBytes,
    authorization: token ? `Bearer ${token}` : null,
    idempotencyKey: idem,
    audience: o.audience ?? "aimf-lyria-pilot-recette",
    keyId: (o.keyId ?? "k1") as PilotKeyId,
    secret: o.secret ?? TEST_K1,
    nowSeconds: o.nowSeconds,
  });
  const headers = new Headers(signature);
  if (sendToken) headers.set("authorization", `Bearer ${sendToken}`);
  if (sendIdem) headers.set("idempotency-key", sendIdem);
  if (method === "POST") headers.set("content-type", "application/json");
  for (const [k, v] of Object.entries(o.extraHeaders ?? {})) headers.set(k, v);
  for (const [k, v] of Object.entries(o.overrideHeaders ?? {})) headers.set(k, v);
  for (const k of o.dropHeaders ?? []) headers.delete(k);
  const search = o.sendQuery ?? query;
  return new Request(`${WORKER_ORIGIN}${o.path ?? PILOT_INTERNAL_PATH}${search}`, {
    method,
    headers,
    body: method === "GET" ? undefined : (sendBytes as Uint8Array<ArrayBuffer>),
  });
}

/** Bindings of a pilot Worker that is open, signed with k1, on the given D1. */
export function openBindings(db: D1Like, queue: MockQueue, bucket: MockBucket, patch: Partial<PrivateLyriaBindings> = {}): PrivateLyriaBindings {
  return {
    AIMF_PRIVATE_LYRIA_ENABLED: "1",
    AI_ROUTES_PAUSED: "0",
    AIMF_PRIVATE_LYRIA_PROVIDER: "mock",
    AIMF_PRIVATE_LYRIA_OWNER_ID: OWNER,
    AIMF_PRIVATE_LYRIA_DB: db,
    AIMF_PRIVATE_LYRIA_QUEUE: queue,
    AIMF_PRIVATE_LYRIA_BUCKET: bucket,
    SUPABASE_URL: "https://supabase.test",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TEST",
    AIMF_PILOT_HMAC_K1: TEST_K1,
    ...patch,
  };
}

/** The relay's environment, pointing at the simulated Worker. */
export const relayEnv = (patch: Record<string, string | undefined> = {}) => ({
  AI_ROUTES_PAUSED: "0",
  AIMF_PILOT_WORKER_URL: WORKER_ORIGIN,
  AIMF_PILOT_HMAC_K1: TEST_K1,
  AIMF_PRIVATE_LYRIA_OWNER_ID: OWNER,
  ...patch,
});
