import { AI_ROUTES_OPEN_VALUES } from "@/lib/api-guard";

/**
 * The few pieces of the Cloudflare runtime the private pilot uses, typed by what is called (so tests inject
 * plain objects: a SQLite-backed D1, an in-memory queue and bucket). Nothing here creates a resource.
 */
export interface D1Statement {
  bind(...values: (string | number | null)[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
}
/** Producer side of a Cloudflare Queue. Messages carry an id only (far below the 128 KB limit). */
export interface QueueLike {
  send(body: PilotMessage): Promise<void>;
}
export interface R2ObjectLike {
  size: number;
  customMetadata?: Record<string, string>;
}
export interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream<Uint8Array>;
  text(): Promise<string>;
}
/** A PRIVATE bucket binding: no public URL is ever built from it. */
export interface R2Like {
  put(
    key: string,
    value: Uint8Array | string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
      /** R2 recomputes the SHA-256 of what it received and refuses the write when it differs. */
      sha256?: string;
    },
  ): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
}

/**
 * `generate` (default) asks the consumer to engage the provider once; `recover` asks it to check, by hashing the
 * stored content, an attempt whose consumer went silent. A `recover` message can never engage the provider.
 */
export interface PilotMessage {
  v: 1;
  jobId: string;
  op?: "generate" | "recover";
}

/**
 * Which provider the consumer uses, EXACT values only: "lyria-3.5" (Google, may be billed, needs GEMINI_API_KEY) or
 * "mock" (a fictitious answer of real size, built in memory, no network). Anything else: the pilot is unconfigured.
 */
export type PilotProviderMode = "lyria-3.5" | "mock";
export const providerMode = (bindings: PrivateLyriaBindings | null | undefined): PilotProviderMode | null => {
  const value = bindings?.AIMF_PRIVATE_LYRIA_PROVIDER;
  return value === "lyria-3.5" || value === "mock" ? value : null;
};

/**
 * Who hashes a stored song when it is played. "client" (default): the bucket body is piped natively (no JavaScript
 * CPU in the 10 ms request) with the D1 fingerprint in `Repr-Digest`, and the browser checks the whole file before
 * playing it. "server" (exact value): the Worker also hashes it while it streams, at a measured cost of tens of ms
 * of CPU for 3 MB, to enable only where the plan's CPU limit allows it.
 */
export type AudioCheckMode = "client" | "server";
export const audioCheckMode = (bindings: PrivateLyriaBindings | null | undefined): AudioCheckMode =>
  bindings?.AIMF_PRIVATE_LYRIA_AUDIO_CHECK === "server" ? "server" : "client";

export interface PrivateLyriaBindings {
  AIMF_PRIVATE_LYRIA_ENABLED?: string;
  AIMF_PRIVATE_LYRIA_PROVIDER?: string;
  AIMF_PRIVATE_LYRIA_AUDIO_CHECK?: string;
  AIMF_PRIVATE_LYRIA_OWNER_ID?: string;
  AIMF_PRIVATE_LYRIA_DB?: D1Like;
  AIMF_PRIVATE_LYRIA_QUEUE?: QueueLike;
  AIMF_PRIVATE_LYRIA_BUCKET?: R2Like;
  GEMINI_API_KEY?: string;
  AI_ROUTES_PAUSED?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

type Env = Record<string, string | undefined>;

const isOpenValue = (value: string) =>
  (AI_ROUTES_OPEN_VALUES as readonly string[]).includes(value.trim().toLowerCase());

/**
 * The emergency stop shared with every AI route, FAIL-CLOSED. On Cloudflare the value may reach the code as a
 * binding (`env.AI_ROUTES_PAUSED`) or through `process.env` (nodejs_compat); both are read. The pilot is open only
 * when at least one of them is set and every one that is set says open ("0", "false", "no", "off"). Missing,
 * empty, unreadable or any other value: paused.
 */
export function aiRoutesPaused(bindings: PrivateLyriaBindings | null | undefined, processEnv?: Env): boolean {
  const env = processEnv ?? (typeof process !== "undefined" ? (process.env as Env) : {});
  const values = [bindings?.AI_ROUTES_PAUSED, env.AI_ROUTES_PAUSED].filter(
    (v): v is string => typeof v === "string",
  );
  return values.length === 0 || !values.every(isOpenValue);
}

/** The pilot's own switch: on only for the exact value "1". */
export const pilotEnabled = (bindings: PrivateLyriaBindings | null | undefined) =>
  bindings?.AIMF_PRIVATE_LYRIA_ENABLED === "1";

/**
 * Everything a part of the pilot needs before it may touch D1, the queue or the bucket. The provider key is only
 * required in "lyria-3.5" mode: the fictitious provider runs without any secret.
 */
export function pilotReady(bindings: PrivateLyriaBindings | null | undefined) {
  const mode = providerMode(bindings);
  const db = bindings?.AIMF_PRIVATE_LYRIA_DB;
  const queue = bindings?.AIMF_PRIVATE_LYRIA_QUEUE;
  const bucket = bindings?.AIMF_PRIVATE_LYRIA_BUCKET;
  const apiKey = bindings?.GEMINI_API_KEY?.trim() ?? "";
  if (!mode || !db || !queue || !bucket || (mode === "lyria-3.5" && !apiKey)) return null;
  return { mode, db, queue, bucket: pilotScopedBucket(bucket), apiKey };
}

/**
 * The pilot shares the AIMF bucket `aimf-media-staging` (private, EU jurisdiction) and owns ONLY its `pilot/` prefix.
 * Every bucket access of the pilot goes through `pilotScopedBucket`, applied once in `pilotReady`: a key outside
 * `pilot/`, with an empty, "." or ".." segment, a control character, a backslash or more than 1024 bytes is refused
 * before the bucket is reached. The wrapper exposes only put, head and get: the pilot can never list or delete.
 */
export const PILOT_PREFIX = "pilot/";
const MAX_R2_KEY_BYTES = 1024;

export class PilotKeyError extends Error {
  constructor() {
    super("bucket key outside the pilot prefix");
    this.name = "PilotKeyError";
  }
}

export function isPilotKey(key: unknown): key is string {
  if (typeof key !== "string" || !key.startsWith(PILOT_PREFIX)) return false;
  if (new TextEncoder().encode(key).byteLength > MAX_R2_KEY_BYTES) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(key)) return false;
  return key
    .slice(PILOT_PREFIX.length)
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

export function pilotScopedBucket(bucket: R2Like): R2Like {
  const checked = (key: string) => {
    if (!isPilotKey(key)) throw new PilotKeyError();
    return key;
  };
  return {
    put: async (key, value, options) => bucket.put(checked(key), value, options),
    head: async (key) => bucket.head(checked(key)),
    get: async (key) => bucket.get(checked(key)),
  };
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Where a stored song lives in the private bucket. Derived from the job, so a crash cannot lose the address. */
export const audioKey = (ownerId: string, jobId: string) => `${PILOT_PREFIX}${encodeURIComponent(ownerId)}/${jobId}.mp3`;
export const lyricsKey = (ownerId: string, jobId: string) => `${PILOT_PREFIX}${encodeURIComponent(ownerId)}/${jobId}.json`;

/**
 * Whether an attempt of this owner can be stored at all. Checked BEFORE any reservation (front) and BEFORE the
 * provider is engaged (consumer): a key the guard would refuse must never be discovered after a billed call.
 */
export const storableFor = (ownerId: string, jobId: string) =>
  isPilotKey(audioKey(ownerId, jobId)) && isPilotKey(lyricsKey(ownerId, jobId));
