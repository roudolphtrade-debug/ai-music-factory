/**
 * Queue consumer and reconciliation of the private Lyria pilot: the ONLY place where Google may be called.
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
  UUID_PATTERN,
  type PilotMessage,
  type PrivateLyriaBindings,
  type QueueLike,
  type R2Like,
} from "./private-pilot-bindings";
import { createPilotStore, type PilotJob, type PilotStore } from "./private-pilot-store";
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
}

/** An idle, never-engaged attempt is handed to the queue again after this long. */
export const RECONCILE_IDLE_SECONDS = 60;
/** An engaged attempt silent for longer than a consumer can live (15 min wall) is checked against the bucket. */
export const RECONCILE_RUNNING_SECONDS = 20 * 60;

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

/** Handles one queue message. Never throws: every path ends in a recorded state or in no action at all. */
export async function processPilotMessage(
  body: unknown,
  bindings: PrivateLyriaBindings | null | undefined,
  deps: PilotWorkerDeps = {},
): Promise<ConsumeOutcome> {
  const message = body as Partial<PilotMessage> | null;
  if (!message || message.v !== 1 || typeof message.jobId !== "string" || !UUID_PATTERN.test(message.jobId)) {
    return "invalid_message";
  }
  // Emergency stop and switch, checked BEFORE any engagement. The attempt stays queued; the reconciliation hands
  // it to the queue again once the pilot is open.
  if (!pilotEnabled(bindings) || aiRoutesPaused(bindings, deps.processEnv)) return "paused";
  const db = bindings?.AIMF_PRIVATE_LYRIA_DB;
  const bucket = bindings?.AIMF_PRIVATE_LYRIA_BUCKET;
  const apiKey = bindings?.GEMINI_API_KEY?.trim();
  if (!db || !bucket || !apiKey) return "unconfigured";

  const store = createPilotStore(db, deps.now);
  const jobId = message.jobId;
  try {
    const input = parseInput(await store.getInputJson(jobId));
    if (!input) {
      // Google never engaged: final, attempt consumed, nothing to review on the provider side.
      return (await store.markHalted(jobId, "invalid_input")) ? "halted" : "not_claimed";
    }
    const job = await store.claim(jobId);
    if (!job) return "not_claimed"; // already engaged, final, or unknown: a redelivery calls nothing
    return await runEngaged(store, bucket, job, input, apiKey, deps);
  } catch {
    // D1 failed before or at the claim: nothing was engaged by this delivery (the claim is the commit point).
    return "unconfigured";
  }
}

async function runEngaged(
  store: PilotStore,
  bucket: R2Like,
  job: PilotJob,
  input: LyriaSongRequest,
  apiKey: string,
  deps: PilotWorkerDeps,
): Promise<ConsumeOutcome> {
  const review = async (reason: string) => {
    await store.markNeedsReview(job.id, reason).catch(() => null); // if even this fails, the reconciliation will
    return "needs_review" as const;
  };

  let song: LyriaSong;
  try {
    song = await (deps.generate ?? generateLyriaSong)(input, {
      apiKey,
      signal: AbortSignal.timeout(deps.providerTimeoutMs ?? 180_000),
    });
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
    sha = await sha256Hex(song.audio);
    const size = await putChecked(bucket, key, song.audio, {
      httpMetadata: { contentType: "audio/mpeg" },
      customMetadata: { sha256: sha, jobId: job.id },
    });
    await putChecked(bucket, lyricsKey(job.owner_id, job.id), JSON.stringify({ lyrics: song.text ?? null }), {
      httpMetadata: { contentType: "application/json" },
    });
    if (size !== song.audio.byteLength) return review("storage_size_mismatch");
  } catch {
    // The song was produced (and probably billed) but could not be kept: it is lost, and the owner is told.
    return review("storage_failed");
  }

  try {
    return (await store.markStored(job.id, key, sha, song.audio.byteLength)) ? "stored" : "stored_unconfirmed";
  } catch {
    // The object is safe in the bucket; the reconciliation will see it and record `stored`. No provider call.
    return "stored_unconfirmed";
  }
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
  recoveredStored: string[];
  sentToReview: string[];
}

/**
 * Recovers from the windows no single write can cover, WITHOUT ever calling the provider:
 *  - reserved/queued and never engaged, idle for a while (the D1 -> queue hand-off was lost, or the pilot was
 *    paused when the message arrived): handed to the queue again, only when the pilot is open;
 *  - running for longer than a consumer can live: if the song is complete in the bucket (size and SHA-256 in its
 *    metadata), it is recorded as stored; otherwise the outcome is unknown and the attempt goes to review.
 */
export async function reconcilePilot(
  store: PilotStore,
  bucket: R2Like,
  queue: QueueLike | null,
  options: { canEnqueue: boolean },
): Promise<ReconcileReport> {
  const report: ReconcileReport = { requeued: [], recoveredStored: [], sentToReview: [] };
  const now = store.now();
  const jobs = await store.reconcilable(now - RECONCILE_IDLE_SECONDS, now - RECONCILE_RUNNING_SECONDS);
  for (const job of jobs) {
    if (job.state === "running") {
      const key = audioKey(job.owner_id, job.id);
      const object = await bucket.head(key).catch(() => null);
      const sha = object?.customMetadata?.sha256 ?? "";
      if (object && object.size > 0 && /^[0-9a-f]{64}$/.test(sha)) {
        if (await store.markStored(job.id, key, sha, object.size).catch(() => null)) report.recoveredStored.push(job.id);
      } else if (await store.markNeedsReview(job.id, "outcome_unknown").catch(() => null)) {
        report.sentToReview.push(job.id);
      }
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
