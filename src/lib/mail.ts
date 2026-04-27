/**
 * 企业邮箱核心服务
 * 负责企业邮箱账号、邮件收发、邮件入库与附件读取
 * @author skylark
 */

import type {
  MailAccount,
  MailAttachment,
  MailDomain,
  MailDomainStatus,
  MailFolder,
  MailMessage,
  User,
} from "./types";

export interface MailSendPayload {
  account_id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    file_name: string;
    file_size: number;
    mime_type: string;
    r2_key: string;
  }[];
}

interface MailMessageRow extends Omit<MailMessage, "to_addresses" | "cc_addresses" | "bcc_addresses" | "attachments"> {
  to_addresses: string;
  cc_addresses: string | null;
  bcc_addresses: string | null;
}

interface MailDomainRow extends Omit<MailDomain, "routing_enabled"> {
  routing_enabled: number;
}

interface ParsedRawEmail {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  messageId: string | null;
  inReplyTo: string | null;
  date: string | null;
  text: string;
  html: string | null;
}

/** 生成短 ID */
export function generateMailId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** 标准化邮件地址 */
export function normalizeMailAddress(address: string): string {
  return extractEmailAddress(address).toLowerCase();
}

/** 校验邮件地址格式 */
export function isValidMailAddress(address: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeMailAddress(address));
}

/** 获取当前用户可用邮箱账号 */
export async function getUserMailAccounts(
  db: D1Database,
  userId: string,
  orgId?: string
): Promise<MailAccount[]> {
  const whereOrg = orgId ? "AND ma.org_id = ?" : "";
  const stmt = db.prepare(
    `SELECT ma.*, md.domain, md.status AS domain_status, md.routing_enabled
     FROM mail_accounts ma
     JOIN mail_domains md ON ma.domain_id = md.id
     WHERE ma.user_id = ? ${whereOrg}
     ORDER BY ma.is_default DESC, ma.created_at`
  );
  const result = orgId
    ? await stmt.bind(userId, orgId).all<MailAccount & { domain: string; domain_status: MailDomainStatus; routing_enabled: number }>()
    : await stmt.bind(userId).all<MailAccount & { domain: string; domain_status: MailDomainStatus; routing_enabled: number }>();

  return result.results.map(normalizeMailAccount);
}

/** 获取用户指定邮箱账号 */
export async function getUserMailAccount(
  db: D1Database,
  userId: string,
  accountId: string
): Promise<MailAccount | null> {
  const row = await db
    .prepare(
      `SELECT ma.*, md.domain, md.status AS domain_status, md.routing_enabled
       FROM mail_accounts ma
       JOIN mail_domains md ON ma.domain_id = md.id
       WHERE ma.id = ? AND ma.user_id = ? AND ma.status = 'active'`
    )
    .bind(accountId, userId)
    .first<MailAccount & { domain: string; domain_status: MailDomainStatus; routing_enabled: number }>();
  return row ? normalizeMailAccount(row) : null;
}

/** 根据地址查找邮箱账号 */
export async function getMailAccountByAddress(
  db: D1Database,
  address: string
): Promise<MailAccount | null> {
  const row = await db
    .prepare(
      `SELECT ma.*, md.domain, md.status AS domain_status, md.routing_enabled
       FROM mail_accounts ma
       JOIN mail_domains md ON ma.domain_id = md.id
       WHERE lower(ma.address) = ? AND ma.status = 'active' AND md.status = 'active'`
    )
    .bind(normalizeMailAddress(address))
    .first<MailAccount & { domain: string; domain_status: MailDomainStatus; routing_enabled: number }>();
  return row ? normalizeMailAccount(row) : null;
}

/** 获取企业邮箱域名 */
export async function getMailDomains(db: D1Database, orgId: string): Promise<MailDomain[]> {
  const rows = await db
    .prepare("SELECT * FROM mail_domains WHERE org_id = ? ORDER BY created_at DESC")
    .bind(orgId)
    .all<MailDomainRow>();
  return rows.results.map((row) => ({ ...row, routing_enabled: !!row.routing_enabled }));
}

/** 创建邮箱域名 */
export async function createMailDomain(
  db: D1Database,
  domain: { id: string; org_id: string; domain: string; created_by: string }
): Promise<MailDomain> {
  const normalizedDomain = domain.domain.trim().toLowerCase();
  await db
    .prepare(
      `INSERT INTO mail_domains (id, org_id, domain, status, routing_enabled, created_by)
       VALUES (?, ?, ?, 'pending', 0, ?)`
    )
    .bind(domain.id, domain.org_id, normalizedDomain, domain.created_by)
    .run();
  const created = await db
    .prepare("SELECT * FROM mail_domains WHERE id = ?")
    .bind(domain.id)
    .first<MailDomainRow>();
  if (!created) throw new Error("邮箱域名创建失败");
  return { ...created, routing_enabled: !!created.routing_enabled };
}

/** 更新邮箱域名状态 */
export async function updateMailDomain(
  db: D1Database,
  domainId: string,
  fields: { status?: MailDomainStatus; routing_enabled?: boolean }
): Promise<MailDomain | null> {
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (fields.status !== undefined) {
    sets.push("status = ?");
    values.push(fields.status);
  }
  if (fields.routing_enabled !== undefined) {
    sets.push("routing_enabled = ?");
    values.push(fields.routing_enabled ? 1 : 0);
  }
  if (sets.length > 0) {
    values.push(domainId);
    await db.prepare(`UPDATE mail_domains SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  const row = await db
    .prepare("SELECT * FROM mail_domains WHERE id = ?")
    .bind(domainId)
    .first<MailDomainRow>();
  return row ? { ...row, routing_enabled: !!row.routing_enabled } : null;
}

/** 获取企业邮箱账号列表 */
export async function getOrgMailAccounts(db: D1Database, orgId: string): Promise<MailAccount[]> {
  const rows = await db
    .prepare(
      `SELECT ma.*, u.name, u.email, u.avatar_url, u.status AS user_status, md.domain, md.status AS domain_status, md.routing_enabled
       FROM mail_accounts ma
       JOIN users u ON ma.user_id = u.id
       JOIN mail_domains md ON ma.domain_id = md.id
       WHERE ma.org_id = ?
       ORDER BY ma.created_at DESC`
    )
    .bind(orgId)
    .all<MailAccount & {
      name: string;
      email: string;
      avatar_url: string | null;
      user_status: string;
      domain: string;
      domain_status: MailDomainStatus;
      routing_enabled: number;
    }>();

  return rows.results.map((row) => ({
    ...normalizeMailAccount(row),
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      status: row.user_status as User["status"],
      current_org_id: row.org_id,
      created_at: "",
    },
  }));
}

/** 创建邮箱账号 */
export async function createMailAccount(
  db: D1Database,
  account: {
    id: string;
    org_id: string;
    user_id: string;
    domain_id: string;
    address: string;
    display_name: string;
    is_default?: boolean;
  }
): Promise<MailAccount> {
  const isDefault = account.is_default ? 1 : 0;
  if (isDefault) {
    await db
      .prepare("UPDATE mail_accounts SET is_default = 0 WHERE org_id = ? AND user_id = ?")
      .bind(account.org_id, account.user_id)
      .run();
  }
  await db
    .prepare(
      `INSERT INTO mail_accounts (id, org_id, user_id, domain_id, address, display_name, is_default, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
    )
    .bind(
      account.id,
      account.org_id,
      account.user_id,
      account.domain_id,
      normalizeMailAddress(account.address),
      account.display_name.trim(),
      isDefault
    )
    .run();
  const created = await getMailAccountById(db, account.id);
  if (!created) throw new Error("邮箱账号创建失败");
  return created;
}

/** 根据账号 ID 获取邮箱账号，不要求域名已经激活 */
async function getMailAccountById(db: D1Database, accountId: string): Promise<MailAccount | null> {
  const row = await db
    .prepare(
      `SELECT ma.*, md.domain, md.status AS domain_status, md.routing_enabled
       FROM mail_accounts ma
       JOIN mail_domains md ON ma.domain_id = md.id
       WHERE ma.id = ?`
    )
    .bind(accountId)
    .first<MailAccount & { domain: string; domain_status: MailDomainStatus; routing_enabled: number }>();
  return row ? normalizeMailAccount(row) : null;
}

/** 更新邮箱账号状态 */
export async function updateMailAccountStatus(
  db: D1Database,
  accountId: string,
  status: "active" | "disabled"
): Promise<void> {
  await db.prepare("UPDATE mail_accounts SET status = ? WHERE id = ?").bind(status, accountId).run();
}

/** 查询邮件列表 */
export async function listMailMessages(
  db: D1Database,
  accountId: string,
  folder: MailFolder,
  page = 1,
  pageSize = 30
): Promise<MailMessage[]> {
  const offset = (Math.max(page, 1) - 1) * pageSize;
  const rows = await db
    .prepare(
      `SELECT * FROM mail_messages
       WHERE account_id = ? AND folder = ?
       ORDER BY COALESCE(received_at, sent_at, created_at) DESC
       LIMIT ? OFFSET ?`
    )
    .bind(accountId, folder, pageSize, offset)
    .all<MailMessageRow>();
  return rows.results.map(normalizeMailMessage);
}

/** 获取邮件详情 */
export async function getMailMessage(
  db: D1Database,
  accountId: string,
  messageId: string
): Promise<MailMessage | null> {
  const row = await db
    .prepare("SELECT * FROM mail_messages WHERE id = ? AND account_id = ?")
    .bind(messageId, accountId)
    .first<MailMessageRow>();
  if (!row) return null;
  const message = normalizeMailMessage(row);
  message.attachments = await getMailAttachments(db, message.id);
  return message;
}

/** 标记邮件已读 */
export async function markMailMessageRead(db: D1Database, accountId: string, messageId: string): Promise<void> {
  await db
    .prepare("UPDATE mail_messages SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND account_id = ?")
    .bind(messageId, accountId)
    .run();
}

/** 移动邮件文件夹 */
export async function moveMailMessage(
  db: D1Database,
  accountId: string,
  messageId: string,
  folder: MailFolder
): Promise<void> {
  await db
    .prepare("UPDATE mail_messages SET folder = ? WHERE id = ? AND account_id = ?")
    .bind(folder, messageId, accountId)
    .run();
}

/** 保存邮件消息 */
export async function saveMailMessage(
  db: D1Database,
  message: Omit<MailMessage, "to_addresses" | "cc_addresses" | "bcc_addresses" | "attachments"> & {
    to_addresses: string[];
    cc_addresses?: string[];
    bcc_addresses?: string[];
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO mail_messages (
        id, org_id, account_id, direction, folder, from_address, to_addresses,
        cc_addresses, bcc_addresses, subject, text_body, html_body, message_id,
        in_reply_to, sent_at, received_at, read_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.id,
      message.org_id,
      message.account_id,
      message.direction,
      message.folder,
      normalizeMailAddress(message.from_address),
      JSON.stringify(message.to_addresses.map(normalizeMailAddress)),
      JSON.stringify((message.cc_addresses ?? []).map(normalizeMailAddress)),
      JSON.stringify((message.bcc_addresses ?? []).map(normalizeMailAddress)),
      message.subject,
      message.text_body,
      message.html_body,
      message.message_id,
      message.in_reply_to,
      message.sent_at,
      message.received_at,
      message.read_at,
      message.created_at
    )
    .run();
}

/** 保存邮件附件元数据 */
export async function saveMailAttachment(
  db: D1Database,
  attachment: Omit<MailAttachment, "created_at" | "url">
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO mail_attachments (id, message_id, file_name, file_size, mime_type, r2_key, content_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      attachment.id,
      attachment.message_id,
      attachment.file_name,
      attachment.file_size,
      attachment.mime_type,
      attachment.r2_key,
      attachment.content_id
    )
    .run();
}

/** 发送外部邮件并入库 */
export async function sendMail(
  env: CloudflareEnv,
  userId: string,
  payload: MailSendPayload
): Promise<MailMessage> {
  const account = await getUserMailAccount(env.DB, userId, payload.account_id);
  if (!account) throw new Error("邮箱账号不存在或已禁用");
  const to = payload.to.map(normalizeMailAddress).filter(isValidMailAddress);
  const cc = (payload.cc ?? []).map(normalizeMailAddress).filter(isValidMailAddress);
  const bcc = (payload.bcc ?? []).map(normalizeMailAddress).filter(isValidMailAddress);
  if (to.length === 0) throw new Error("至少需要一个有效收件人");
  if (!payload.subject.trim()) throw new Error("邮件主题不能为空");

  const attachments = await buildSendAttachments(env.R2, payload.attachments ?? []);
  const result = await env.EMAIL.send({
    to,
    cc: cc.length > 0 ? cc : undefined,
    bcc: bcc.length > 0 ? bcc : undefined,
    from: { email: account.address, name: account.display_name },
    subject: payload.subject.trim(),
    text: payload.text || stripHtml(payload.html || ""),
    html: payload.html || undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  const now = new Date().toISOString();
  const messageId = generateMailId("mailmsg");
  await saveMailMessage(env.DB, {
    id: messageId,
    org_id: account.org_id,
    account_id: account.id,
    direction: "outbound",
    folder: "sent",
    from_address: account.address,
    to_addresses: to,
    cc_addresses: cc,
    bcc_addresses: bcc,
    subject: payload.subject.trim(),
    text_body: payload.text || null,
    html_body: payload.html || null,
    message_id: result.messageId ?? null,
    in_reply_to: null,
    sent_at: now,
    received_at: null,
    read_at: now,
    created_at: now,
  });

  await saveRecipients(env.DB, messageId, to, "to", "sent");
  await saveRecipients(env.DB, messageId, cc, "cc", "sent");
  await saveRecipients(env.DB, messageId, bcc, "bcc", "sent");
  for (const item of payload.attachments ?? []) {
    await saveMailAttachment(env.DB, {
      id: generateMailId("mailatt"),
      message_id: messageId,
      file_name: item.file_name,
      file_size: item.file_size,
      mime_type: item.mime_type,
      r2_key: item.r2_key,
      content_id: null,
    });
  }

  return (await getMailMessage(env.DB, account.id, messageId))!;
}

/** 处理 Cloudflare Email Routing 入站邮件 */
export async function handleIncomingEmail(message: ForwardableEmailMessage, env: CloudflareEnv): Promise<void> {
  const account = await getMailAccountByAddress(env.DB, message.to);
  if (!account) {
    message.setReject("Mailbox not found");
    return;
  }

  const rawText = await new Response(message.raw).text();
  const parsed = parseRawEmail(rawText, message);
  const now = new Date().toISOString();
  const messageId = generateMailId("mailmsg");

  await saveMailMessage(env.DB, {
    id: messageId,
    org_id: account.org_id,
    account_id: account.id,
    direction: "inbound",
    folder: "inbox",
    from_address: parsed.from,
    to_addresses: parsed.to.length > 0 ? parsed.to : [account.address],
    cc_addresses: parsed.cc,
    bcc_addresses: [],
    subject: parsed.subject,
    text_body: parsed.text,
    html_body: parsed.html,
    message_id: parsed.messageId,
    in_reply_to: parsed.inReplyTo,
    sent_at: parsed.date,
    received_at: now,
    read_at: null,
    created_at: now,
  });

  const rawKey = `mail/${account.org_id}/${account.id}/${messageId}/raw.eml`;
  await env.R2.put(rawKey, rawText, {
    httpMetadata: { contentType: "message/rfc822" },
    customMetadata: { fileName: "raw.eml" },
  });
  await saveMailAttachment(env.DB, {
    id: generateMailId("mailatt"),
    message_id: messageId,
    file_name: "raw.eml",
    file_size: rawText.length,
    mime_type: "message/rfc822",
    r2_key: rawKey,
    content_id: null,
  });
}

async function saveRecipients(
  db: D1Database,
  messageId: string,
  addresses: string[],
  type: "to" | "cc" | "bcc",
  status: "sent" | "pending"
): Promise<void> {
  for (const address of addresses) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO mail_recipients (message_id, address, type, delivery_status)
         VALUES (?, ?, ?, ?)`
      )
      .bind(messageId, address, type, status)
      .run();
  }
}

async function getMailAttachments(db: D1Database, messageId: string): Promise<MailAttachment[]> {
  const rows = await db
    .prepare("SELECT * FROM mail_attachments WHERE message_id = ? ORDER BY created_at")
    .bind(messageId)
    .all<MailAttachment>();
  return rows.results.map((row) => ({ ...row, url: `/api/files/${row.r2_key}` }));
}

async function buildSendAttachments(
  r2: R2Bucket,
  attachments: NonNullable<MailSendPayload["attachments"]>
): Promise<EmailAttachment[]> {
  const result: EmailAttachment[] = [];
  for (const attachment of attachments) {
    const object = await r2.get(attachment.r2_key);
    if (!object) continue;
    result.push({
      disposition: "attachment",
      filename: attachment.file_name,
      type: attachment.mime_type || "application/octet-stream",
      content: await object.arrayBuffer(),
    });
  }
  return result;
}

function normalizeMailAccount(
  row: MailAccount & { domain?: string; domain_status?: MailDomainStatus; routing_enabled?: number | boolean }
): MailAccount {
  return {
    ...row,
    is_default: !!row.is_default,
    domain: row.domain
      ? {
        id: row.domain_id,
        org_id: row.org_id,
        domain: row.domain,
        status: row.domain_status || "pending",
        routing_enabled: !!row.routing_enabled,
        created_by: "",
        created_at: "",
      }
      : undefined,
  };
}

function normalizeMailMessage(row: MailMessageRow): MailMessage {
  return {
    ...row,
    to_addresses: parseAddressJson(row.to_addresses),
    cc_addresses: parseAddressJson(row.cc_addresses),
    bcc_addresses: parseAddressJson(row.bcc_addresses),
  };
}

function parseAddressJson(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseRawEmail(rawText: string, message: ForwardableEmailMessage): ParsedRawEmail {
  const parts = rawText.split(/\r?\n\r?\n/);
  const headerText = parts.shift() || "";
  const body = parts.join("\n\n").trim();
  const headers = parseHeaders(headerText);
  const html = /<html[\s>]|<body[\s>]|<p[\s>]/i.test(body) ? body : null;
  return {
    from: normalizeMailAddress(headers.get("from") || message.from),
    to: parseAddressList(headers.get("to") || message.to),
    cc: parseAddressList(headers.get("cc") || ""),
    subject: decodeMimeHeader(headers.get("subject") || "(无主题)"),
    messageId: headers.get("message-id") ?? null,
    inReplyTo: headers.get("in-reply-to") ?? null,
    date: headers.get("date") ? new Date(headers.get("date") as string).toISOString() : null,
    text: html ? stripHtml(body) : body,
    html,
  };
}

function parseHeaders(headerText: string): Map<string, string> {
  const headers = new Map<string, string>();
  let currentKey = "";
  for (const line of headerText.split(/\r?\n/)) {
    if (/^\s/.test(line) && currentKey) {
      headers.set(currentKey, `${headers.get(currentKey) || ""} ${line.trim()}`);
      continue;
    }
    const index = line.indexOf(":");
    if (index <= 0) continue;
    currentKey = line.slice(0, index).toLowerCase();
    headers.set(currentKey, line.slice(index + 1).trim());
  }
  return headers;
}

function parseAddressList(value: string): string[] {
  return value
    .split(",")
    .map(normalizeMailAddress)
    .filter(isValidMailAddress);
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function decodeMimeHeader(value: string): string {
  return value.replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_, encoded: string) => {
    try {
      return decodeURIComponent(escape(atob(encoded)));
    } catch {
      return encoded;
    }
  });
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
