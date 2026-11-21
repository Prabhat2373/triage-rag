BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS invitation_hash text,
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS account_sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

-- Early demo seeds supplied IDs explicitly. Keep future generated IDs above them.
LOCK TABLE organizations, users, integrations IN SHARE ROW EXCLUSIVE MODE;

SELECT setval(pg_get_serial_sequence('organizations', 'id'), GREATEST(
  COALESCE((SELECT MAX(id) FROM organizations), 0) + 1,
  COALESCE(pg_sequence_last_value(pg_get_serial_sequence('organizations', 'id')::regclass), 0) + 1
), false);
SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST(
  COALESCE((SELECT MAX(id) FROM users), 0) + 1,
  COALESCE(pg_sequence_last_value(pg_get_serial_sequence('users', 'id')::regclass), 0) + 1
), false);
SELECT setval(pg_get_serial_sequence('integrations', 'id'), GREATEST(
  COALESCE((SELECT MAX(id) FROM integrations), 0) + 1,
  COALESCE(pg_sequence_last_value(pg_get_serial_sequence('integrations', 'id')::regclass), 0) + 1
), false);

COMMIT;
