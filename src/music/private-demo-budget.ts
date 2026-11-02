/**
 * Durable, fail-closed reservation for the owner-only Lyria 3.5 pilot.
 *
 * This does not initiate any payment or generation. Caller must enforce
 * server-verified owner identity and an OFF-by-default deployment flag.
 * D1 SQL schema in docs/music/LYRIA-PRIVATE-DEMO-D1.sql must be applied only
 * after separate authorization to an isolated environment, NEVER aimf-dev.
 */
export const OWNER_DEMO_SCOPE = "lyria-3.5";
export const OWNER_DEMO_MAX_CALLS = 5;
export const OWNER_DEMO_PER_CALL_CENTS = 8;
export const OWNER_DEMO_MAX_AUTHORIZED_CENTS = 50;

export type BudgetFailureReason = "unavailable" | "invalid_request" | "busy" | "exhausted" | "duplicate";

export class PrivateDemoBudgetError extends Error {
  constructor(readonly reason: BudgetFailureReason) {
    super(reason);
    this.name = "PrivateDemoBudgetError";
  }
}

/** The tiny read/write subset of Cloudflare D1 needed for this budget. */
export interface BudgetStatement {
  bind(...values: (string | number | null)[]): BudgetStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
export interface BudgetDatabase {
  prepare(sql: string): BudgetStatement;
}

export interface DemoBudgetState {
  used_calls: number;
  active_request_id: string | null;
  request_ids: string; // JSON array; unique IDs are retained across completed calls.
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Defaults to denial when the owner is unconfigured. Never consult browser state. */
export function isOwner(userId: string, configuredOwnerId: string | undefined): boolean {
  return Boolean(userId && configuredOwnerId?.trim() && userId === configuredOwnerId.trim());
}

/**
 * Single SQLite UPDATE ... RETURNING: claims the next slot AND locks the one allowed
 * in-flight generation in one atomic database write (no read-then-write race).
 * An ambiguous provider failure leaves the lock in place for manual investigation,
 * with the reservation counted. No automatic refunds, retries, or lock expiry.
 *
 * A repeated request ID is permanently rejected; a different concurrent request
 * is rejected while active_request_id is non-null.
 */
export async function reserveOwnerDemoCall(db: BudgetDatabase | null, requestId: string): Promise<number> {
  if (!db) throw new PrivateDemoBudgetError("unavailable");
  if (!UUID_PATTERN.test(requestId)) throw new PrivateDemoBudgetError("invalid_request");

  try {
    const row = await db.prepare(
      `UPDATE aimf_owner_demo_budget
       SET used_calls = used_calls + 1,
           active_request_id = ?1,
           request_ids = json_insert(request_ids, '$[#]', ?1),
           updated_at = unixepoch()
       WHERE scope = 'lyria-3.5'
         AND used_calls < 5
         AND (used_calls + 1) * 8 <= 50
         AND active_request_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM json_each(request_ids) WHERE value = ?1)
       RETURNING used_calls`,
    ).bind(requestId).first<{ used_calls: number }>();

    if (row && Number.isInteger(row.used_calls) && row.used_calls >= 1 && row.used_calls <= OWNER_DEMO_MAX_CALLS) {
      return row.used_calls;
    }

    const state = await db.prepare(
      "SELECT used_calls, active_request_id, request_ids FROM aimf_owner_demo_budget WHERE scope = 'lyria-3.5'",
    ).first<DemoBudgetState>();

    if (!state || !Number.isInteger(state.used_calls) || typeof state.request_ids !== "string") {
      throw new PrivateDemoBudgetError("unavailable");
    }
    let usedIds: unknown;
    try { usedIds = JSON.parse(state.request_ids); } catch { throw new PrivateDemoBudgetError("unavailable"); }
    if (!Array.isArray(usedIds) || !usedIds.every((id) => typeof id === "string")) {
      throw new PrivateDemoBudgetError("unavailable");
    }
    if (usedIds.includes(requestId)) throw new PrivateDemoBudgetError("duplicate");
    if (state.active_request_id) throw new PrivateDemoBudgetError("busy");
    if (state.used_calls >= OWNER_DEMO_MAX_CALLS || (state.used_calls + 1) * OWNER_DEMO_PER_CALL_CENTS > OWNER_DEMO_MAX_AUTHORIZED_CENTS) {
      throw new PrivateDemoBudgetError("exhausted");
    }
    // A race or unexpected SQLite state is never interpreted as permission to spend.
    throw new PrivateDemoBudgetError("unavailable");
  } catch (err) {
    if (err instanceof PrivateDemoBudgetError) throw err;
    throw new PrivateDemoBudgetError("unavailable");
  }
}

/**
 * Only call after a successfully received/validated response is durably delivered
 * or otherwise safely accounted for. Failure to release keeps the pilot locked.
 */
export async function completeOwnerDemoCall(db: BudgetDatabase | null, requestId: string): Promise<void> {
  if (!db) throw new PrivateDemoBudgetError("unavailable");
  if (!UUID_PATTERN.test(requestId)) throw new PrivateDemoBudgetError("invalid_request");
  try {
    const row = await db.prepare(
      `UPDATE aimf_owner_demo_budget
       SET active_request_id = NULL, updated_at = unixepoch()
       WHERE scope = 'lyria-3.5' AND active_request_id = ?1
       RETURNING used_calls`,
    ).bind(requestId).first<{ used_calls: number }>();
    if (!row || !Number.isInteger(row.used_calls)) throw new PrivateDemoBudgetError("unavailable");
  } catch (err) {
    if (err instanceof PrivateDemoBudgetError) throw err;
    throw new PrivateDemoBudgetError("unavailable");
  }
}

/** Read-only owner status for the pilot UI. Never reveals request IDs. */
export async function ownerDemoBudgetStatus(
  db: BudgetDatabase | null,
): Promise<{ usedCalls: number; maxCalls: number; busy: boolean }> {
  if (!db) throw new PrivateDemoBudgetError("unavailable");
  try {
    const row = await db.prepare(
      "SELECT used_calls, active_request_id, request_ids FROM aimf_owner_demo_budget WHERE scope = 'lyria-3.5'",
    ).first<DemoBudgetState>();
    if (
      !row ||
      !Number.isInteger(row.used_calls) ||
      row.used_calls < 0 ||
      row.used_calls > OWNER_DEMO_MAX_CALLS ||
      typeof row.request_ids !== "string"
    ) {
      throw new PrivateDemoBudgetError("unavailable");
    }
    const ids: unknown = JSON.parse(row.request_ids);
    if (!Array.isArray(ids) || ids.length !== row.used_calls) {
      throw new PrivateDemoBudgetError("unavailable");
    }
    return { usedCalls: row.used_calls, maxCalls: OWNER_DEMO_MAX_CALLS, busy: Boolean(row.active_request_id) };
  } catch {
    throw new PrivateDemoBudgetError("unavailable");
  }
}
