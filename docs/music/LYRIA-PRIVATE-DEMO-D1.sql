-- AIMF private Lyria pilot: REVIEW-ONLY SQL for an isolated Cloudflare D1 database.
-- DO NOT RUN on aimf-dev, on Supabase or in production. Applying it is a separate, authorized operation.
-- This file lives in docs/, NOT in a migration directory. It must hold exactly PILOT_SCHEMA_SQL of
-- src/music/private-pilot-sql.ts (a test compares them).
--
-- What it is: a technical circuit breaker for at most five owner-only attempts of the pilot. No member
-- credit, balance or price lives here: Supabase M1/M2 remains the only ledger.
--
-- States: reserved -> queued -> running -> stored | needs_review ; reserved/queued -> halted ;
--         needs_review -> reviewed (written by the owner only, by hand).
-- provider_engaged_at NULL = Google never engaged ; NOT NULL = a call may have been billed.
-- handoffs = messages handed to the queue for a never-engaged attempt (4 at most, then halted).

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


-- Read-only inspection (never reset, never delete: triggers refuse both):
-- SELECT id, state, provider_engaged_at, handoffs, review_reason, audio_bytes, created_at, updated_at
--   FROM aimf_pilot_jobs ORDER BY created_at;
--
-- Incident handling (owner only; full procedure in docs/music/LYRIA-PILOT-RECETTE-CLOUDFLARE.md):
--  * needs_review blocks every new attempt on purpose. It is resolved by a human decision, recorded in the
--    governance report, never by code. The pilot can be stopped at once with
--    UPDATE aimf_pilot_settings SET frozen = 1 WHERE scope = 'lyria-3.5';
--  * after the diagnostic, and only then, the owner closes the attempt (it stays counted in the cap of five):
--    UPDATE aimf_pilot_jobs SET state = 'reviewed', review_reason = review_reason || ' | owner: <note>',
--      updated_at = unixepoch() WHERE id = '<attempt id>' AND state = 'needs_review';
--  * never clear provider_engaged_at, never delete a row, never raise max_attempts above 5 (CHECK refuses it).
