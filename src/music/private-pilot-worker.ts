/**
 * Queue consumer, reconciliation and scheduled recovery of the private Lyria pilot: the consumer is the ONLY place
 * where Google may be called.
 *
 * Queues deliver at least once, never exactly once. The guarantee here does not rely on the queue: a message only
 * carries an id, and the provider is called only after `claim` wrote `provider_engaged_at` for that id, which a
 * single caller can ever do. A second delivery, a concurrent consumer, a retry or a restart finds the id already
 * engaged and calls nothing. Whatever happens after the engagement and is not a verified stored song becomes
 * `needs_review`, which blocks the pilot until the owner looks at it: there is no automatic retry, refund or reset.
 */
import {
  aiRoutesPaused,
  audioKey,
  lyricsKey,
  pilotEnabled,
  pilotReady,
  SHA256_HEX,
  storableFor,
  UUID_PATTERN,
  type PilotMessage,
  type PilotProviderMode,
  type PrivateLyriaBindings,
  type QueueLike,
  type R2Like,
} from "./private-pilot-bindings";
import { PILOT_MAX_HANDOFFS } from "./private-pilot-sql";
import { createPilotStore, type PilotJob, type PilotStore } from "./private-pilot-store";
import { defaultHasherFactory, hashStream, IntegrityError, type HasherFactory } from "./private-pilot-integrity";
import { mockGenerate } from "./private-pilot-mock";
import {
  buildLyriaPrompt,
  generateLyriaSong,
  LyriaGenerationError,
  type LyriaSong,
  type LyriaSongRequest,
} from "./lyria35";

/** The provider call, injectable: tests use a mock, and nothing in the tests reaches Google. */
export type GenerateSong = (
  request: LyriaSongRequest,
  options: { apiKey: string; signal: AbortSignal },
) => Promise<LyriaSong>;

export interface PilotWorkerDeps {
  generate?: GenerateSong;
  now?: () => number;
  /** Longest a provider call may run before it is abandoned (and the attempt goes to review). */
  providerTimeoutMs?: number;
  processEnv?: Record<string, string | undefined>;
  /** Incremental SHA-256 used to check stored content; `null` = none available (recovery then waits). */
  hasher?: HasherFactory | null;
  /** Size of the fictitious "MP3" in "mock" mode (tests use a small one). */
  mockAudioBytes?: number;
}

/** An idle, never-engaged attempt is handed to the queue again after this long. */
export const RECONCILE_IDLE_SECONDS = 60;
/** An engaged attempt silent for longer than a consumer can live (15 min wall) is checked against the bucket. */
export const RECONCILE_RUNNING_SECONDS = 20 * 60;
/** Largest object a recovery check will hash (the adapter refuses songs over 15 MB). */
const MAX_STORED_AUDIO_BYTES = 16 * 1024 * 1024;

export type ConsumeOutcome =
  | "stored"
  | "stored_unconfirmed"
  | "needs_review"
  | "halted"
  | "not_claimed"
  | "paused"
  | "unconfigured"
  | "invalid_message";

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Writes to the private bucket, at most twice (storage only, never the provider). Returns the size written. */
async function putChecked(bucket: R2Like, key: string, value: Uint8Array | string, options: Parameters<R2Like["put"]>[2]) {
  const expected = typeof value === "string" ? new TextEncoder().encode(value).byteLength : value.byteLength;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const written = await bucket.put(key, value, options);
      if (written && written.size === expected) return written.size;
    } catch {
      /* one more try of the storage write */
    }
  }
  throw new Error("storage write not confirmed");
}

function parseInput(json: string | null): LyriaSongRequest | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as LyriaSongRequest;
    buildLyriaPrompt(value); // throws when the input cannot be sent
    return value;
  } catch {
    return null;
  }
}

const sendToReview = (store: PilotStore, id: string, reason: string) =>
  store.markNeedsReview(id, reason).catch(() => null); // if even this fails, the reconciliation will

/** Handles one queue message. Never throws: every path ends in a recorded state or in no action at all. */
export async function processPilotMessage(
  body: unknown,
  bindings: PrivateLyriaBindings | null | undefined,
  deps: PilotWorkerDeps = {},
): Promise<ConsumeOutcome> {
  const message = body as Partial<PilotMessage> | null;
  const op = message?.op ?? "generate";
  if (
    !message ||
    message.v !== 1 ||
    typeof message.jobId !== "string" ||
    !UUID_PATTERN.test(message.jobId) ||
    (op !== "generate" && op !== "recover")
  ) {
    return "invalid_message";
  }
  // Emergency stop and switch, checked BEFORE any engagement. The attempt stays queued; the reconciliation hands
  // it to the queue again once the pilot is open.
  if (!pilotEnabled(bindings) || aiRoutesPaused(bindings, deps.processEnv)) return "paused";
  const ready = pilotReady(bindings);
  if (!ready) return "unconfigured";

  const store = createPilotStore(ready.db, deps.now);
  const jobId = message.jobId;
  try {
    if (op === "recover") return await recoverSilentAttempt(store, ready.bucket, jobId, deps);
    const input = parseInput(await store.getInputJson(jobId));
    if (!input) {
      // Google never engaged: final, attempt consumed, nothing to review on the provider side.
      return (await store.markHalted(jobId, "invalid_input")) ? "halted" : "not_claimed";
    }
    // Its song could not be kept under `pilot/`: stopped while Google is still not engaged (never billed).
    const pending = await store.getJob(jobId);
    if (pending && !storableFor(pending.owner_id, pending.id)) {
      return (await store.markHalted(jobId, "storage_key_invalid")) ? "halted" : "not_claimed";
    }
    const job = await store.claim(jobId);
    if (!job) return "not_claimed"; // already engaged, final, or unknown: a redelivery calls nothing
    const generate = deps.generate ?? (ready.mode === "mock" ? mockGenerate(deps.mockAudioBytes) : generateLyriaSong);
    return await runEngaged(store, ready.bucket, job, input, ready.apiKey, ready.mode, generate, deps);
  } catch {
    // D1 or R2 failed before the claim, or during a recovery check: nothing was engaged by this delivery.
    return "unconfigured";
  }
}

async function runEngaged(
  store: PilotStore,
  bucket: R2Like,
  job: PilotJob,
  input: LyriaSongRequest,
  apiKey: string,
  mode: PilotProviderMode,
  generate: GenerateSong,
  deps: PilotWorkerDeps,
): Promise<ConsumeOutcome> {
  const review = async (reason: string) => {
    await sendToReview(store, job.id, reason);
    return "needs_review" as const;
  };

  let song: LyriaSong;
  try {
    song = await generate(input, { apiKey, signal: AbortSignal.timeout(deps.providerTimeoutMs ?? 180_000) });
  } catch (error) {
    // Engaged: the outcome on Google's side (and its billing) is unknown. Never called again for this id.
    if (error instanceof LyriaGenerationError && error.status === 429) return review("provider_rate_limited");
    return review("provider_failed");
  }
  if (song.model !== "lyria-3.5" || song.mimeType !== "audio/mpeg" || song.audio.byteLength === 0) {
    return review("provider_invalid_output");
  }

  const key = audioKey(job.owner_id, job.id);
  let sha: string;
  try {
    // The fingerprint is computed from the bytes in memory, and R2 recomputes it on its side (`sha256`): a write
    // that does not hold exactly these bytes is refused by the bucket itself.
    sha = await sha256Hex(song.audio);
    const size = await putChecked(bucket, key, song.audio, {
      httpMetadata: { contentType: "audio/mpeg" },
      customMetadata: { sha256: sha, jobId: job.id, provider: mode },
      sha256: sha,
    });
    await putChecked(bucket, lyricsKey(job.owner_id, job.id), JSON.stringify({ lyrics: song.text ?? null, provider: mode }), {
      httpMetadata: { contentType: "application/json" },
    });
    if (size !== song.audio.byteLength) return review("storage_size_mismatch");
  } catch {
    // The song was produced (and, with Google, probably billed) but could not be kept: it is lost, and the owner is
    // told. The provider is NEVER called again for it; only the owner decides what follows.
    return review("storage_failed");
  }

  try {
    return (await store.markStored(job.id, key, sha, song.audio.byteLength)) ? "stored" : "stored_unconfirmed";
  } catch {
    // The object is safe in the bucket; the reconciliation will have it checked and recorded. No provider call.
    return "stored_unconfirmed";
  }
}

/**
 * A `recover` message: an engaged attempt went silent. The song is recorded as stored ONLY when the bytes in the
 * bucket hash to the fingerprint written with them; a missing object means the outcome is unknown; anything else is
 * an integrity failure. Never a provider call. A bucket that cannot be read decides nothing (checked again later).
 */
async function recoverSilentAttempt(
  store: PilotStore,
  bucket: R2Like,
  jobId: string,
  deps: PilotWorkerDeps,
): Promise<ConsumeOutcome> {
  const job = await store.getJob(jobId);
  if (!job || job.state !== "running" || job.provider_engaged_at === null) return "not_claimed";
  // Its consumer may still be alive: only an attempt engaged longer ago than a consumer can live is checked.
  if (job.provider_engaged_at > store.now() - RECONCILE_RUNNING_SECONDS) return "not_claimed";
  const hasher = deps.hasher === undefined ? defaultHasherFactory() : deps.hasher;
  if (!hasher) return "unconfigured";

  const key = audioKey(job.owner_id, job.id);
  const object = await bucket.get(key); // a read failure throws: nothing is decided
  if (!object) return (await sendToReview(store, job.id, "outcome_unknown")) ? "needs_review" : "not_claimed";
  const claimed = object.customMetadata?.sha256 ?? "";
  let actual: { sha256: string; bytes: number };
  try {
    if (!SHA256_HEX.test(claimed) || object.size <= 0) throw new IntegrityError("digest_mismatch");
    actual = await hashStream(object.body, hasher(), MAX_STORED_AUDIO_BYTES);
    if (actual.bytes !== object.size || actual.sha256 !== claimed) throw new IntegrityError("digest_mismatch");
  } catch (error) {
    if (!(error instanceof IntegrityError)) throw error;
    await object.body.cancel().catch(() => {});
    return (await sendToReview(store, job.id, "storage_integrity_failed")) ? "needs_review" : "not_claimed";
  }
  return (await store.markStored(job.id, key, actual.sha256, actual.bytes)) ? "stored" : "not_claimed";
}

/** Cloudflare `queue()` entry: every message is acknowledged; the queue's own retries never decide anything. */
export async function consumePrivateLyriaBatch(
  batch: { messages: readonly { body: unknown; ack(): void }[] },
  bindings: PrivateLyriaBindings | null | undefined,
  deps: PilotWorkerDeps = {},
): Promise<ConsumeOutcome[]> {
  const outcomes: ConsumeOutcome[] = [];
  for (const message of batch.messages) {
    outcomes.push(await processPilotMessage(message.body, bindings, deps));
    message.ack();
  }
  return outcomes;
}

export interface ReconcileReport {
  requeued: string[];
  recoveryQueued: string[];
  sentToReview: string[];
  halted: string[];
}

/**
 * Recovers from the windows no single write can cover, WITHOUT ever calling the provider and without heavy work
 * (it runs inside a 10 ms HTTP request or a cron invocation):
 *  - reserved/queued and never engaged, idle for a while (the D1 -> queue hand-off was lost, or the pilot was
 *    paused when the message arrived): handed to the queue again, at most PILOT_MAX_HANDOFFS times in all, then
 *    halted (never engaged, so never billed; the attempt stays counted);
 *  - running for longer than a consumer can live: no object in the bucket means the outcome is unknown (review);
 *    an object is checked by the queue consumer (`recover`), which hashes its content before recording it.
 */
export async function reconcilePilot(
  store: PilotStore,
  bucket: R2Like,
  queue: QueueLike | null,
  options: { canEnqueue: boolean },
): Promise<ReconcileReport> {
  const report: ReconcileReport = { requeued: [], recoveryQueued: [], sentToReview: [], halted: [] };
  const now = store.now();
  const jobs = await store.reconcilable(now - RECONCILE_IDLE_SECONDS, now - RECONCILE_RUNNING_SECONDS);
  for (const job of jobs) {
    if (job.state === "running") {
      let object;
      try {
        object = await bucket.head(audioKey(job.owner_id, job.id));
      } catch {
        continue; // the bucket cannot be read now: concluding "lost" would be false
      }
      if (!object || object.size === 0) {
        if (await sendToReview(store, job.id, "outcome_unknown")) report.sentToReview.push(job.id);
      } else if (options.canEnqueue && queue) {
        try {
          await queue.send({ v: 1, jobId: job.id, op: "recover" });
          await store.touchRunning(job.id);
          report.recoveryQueued.push(job.id);
        } catch {
          /* checked again by the next reconciliation */
        }
      }
    } else if (Number(job.handoffs) >= PILOT_MAX_HANDOFFS) {
      if (await store.markHalted(job.id, "handoff_exhausted").catch(() => null)) report.halted.push(job.id);
    } else if (options.canEnqueue && queue) {
      try {
        await queue.send({ v: 1, jobId: job.id });
        await store.markQueued(job.id);
        report.requeued.push(job.id);
      } catch {
        /* still not engaged: the next reconciliation tries again */
      }
    }
  }
  return report;
}

export type ScheduledStatus = "disabled" | "paused" | "unconfigured" | "store_unavailable" | "ran";

/**
 * Cloudflare Cron entry: the same reconciliation, WITHOUT any visit of the owner. Fail-closed like everything else:
 * pilot switch off -> not even a read; emergency stop on or unreadable -> nothing; missing binding -> nothing. It
 * never calls the provider, never creates an attempt and never raises the cap: at most it hands an existing,
 * never-engaged attempt back to the queue (whose consumer checks the emergency stop again before any engagement).
 */
export async function runScheduledReconciliation(
  bindings: PrivateLyriaBindings | null | undefined,
  deps: Pick<PilotWorkerDeps, "now" | "processEnv"> = {},
): Promise<{ status: ScheduledStatus } & Partial<ReconcileReport>> {
  if (!pilotEnabled(bindings)) return { status: "disabled" };
  if (aiRoutesPaused(bindings, deps.processEnv)) return { status: "paused" };
  const ready = pilotReady(bindings);
  if (!ready) return { status: "unconfigured" };
  try {
    const report = await reconcilePilot(createPilotStore(ready.db, deps.now), ready.bucket, ready.queue, { canEnqueue: true });
    return { status: "ran", ...report };
  } catch {
    return { status: "store_unavailable" };
  }
}

/** One log line per cron run: counts only, never an input, a lyric, a key or a storage address. */
export function scheduledLogLine(result: { status: ScheduledStatus } & Partial<ReconcileReport>): string {
  return JSON.stringify({
    event: "aimf_pilot_reconcile",
    status: result.status,
    requeued: result.requeued?.length ?? 0,
    recoveryQueued: result.recoveryQueued?.length ?? 0,
    sentToReview: result.sentToReview?.length ?? 0,
    halted: result.halted?.length ?? 0,
  });
}
