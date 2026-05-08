-- Product feedback table.

CREATE TABLE IF NOT EXISTS product_feedback (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'bug' CHECK(type IN ('bug','suggestion','experience','other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT,
  page_url TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','processing','resolved','closed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_feedback_org_time ON product_feedback(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_feedback_status_time ON product_feedback(status, created_at DESC);
