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
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
}

export interface PilotMessage {
  v: 1;
  jobId: string;
}

export interface PrivateLyriaBindings {
  AIMF_PRIVATE_LYRIA_ENABLED?: string;
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

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where a stored song lives in the private bucket. Derived from the job, so a crash cannot lose the address. */
export const audioKey = (ownerId: string, jobId: string) => `pilot/${encodeURIComponent(ownerId)}/${jobId}.mp3`;
export const lyricsKey = (ownerId: string, jobId: string) => `pilot/${encodeURIComponent(ownerId)}/${jobId}.json`;
