/**
 * Private owner-only Lyria pilot: the LIGHT HTTP front. It never calls Google and never decodes audio: it checks,
 * reserves one attempt in D1, hands a tiny message to the queue, and lets the owner follow the attempt and replay
 * the stored song (streamed from the private bucket). The provider call happens in the queue consumer
 * (`private-pilot-worker.ts`).
 *
 * OFF by default, FAIL-CLOSED: the pilot switch, the shared emergency stop `AI_ROUTES_PAUSED`, the owner identity
 * and the bindings are all checked before anything is read or written. Staged code only: deployment, activation and
 * any paid call require a separate owner GO.
 *
 *   GET  /api/studio/lyria-private                 pilot status (owner only)
 *   GET  /api/studio/lyria-private?job=<id>        one attempt: state, and the lyrics once stored
 *   GET  /api/studio/lyria-private?job=<id>&audio=1  the stored MP3, streamed, private, never cached, with its D1
 *                                                    fingerprint in `Repr-Digest` (checked by the browser)
 *   POST /api/studio/lyria-private  (Idempotency-Key: <uuid>)  202 new attempt, or 200 the same attempt again
 */
import { readJsonLimited, textField } from "@/lib/api-guard";
import { memberAuthConfig, verifyMemberSession, type MemberCheck } from "@/lib/member-guard";
import { buildLyriaPrompt, type LyriaSongRequest } from "./lyria35";
import {
  aiRoutesPaused,
  audioCheckMode,
  type AudioCheckMode,
  lyricsKey,
  pilotEnabled,
  pilotReady,
  UUID_PATTERN,
  type PilotProviderMode,
  type PrivateLyriaBindings,
  type R2Like,
} from "./private-pilot-bindings";
import { defaultHasherFactory, reprDigestHeader, verifiedStream, type HasherFactory } from "./private-pilot-integrity";
import { createPilotStore, PilotStoreError, type PilotJob, type PilotStore } from "./private-pilot-store";
import { reconcilePilot } from "./private-pilot-worker";

export type { PrivateLyriaBindings } from "./private-pilot-bindings";

export interface PrivateLyriaDependencies {
  verify?: (request: Request) => Promise<MemberCheck>;
  now?: () => number;
  processEnv?: Record<string, string | undefined>;
  /** Incremental SHA-256 for the verified audio read; `null` = none (the audio is then refused, never unchecked). */
  hasher?: HasherFactory | null;
}

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function failure(status: number, code: string): Response {
  return Response.json({ error: "Private music generation unavailable.", code }, { status, headers: NO_STORE });
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

/** What the owner may see of an attempt: never the owner id, the input or the storage address. */
function jobView(job: PilotJob) {
  return {
    id: job.id,
    state: job.state,
    providerEngaged: job.provider_engaged_at !== null,
    reviewReason: job.review_reason,
    audioBytes: job.state === "stored" ? job.audio_bytes : null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readInput(body: unknown): LyriaSongRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const fields = body as Record<string, unknown>;
  const input: LyriaSongRequest = {
    prompt: textField(fields.prompt, 1200),
    genre: textField(fields.genre, 80),
    mood: textField(fields.mood, 80),
    language: textField(fields.language, 80),
    vocalPreference: textField(fields.vocalPreference, 80),
    lyrics: textField(fields.lyrics, 5000),
  };
  try {
    buildLyriaPrompt(input);
    return input;
  } catch {
    return null;
  }
}

export async function handlePrivateLyriaRequest(
  request: Request,
  bindings: PrivateLyriaBindings | null | undefined,
  deps: PrivateLyriaDependencies = {},
): Promise<Response> {
  if (request.method !== "POST" && request.method !== "GET") return failure(405, "method_not_allowed");
  if (!pilotEnabled(bindings)) return failure(503, "pilot_disabled");
  if (aiRoutesPaused(bindings, deps.processEnv)) return failure(503, "ai_paused");
  if (!isSameOriginRequest(request)) return failure(403, "forbidden");
  const ownerId = bindings?.AIMF_PRIVATE_LYRIA_OWNER_ID?.trim();
  if (!ownerId) return failure(503, "pilot_unconfigured");

  // Authentication is read-only; a valid session is not enough unless it is the owner's.
  const member = await (
    deps.verify ??
    ((r: Request) =>
      verifyMemberSession(r, {
        config: memberAuthConfig({
          SUPABASE_URL: bindings?.SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY: bindings?.SUPABASE_PUBLISHABLE_KEY,
          VITE_SUPABASE_URL: bindings?.VITE_SUPABASE_URL,
          VITE_SUPABASE_PUBLISHABLE_KEY: bindings?.VITE_SUPABASE_PUBLISHABLE_KEY,
        }),
      }))
  )(request);
  if (!member.ok) return member.response;
  if (member.userId !== ownerId) return failure(403, "owner_only");

  const ready = pilotReady(bindings);
  if (!ready) return failure(503, "pilot_unconfigured");
  const { queue, bucket, mode } = ready;
  const store = createPilotStore(ready.db, deps.now);
  const hasher = deps.hasher === undefined ? defaultHasherFactory() : deps.hasher;

  try {
    // Recovery of the windows no single write covers (never a provider call). The pilot is open at this point. The
    // Cron entry runs the same reconciliation without any visit, so a closed tab never leaves an attempt behind.
    await reconcilePilot(store, bucket, queue, { canEnqueue: true });
    if (request.method === "GET") {
      return await handleGet(request, store, bucket, ownerId, mode, audioCheckMode(bindings), hasher);
    }
    return await handlePost(request, store, queue, ownerId);
  } catch (error) {
    if (error instanceof PilotStoreError) return failure(503, "pilot_unavailable");
    return failure(503, "pilot_unavailable");
  }
}

async function handleGet(
  request: Request,
  store: PilotStore,
  bucket: R2Like,
  ownerId: string,
  mode: PilotProviderMode,
  check: AudioCheckMode,
  hasher: HasherFactory | null,
) {
  const params = new URL(request.url).searchParams;
  const jobId = params.get("job");
  if (jobId === null) {
    const summary = await store.summary();
    return Response.json({ enabled: true, model: "lyria-3.5", provider: mode, ...summary }, { headers: NO_STORE });
  }
  if (!UUID_PATTERN.test(jobId)) return failure(400, "invalid_job");
  const job = await store.getJob(jobId);
  // Another owner's attempt (impossible with one owner, kept for safety) answers like a missing one.
  if (!job || job.owner_id !== ownerId) return failure(404, "not_found");

  if (params.get("audio") === "1") {
    if (job.state !== "stored" || !job.audio_key || !job.audio_sha256 || !job.audio_bytes) return failure(409, "not_ready");
    // "server" mode without an incremental hash in this runtime: refuse rather than claim a check that is not made.
    if (check === "server" && !hasher) return failure(503, "audio_unverifiable");
    const object = await bucket.get(job.audio_key);
    // The R2 metadata proves nothing and is not read. The size is only a quick pre-check; the proof is the hash of
    // the content against the fingerprint D1 recorded when the song was stored: computed by the browser before it
    // plays (always), and by this Worker while it streams in "server" mode (a mismatch fails the response).
    if (!object || object.size !== job.audio_bytes) {
      await object?.body.cancel().catch(() => {});
      return failure(503, "audio_unavailable");
    }
    const body =
      check === "server" && hasher
        ? verifiedStream(object.body, { sha256: job.audio_sha256, bytes: job.audio_bytes }, hasher())
        : object.body;
    return new Response(body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(job.audio_bytes),
        "Repr-Digest": reprDigestHeader(job.audio_sha256),
        "X-AIMF-Audio-Check": check === "server" ? "server-stream+client" : "client",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="aimf-lyria-${job.id}.mp3"`,
      },
    });
  }

  let lyrics: string | null = null;
  if (job.state === "stored") {
    const meta = await bucket.get(lyricsKey(job.owner_id, job.id)).catch(() => null);
    try {
      const parsed = meta ? (JSON.parse(await meta.text()) as { lyrics?: unknown }) : null;
      lyrics = typeof parsed?.lyrics === "string" ? parsed.lyrics : null;
    } catch {
      lyrics = null;
    }
  }
  return Response.json({ job: jobView(job), lyrics }, { headers: NO_STORE });
}

async function handlePost(
  request: Request,
  store: PilotStore,
  queue: NonNullable<PrivateLyriaBindings["AIMF_PRIVATE_LYRIA_QUEUE"]>,
  ownerId: string,
) {
  const requestId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!UUID_PATTERN.test(requestId)) return failure(400, "idempotency_key_required");
  const parsed = await readJsonLimited(request);
  if (!parsed.ok) return parsed.response;
  const input = readInput(parsed.body);
  if (!input) return failure(400, "invalid_input");
  const inputJson = JSON.stringify(input);
  const requestHash = await sha256Hex(inputJson);

  const reserved = await store.reserve(requestId.toLowerCase(), ownerId, requestHash, inputJson);
  if (!reserved) {
    // Same key again: the same attempt, never a new one. Same key, other content: refused.
    const existing = await store.getJob(requestId.toLowerCase());
    if (existing) {
      if (existing.owner_id !== ownerId) return failure(404, "not_found");
      if (existing.request_hash !== requestHash) return failure(409, "idempotency_key_reused");
      return Response.json({ job: jobView(existing), replay: true }, { headers: NO_STORE });
    }
    const summary = await store.summary();
    if (summary.frozen) return failure(503, "pilot_frozen");
    if (summary.reviewRequired) return failure(423, "review_required");
    if (summary.activeId) return failure(409, "generation_in_progress");
    if (summary.usedAttempts >= summary.maxAttempts) return failure(402, "pilot_quota_exhausted");
    return failure(503, "pilot_unavailable");
  }

  // Outbox: the attempt is durable before the hand-off. If the send fails, it stays `reserved` (never engaged) and
  // the reconciliation hands it over later; the owner replays the same key to follow it.
  try {
    await queue.send({ v: 1, jobId: reserved.id });
    const queued = await store.markQueued(reserved.id);
    return Response.json({ job: jobView(queued ?? reserved), replay: false }, { status: 202, headers: NO_STORE });
  } catch {
    return Response.json({ job: jobView(reserved), replay: false, handoff: "pending" }, { status: 202, headers: NO_STORE });
  }
}
