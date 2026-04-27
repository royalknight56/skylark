-- 企业邮箱迁移
-- @author skylark

-- password_hash 由认证代码在旧库首次访问时自愈添加，避免重复执行迁移时报 duplicate column。

CREATE TABLE IF NOT EXISTS mail_domains (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','disabled')),
  routing_enabled BOOLEAN DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE(org_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_mail_domains_org ON mail_domains(org_id);
CREATE INDEX IF NOT EXISTS idx_mail_domains_domain ON mail_domains(domain);

CREATE TABLE IF NOT EXISTS mail_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','disabled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES mail_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mail_accounts_org ON mail_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_user ON mail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_address ON mail_accounts(address);

CREATE TABLE IF NOT EXISTS mail_messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  folder TEXT NOT NULL CHECK(folder IN ('inbox','sent','draft','archive','trash')),
  from_address TEXT NOT NULL,
  to_addresses TEXT NOT NULL,
  cc_addresses TEXT,
  bcc_addresses TEXT,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  sent_at DATETIME,
  received_at DATETIME,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES mail_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mail_messages_account_folder ON mail_messages(account_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_message_id ON mail_messages(message_id);

CREATE TABLE IF NOT EXISTS mail_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  r2_key TEXT NOT NULL,
  content_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES mail_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mail_attachments_message ON mail_attachments(message_id);

CREATE TABLE IF NOT EXISTS mail_recipients (
  message_id TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('to','cc','bcc')),
  delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending','sent','failed')),
  PRIMARY KEY (message_id, address, type),
  FOREIGN KEY (message_id) REFERENCES mail_messages(id) ON DELETE CASCADE
);
