import type { D1Like } from "./private-pilot-bindings";
import { SQL } from "./private-pilot-sql";

/** The durable state machine of the private pilot, over D1. Every write is ONE conditional statement. */
export type PilotState = "reserved" | "queued" | "running" | "stored" | "needs_review" | "halted";

export interface PilotJob {
  id: string;
  owner_id: string;
  request_hash: string;
  state: PilotState;
  provider_engaged_at: number | null;
  review_reason: string | null;
  audio_key: string | null;
  audio_sha256: string | null;
  audio_bytes: number | null;
  created_at: number;
  updated_at: number;
}

export interface PilotSummary {
  maxAttempts: number;
  usedAttempts: number;
  frozen: boolean;
  reviewRequired: boolean;
  activeId: string | null;
}

/** Thrown when D1 cannot be read or written: callers answer 503 and spend nothing. */
export class PilotStoreError extends Error {
  constructor(message = "pilot store unavailable") {
    super(message);
    this.name = "PilotStoreError";
  }
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PilotStoreError) throw error;
    throw new PilotStoreError();
  }
}

export function createPilotStore(db: D1Like, now: () => number = () => Math.floor(Date.now() / 1000)) {
  const one = (sql: string, ...values: (string | number | null)[]) =>
    guarded(() => db.prepare(sql).bind(...values).first<PilotJob>());

  return {
    now,
    /** A new attempt, or `null` when the statement refused it (the caller then reads why). */
    reserve: (id: string, ownerId: string, requestHash: string, inputJson: string) =>
      one(SQL.reserve, id, ownerId, requestHash, inputJson, now()),
    getJob: (id: string) => one(SQL.getJob, id),
    async getInputJson(id: string): Promise<string | null> {
      const row = await guarded(() => db.prepare(SQL.getInput).bind(id).first<{ input_json: string }>());
      return row?.input_json ?? null;
    },
    async summary(): Promise<PilotSummary> {
      const row = await guarded(() =>
        db.prepare(SQL.summary).first<{
          max_attempts: number;
          frozen: number;
          used_attempts: number;
          review_count: number;
          active_id: string | null;
        }>(),
      );
      if (!row) throw new PilotStoreError("pilot settings row missing");
      return {
        maxAttempts: Number(row.max_attempts),
        usedAttempts: Number(row.used_attempts),
        frozen: Number(row.frozen) === 1,
        reviewRequired: Number(row.review_count) > 0,
        activeId: row.active_id ?? null,
      };
    },
    markQueued: (id: string) => one(SQL.markQueued, id, now()),
    /** The single provider engagement for this id: a row back means "you, and only you, may call Google". */
    claim: (id: string) => one(SQL.claim, id, now()),
    markStored: (id: string, key: string, sha256: string, bytes: number) =>
      one(SQL.markStored, id, key, sha256, bytes, now()),
    markNeedsReview: (id: string, reason: string) => one(SQL.markNeedsReview, id, reason, now()),
    markHalted: (id: string, reason: string) => one(SQL.markHalted, id, reason, now()),
    async reconcilable(idleBefore: number, runningBefore: number): Promise<PilotJob[]> {
      const { results } = await guarded(() =>
        db.prepare(SQL.reconcilable).bind(idleBefore, runningBefore).all<PilotJob>(),
      );
      return results ?? [];
    },
  };
}

export type PilotStore = ReturnType<typeof createPilotStore>;
