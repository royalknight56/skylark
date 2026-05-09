-- Skylark D1 数据库 Schema
-- @author skylark

-- ==================== 企业/组织 ====================

-- 企业表
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  industry TEXT,
  address TEXT,
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  invite_code TEXT UNIQUE,
  owner_id TEXT NOT NULL,
  require_approval BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 企业成员表
CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  department TEXT,
  title TEXT,
  employee_id TEXT,
  phone TEXT,
  work_city TEXT,
  gender TEXT CHECK(gender IN ('male', 'female', 'unknown') OR gender IS NULL),
  employee_type TEXT,
  member_status TEXT DEFAULT 'active' CHECK(member_status IN ('active', 'suspended', 'departed')),
  suspended_at DATETIME,
  departed_at DATETIME,
  resource_receiver_id TEXT,
  sort_order INTEGER DEFAULT 0,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 企业邀请表
CREATE TABLE IF NOT EXISTS org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  inviter_id TEXT NOT NULL,
  invitee_email TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'expired')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(invitee_email, status);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  leader_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 加入申请表
CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_org_status ON join_requests(org_id, status);

-- 操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_org_time ON admin_logs(org_id, created_at DESC);

-- 人员类型表（企业可自定义）
CREATE TABLE IF NOT EXISTS employee_types (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_builtin INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_types_org ON employee_types(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_joined ON org_members(org_id, joined_at DESC);

-- ==================== 用户 ====================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at DATETIME,
  name TEXT NOT NULL,
  avatar_url TEXT,
  login_phone TEXT UNIQUE,
  status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'busy', 'away')),
  status_text TEXT,
  status_emoji TEXT,
  signature TEXT,
  current_org_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (current_org_id) REFERENCES organizations(id)
);

-- 邮箱验证令牌表
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

-- 分享裂变注册记录
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

-- ==================== 会话 ====================

-- 会话表（绑定企业）
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
  name TEXT,
  avatar_url TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  invite_code TEXT UNIQUE,
  invite_expire_at DATETIME,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 会话成员表
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK(type IN ('text', 'image', 'file', 'system')),
  reply_to TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_mime TEXT,
  file_r2_key TEXT,
  recalled BOOLEAN DEFAULT 0,
  recalled_by TEXT,
  recalled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (reply_to) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_org_updated ON conversations(org_id, updated_at DESC);

-- 消息已读记录表
CREATE TABLE IF NOT EXISTS message_reads (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id, conversation_id);

-- 消息表情回复表
CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON message_reactions(message_id);

-- ==================== 产品反馈 ====================

-- 产品问题反馈表
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

-- ==================== 机器人 ====================

-- 机器人表（企业自建）
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  api_token TEXT UNIQUE NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bots_org ON bots(org_id);
CREATE INDEX IF NOT EXISTS idx_bots_token ON bots(api_token);

-- 机器人订阅会话表
CREATE TABLE IF NOT EXISTS bot_subscriptions (
  bot_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bot_id, conversation_id),
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- ==================== 通讯录 ====================

-- 联系人表（绑定企业）
CREATE TABLE IF NOT EXISTS contacts (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  group_name TEXT DEFAULT '我的联系人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, user_id, contact_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contact_id) REFERENCES users(id)
);

-- ==================== 会议室 ====================

-- 会议室表（绑定企业，管理员配置）
CREATE TABLE IF NOT EXISTS meeting_rooms (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor TEXT,
  room_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 10,
  facilities TEXT,
  status TEXT DEFAULT 'available' CHECK(status IN ('available','maintenance','disabled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_org ON meeting_rooms(org_id);

-- ==================== 日历 ====================

-- 日历事件表（绑定企业）
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  all_day BOOLEAN DEFAULT 0,
  color TEXT DEFAULT '#3370FF',
  creator_id TEXT NOT NULL,
  room_id TEXT,
  recurrence_rule TEXT,
  recurrence_end TEXT,
  reminder_minutes INTEGER DEFAULT 15,
  visibility TEXT DEFAULT 'default' CHECK(visibility IN ('default','public','private')),
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES meeting_rooms(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_room ON calendar_events(room_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON calendar_events(org_id, start_time);

CREATE TABLE IF NOT EXISTS calendar_attendees (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('accepted', 'declined', 'pending', 'tentative')),
  is_optional BOOLEAN DEFAULT 0,
  checked_in BOOLEAN DEFAULT 0,
  checked_in_at DATETIME,
  responded_at DATETIME,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ==================== 企业邮箱 ====================

-- 企业邮箱域名
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

-- 企业邮箱账号
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

-- 邮件消息
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

-- 邮件附件
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

-- 邮件收件人
CREATE TABLE IF NOT EXISTS mail_recipients (
  message_id TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('to','cc','bcc')),
  delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending','sent','failed')),
  PRIMARY KEY (message_id, address, type),
  FOREIGN KEY (message_id) REFERENCES mail_messages(id) ON DELETE CASCADE
);

-- ==================== 云文档 ====================

-- 云文档表（绑定企业）
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'doc' CHECK(type IN ('doc', 'sheet')),
  creator_id TEXT NOT NULL,
  r2_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_documents_org_creator_updated ON documents(org_id, creator_id, updated_at DESC);

-- ==================== 多维表格 ====================

-- 多维表格（相当于一个独立数据库）
CREATE TABLE IF NOT EXISTS bases (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📊',
  creator_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bases_org ON bases(org_id);

-- 数据表（每个 base 下可有多张表）
CREATE TABLE IF NOT EXISTS base_tables (
  id TEXT PRIMARY KEY,
  base_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_base_tables_base ON base_tables(base_id);

-- 字段（列定义，type 决定单元格数据类型）
CREATE TABLE IF NOT EXISTS base_fields (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN (
    'text','number','date','checkbox','select','multi_select',
    'url','email','phone','rating','progress','member',
    'created_at','updated_at'
  )),
  options TEXT,
  is_primary INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES base_tables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_base_fields_table ON base_fields(table_id);

-- 记录（行数据，data 为 JSON: { field_id: value }）
CREATE TABLE IF NOT EXISTS base_records (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  data TEXT DEFAULT '{}',
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES base_tables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_base_records_table ON base_records(table_id);

-- 视图（同一数据表的不同展现方式）
CREATE TABLE IF NOT EXISTS base_views (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'grid' CHECK(type IN ('grid','kanban','form')),
  config TEXT DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES base_tables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_base_views_table ON base_views(table_id);

-- 管理员角色表
CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_role_id TEXT,
  permissions TEXT DEFAULT '[]',
  can_delegate BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_role_id) REFERENCES admin_roles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_org ON admin_roles(org_id);

-- 管理员角色成员表
CREATE TABLE IF NOT EXISTS admin_role_members (
  role_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, user_id),
  FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
