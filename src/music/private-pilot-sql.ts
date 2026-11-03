/**
 * SQL of the private Lyria pilot (Cloudflare D1, i.e. SQLite). This file is the single source: the store runs
 * these exact statements, the SQLite tests execute them, and `docs/music/LYRIA-PRIVATE-DEMO-D1.sql` must hold the
 * same schema (a test compares them). Review-only: nothing here is applied anywhere by the code.
 *
 * What the table is, and is not: a TECHNICAL CIRCUIT BREAKER for at most five owner-only attempts of the pilot.
 * It holds no member credit, no balance, no price list; it is never a wallet next to Supabase M1/M2.
 *
 * States: reserved -> queued -> running -> stored | needs_review, reserved/queued -> halted, and
 * needs_review -> reviewed.
 *  - `provider_engaged_at` is written exactly once, at the instant the single provider call is committed to.
 *    NULL means "Google was never engaged"; NOT NULL means "a call may have been billed".
 *  - stored, reviewed and halted are final; needs_review blocks the pilot. Nothing is ever deleted, reset or
 *    refunded by the code, and the code NEVER writes `reviewed`: only the owner does, by hand, after the diagnostic
 *    of `docs/music/LYRIA-PILOT-RECETTE-CLOUDFLARE.md` (the attempt stays counted in the cap).
 *  - `handoffs` counts the messages handed to the queue for an attempt that was never engaged; past
 *    PILOT_MAX_HANDOFFS the attempt is halted instead of being handed over forever.
 */
export const PILOT_SCOPE = "lyria-3.5";
export const PILOT_HARD_MAX_ATTEMPTS = 5;
/** One hand-off at the reservation, then at most three by the reconciliation. */
export const PILOT_MAX_HANDOFFS = 4;

export const PILOT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS aimf_pilot_settings (
  scope TEXT PRIMARY KEY CHECK (scope = 'lyria-3.5'),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 0 AND 5),
  frozen INTEGER NOT NULL DEFAULT 0 CHECK (frozen IN (0, 1))
);
INSERT OR IGNORE INTO aimf_pilot_settings (scope, max_attempts, frozen) VALUES ('lyria-3.5', 5, 0);
CREATE TABLE IF NOT EXISTS aimf_pilot_jobs (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  scope TEXT NOT NULL DEFAULT 'lyria-3.5' REFERENCES aimf_pilot_settings(scope),
  owner_id TEXT NOT NULL CHECK (length(owner_id) > 0),
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
  input_json TEXT NOT NULL CHECK (json_valid(input_json)),
  state TEXT NOT NULL CHECK (state IN ('reserved', 'queued', 'running', 'stored', 'needs_review', 'reviewed', 'halted')),
  provider_engaged_at INTEGER,
  handoffs INTEGER NOT NULL DEFAULT 0 CHECK (handoffs >= 0),
  review_reason TEXT,
  audio_key TEXT,
  audio_sha256 TEXT,
  audio_bytes INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (state NOT IN ('running', 'stored', 'needs_review', 'reviewed') OR provider_engaged_at IS NOT NULL),
  CHECK (state <> 'halted' OR provider_engaged_at IS NULL),
  CHECK (state <> 'stored' OR (audio_key IS NOT NULL AND length(audio_sha256) = 64 AND audio_bytes > 0))
);
CREATE TRIGGER IF NOT EXISTS aimf_pilot_jobs_hard_cap BEFORE INSERT ON aimf_pilot_jobs
WHEN (SELECT count(*) FROM aimf_pilot_jobs) >= 5
BEGIN SELECT RAISE(ABORT, 'pilot hard cap of five attempts'); END;
CREATE TRIGGER IF NOT EXISTS aimf_pilot_jobs_append_only BEFORE DELETE ON aimf_pilot_jobs
BEGIN SELECT RAISE(ABORT, 'pilot attempts are never deleted'); END;
CREATE TRIGGER IF NOT EXISTS aimf_pilot_jobs_engaged_once BEFORE UPDATE OF provider_engaged_at ON aimf_pilot_jobs
WHEN OLD.provider_engaged_at IS NOT NULL AND NEW.provider_engaged_at IS NOT OLD.provider_engaged_at
BEGIN SELECT RAISE(ABORT, 'provider engagement is written once'); END;
CREATE TRIGGER IF NOT EXISTS aimf_pilot_jobs_transitions BEFORE UPDATE OF state ON aimf_pilot_jobs
WHEN NEW.state <> OLD.state AND (OLD.state || '>' || NEW.state) NOT IN (
  'reserved>queued', 'reserved>running', 'queued>running', 'reserved>halted', 'queued>halted',
  'running>stored', 'running>needs_review', 'needs_review>reviewed')
BEGIN SELECT RAISE(ABORT, 'forbidden pilot state transition'); END;
`;

/** Columns a caller may read. Never the input text in a list, never a key or a secret. */
const JOB_COLUMNS = `id, owner_id, request_hash, state, provider_engaged_at, handoffs, review_reason, audio_key,
  audio_sha256, audio_bytes, created_at, updated_at`;

export const SQL = {
  /**
   * The reservation, in ONE statement (atomic in SQLite; D1 serializes writes). It is refused when the pilot is
   * frozen, when the attempt cap is reached, when another attempt is active, when an attempt awaits review, or
   * when the id already exists. The hard cap of five is also enforced by a trigger.
   */
  reserve: `INSERT INTO aimf_pilot_jobs (id, scope, owner_id, request_hash, input_json, state, created_at, updated_at)
SELECT ?1, s.scope, ?2, ?3, ?4, 'reserved', ?5, ?5 FROM aimf_pilot_settings s
WHERE s.scope = 'lyria-3.5' AND s.frozen = 0
  AND (SELECT count(*) FROM aimf_pilot_jobs) < s.max_attempts
  AND NOT EXISTS (SELECT 1 FROM aimf_pilot_jobs j WHERE j.state IN ('reserved', 'queued', 'running', 'needs_review'))
  AND NOT EXISTS (SELECT 1 FROM aimf_pilot_jobs j WHERE j.id = ?1)
RETURNING ${JOB_COLUMNS}`,
  getJob: `SELECT ${JOB_COLUMNS} FROM aimf_pilot_jobs WHERE id = ?1`,
  getInput: `SELECT input_json FROM aimf_pilot_jobs WHERE id = ?1`,
  summary: `SELECT s.max_attempts AS max_attempts, s.frozen AS frozen,
  (SELECT count(*) FROM aimf_pilot_jobs) AS used_attempts,
  (SELECT count(*) FROM aimf_pilot_jobs WHERE state = 'needs_review') AS review_count,
  (SELECT id FROM aimf_pilot_jobs WHERE state IN ('reserved', 'queued', 'running') LIMIT 1) AS active_id
FROM aimf_pilot_settings s WHERE s.scope = 'lyria-3.5'`,
  /** The message was handed to the queue (or handed again by the reconciliation): Google is still not engaged. */
  markQueued: `UPDATE aimf_pilot_jobs SET state = 'queued', handoffs = handoffs + 1, updated_at = ?2
WHERE id = ?1 AND state IN ('reserved', 'queued') AND provider_engaged_at IS NULL RETURNING ${JOB_COLUMNS}`,
  /** A recovery check was handed to the queue for a silent engaged attempt: not looked at again before long. */
  touchRunning: `UPDATE aimf_pilot_jobs SET updated_at = ?2 WHERE id = ?1 AND state = 'running' RETURNING ${JOB_COLUMNS}`,
  /** THE commit point of the single provider call: only one caller can ever get a row back for an id. */
  claim: `UPDATE aimf_pilot_jobs SET state = 'running', provider_engaged_at = ?2, updated_at = ?2
WHERE id = ?1 AND state IN ('reserved', 'queued') AND provider_engaged_at IS NULL RETURNING ${JOB_COLUMNS}`,
  markStored: `UPDATE aimf_pilot_jobs SET state = 'stored', audio_key = ?2, audio_sha256 = ?3, audio_bytes = ?4, updated_at = ?5
WHERE id = ?1 AND state = 'running' RETURNING ${JOB_COLUMNS}`,
  markNeedsReview: `UPDATE aimf_pilot_jobs SET state = 'needs_review', review_reason = ?2, updated_at = ?3
WHERE id = ?1 AND state = 'running' RETURNING ${JOB_COLUMNS}`,
  /** Final without any provider engagement (an input that cannot be sent): the attempt stays consumed. */
  markHalted: `UPDATE aimf_pilot_jobs SET state = 'halted', review_reason = ?2, updated_at = ?3
WHERE id = ?1 AND state IN ('reserved', 'queued') AND provider_engaged_at IS NULL RETURNING ${JOB_COLUMNS}`,
  /** Attempts the reconciliation looks at: not engaged and idle, or engaged and silent for too long. */
  reconcilable: `SELECT ${JOB_COLUMNS} FROM aimf_pilot_jobs
WHERE (state IN ('reserved', 'queued') AND provider_engaged_at IS NULL AND updated_at <= ?1)
   OR (state = 'running' AND updated_at <= ?2)
ORDER BY created_at`,
} as const;
