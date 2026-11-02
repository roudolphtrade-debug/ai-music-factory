-- AIMF Private Lyria demo / review-only SQL.
-- DO NOT RUN on aimf-dev or production. Requires a separate, authorized Cloudflare D1 binding.
-- This file lives in docs/, NOT the application's migration directory.

CREATE TABLE IF NOT EXISTS aimf_owner_demo_budget (
  scope TEXT PRIMARY KEY CHECK (scope = 'lyria-3.5'),
  used_calls INTEGER NOT NULL DEFAULT 0 CHECK (used_calls BETWEEN 0 AND 5),
  active_request_id TEXT,
  request_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(request_ids)),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (used_calls = json_array_length(request_ids))
);

-- Initializing a row is a separate, controlled operation.
-- INSERT OR IGNORE prevents accidentally resetting a budget with existing reservations.
INSERT OR IGNORE INTO aimf_owner_demo_budget(scope, used_calls, active_request_id, request_ids)
VALUES ('lyria-3.5', 0, NULL, '[]');

-- Read-only inspection (never reset used_calls automatically):
SELECT scope, used_calls, active_request_id, request_ids, updated_at
FROM aimf_owner_demo_budget
WHERE scope = 'lyria-3.5';

-- Incident handling: Do NOT clear active_request_id without checking
-- provider usage and verifying the uncertain request was not charged twice.
-- Never reset used_calls simply because a response failed.
