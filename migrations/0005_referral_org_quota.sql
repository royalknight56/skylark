-- Referral registrations used to unlock the second owned organization.

CREATE TABLE IF NOT EXISTS referral_registrations (
  id TEXT PRIMARY KEY,
  inviter_user_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_registrations_inviter_status
  ON referral_registrations(inviter_user_id, status, verified_at DESC);
