-- Email verification for password registration.

ALTER TABLE users ADD COLUMN email_verified_at DATETIME;

UPDATE users
SET email_verified_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
