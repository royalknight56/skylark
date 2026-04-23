/**
 * D1 数据库查询封装
 * @author skylark
 */

import type {
  Organization,
  OrgMember,
  OrgInvite,
  Conversation,
  Message,
  User,
  Contact,
  CalendarEvent,
  CalendarAttendee,
  Document,
} from '../types';

/* ==================== 企业/组织查询 ==================== */

/** 获取用户所属的所有企业 */
export async function getUserOrganizations(
  db: D1Database,
  userId: string
): Promise<Organization[]> {
  const result = await db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM org_members WHERE org_id = o.id) as member_count
       FROM organizations o
       JOIN org_members om ON o.id = om.org_id
       WHERE om.user_id = ?
       ORDER BY om.joined_at`
    )
    .bind(userId)
    .all<Organization & { member_count: number }>();
  return result.results;
}

/** 获取企业详情 */
export async function getOrganization(
  db: D1Database,
  orgId: string
): Promise<Organization | null> {
  return db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM org_members WHERE org_id = o.id) as member_count
       FROM organizations o WHERE o.id = ?`
    )
    .bind(orgId)
    .first<Organization>();
}

/** 通过邀请码查找企业 */
export async function getOrgByInviteCode(
  db: D1Database,
  inviteCode: string
): Promise<Organization | null> {
  return db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM org_members WHERE org_id = o.id) as member_count
       FROM organizations o WHERE o.invite_code = ?`
    )
    .bind(inviteCode)
    .first<Organization>();
}

/** 创建企业 */
export async function createOrganization(
  db: D1Database,
  org: { id: string; name: string; description?: string; owner_id: string; invite_code: string }
): Promise<Organization> {
  await db
    .prepare(
      'INSERT INTO organizations (id, name, description, invite_code, owner_id) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(org.id, org.name, org.description || null, org.invite_code, org.owner_id)
    .run();

  // 创建者自动成为 owner
  await db
    .prepare(
      'INSERT INTO org_members (org_id, user_id, role, department, title) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(org.id, org.owner_id, 'owner', '管理层', '创建者')
    .run();

  // 设为当前企业
  await db
    .prepare('UPDATE users SET current_org_id = ? WHERE id = ?')
    .bind(org.id, org.owner_id)
    .run();

  return (await getOrganization(db, org.id))!;
}

/** 加入企业 */
export async function joinOrganization(
  db: D1Database,
  orgId: string,
  userId: string,
  department?: string,
  title?: string
): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO org_members (org_id, user_id, role, department, title) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(orgId, userId, 'member', department || null, title || null)
    .run();

  // 设为当前企业
  await db
    .prepare('UPDATE users SET current_org_id = ? WHERE id = ?')
    .bind(orgId, userId)
    .run();
}

/** 切换当前企业 */
export async function switchOrganization(
  db: D1Database,
  userId: string,
  orgId: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET current_org_id = ? WHERE id = ?')
    .bind(orgId, userId)
    .run();
}

/** 获取企业成员列表 */
export async function getOrgMembers(
  db: D1Database,
  orgId: string
): Promise<OrgMember[]> {
  const result = await db
    .prepare(
      `SELECT om.*, u.name, u.email, u.avatar_url, u.status
       FROM org_members om JOIN users u ON om.user_id = u.id
       WHERE om.org_id = ?
       ORDER BY
         CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         u.name`
    )
    .bind(orgId)
    .all<OrgMember & { name: string; email: string; avatar_url: string | null; status: string }>();

  return result.results.map((row) => ({
    ...row,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      status: row.status as User['status'],
      current_org_id: orgId,
      created_at: '',
    },
  }));
}

/** 检查用户是否为企业成员 */
export async function isOrgMember(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first();
  return !!row;
}

/* ==================== 会话查询 ==================== */

/** 获取用户在某企业下的所有会话 */
export async function getUserConversations(
  db: D1Database,
  userId: string,
  orgId: string
): Promise<Conversation[]> {
  const result = await db
    .prepare(
      `SELECT c.*,
        m.content as last_message,
        m.created_at as last_message_at
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE cm.user_id = ? AND c.org_id = ?
      ORDER BY COALESCE(m.created_at, c.updated_at) DESC`
    )
    .bind(userId, orgId)
    .all<Conversation>();

  return result.results;
}

/** 获取会话详情 */
export async function getConversation(
  db: D1Database,
  conversationId: string
): Promise<Conversation | null> {
  return db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .bind(conversationId)
    .first<Conversation>();
}

/** 获取会话的所有成员 */
export async function getConversationMembers(
  db: D1Database,
  conversationId: string
): Promise<(User & { role: string })[]> {
  const result = await db
    .prepare(
      `SELECT u.*, cm.role FROM users u
      JOIN conversation_members cm ON u.id = cm.user_id
      WHERE cm.conversation_id = ?`
    )
    .bind(conversationId)
    .all<User & { role: string }>();

  return result.results;
}

/** 创建新会话 */
export async function createConversation(
  db: D1Database,
  id: string,
  orgId: string,
  type: 'direct' | 'group',
  name: string | null,
  createdBy: string,
  memberIds: string[]
): Promise<Conversation> {
  await db
    .prepare(
      'INSERT INTO conversations (id, org_id, type, name, created_by) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, orgId, type, name, createdBy)
    .run();

  const stmts = memberIds.map((uid) =>
    db
      .prepare(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)'
      )
      .bind(id, uid, uid === createdBy ? 'owner' : 'member')
  );
  await db.batch(stmts);

  return (await getConversation(db, id))!;
}

/* ==================== 消息查询 ==================== */

/** 获取会话消息（分页） */
export async function getMessages(
  db: D1Database,
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  const query = before
    ? `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ? AND m.created_at < ?
       ORDER BY m.created_at DESC LIMIT ?`
    : `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC LIMIT ?`;

  const binds = before
    ? [conversationId, before, limit]
    : [conversationId, limit];

  const result = await db
    .prepare(query)
    .bind(...binds)
    .all<Message & { sender_name: string; sender_avatar: string | null }>();

  return result.results.reverse().map((row) => ({
    ...row,
    sender: {
      id: row.sender_id,
      email: '',
      name: row.sender_name,
      avatar_url: row.sender_avatar,
      status: 'online' as const,
      current_org_id: null,
      created_at: '',
    },
  }));
}

/** 发送消息 */
export async function createMessage(
  db: D1Database,
  msg: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    type: string;
    reply_to?: string;
    file_name?: string;
    file_size?: number;
    file_mime?: string;
    file_r2_key?: string;
  }
): Promise<Message> {
  await db
    .prepare(
      `INSERT INTO messages (id, conversation_id, sender_id, content, type, reply_to, file_name, file_size, file_mime, file_r2_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      msg.id, msg.conversation_id, msg.sender_id, msg.content, msg.type,
      msg.reply_to || null, msg.file_name || null, msg.file_size || null,
      msg.file_mime || null, msg.file_r2_key || null
    )
    .run();

  await db
    .prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(msg.conversation_id)
    .run();

  const result = await db
    .prepare(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`
    )
    .bind(msg.id)
    .first<Message & { sender_name: string; sender_avatar: string | null }>();

  return {
    ...result!,
    sender: {
      id: result!.sender_id,
      email: '',
      name: result!.sender_name,
      avatar_url: result!.sender_avatar,
      status: 'online',
      current_org_id: null,
      created_at: '',
    },
  } as Message;
}

/* ==================== 通讯录查询 ==================== */

/** 获取企业下用户的联系人列表 */
export async function getContacts(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<(Contact & { contact: User })[]> {
  const result = await db
    .prepare(
      `SELECT c.*, u.id as cid, u.email, u.name, u.avatar_url, u.status
       FROM contacts c JOIN users u ON c.contact_id = u.id
       WHERE c.org_id = ? AND c.user_id = ?
       ORDER BY c.group_name, u.name`
    )
    .bind(orgId, userId)
    .all<Contact & { cid: string; email: string; name: string; avatar_url: string | null; status: string }>();

  return result.results.map((row) => ({
    ...row,
    contact: {
      id: row.cid,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      status: row.status as User['status'],
      current_org_id: orgId,
      created_at: '',
    },
  }));
}

/** 获取所有用户 */
export async function getAllUsers(db: D1Database): Promise<User[]> {
  const result = await db.prepare('SELECT * FROM users ORDER BY name').all<User>();
  return result.results;
}

/** 添加联系人 */
export async function addContact(
  db: D1Database,
  orgId: string,
  userId: string,
  contactId: string,
  groupName = '我的联系人'
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO contacts (org_id, user_id, contact_id, group_name) VALUES (?, ?, ?, ?)')
    .bind(orgId, userId, contactId, groupName)
    .run();
}

/** 删除联系人 */
export async function removeContact(
  db: D1Database,
  orgId: string,
  userId: string,
  contactId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM contacts WHERE org_id = ? AND user_id = ? AND contact_id = ?')
    .bind(orgId, userId, contactId)
    .run();
}

/* ==================== 日历查询 ==================== */

/** 获取企业下用户的日历事件 */
export async function getCalendarEvents(
  db: D1Database,
  orgId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const result = await db
    .prepare(
      `SELECT ce.* FROM calendar_events ce
       JOIN calendar_attendees ca ON ce.id = ca.event_id
       WHERE ce.org_id = ? AND ca.user_id = ? AND ce.start_time >= ? AND ce.end_time <= ?
       ORDER BY ce.start_time`
    )
    .bind(orgId, userId, startDate, endDate)
    .all<CalendarEvent>();

  return result.results;
}

/** 创建日历事件 */
export async function createCalendarEvent(
  db: D1Database,
  event: {
    id: string;
    org_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    all_day?: boolean;
    color?: string;
    creator_id: string;
    attendee_ids: string[];
  }
): Promise<CalendarEvent> {
  await db
    .prepare(
      `INSERT INTO calendar_events (id, org_id, title, description, start_time, end_time, all_day, color, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.id, event.org_id, event.title, event.description || null,
      event.start_time, event.end_time, event.all_day ? 1 : 0,
      event.color || '#3370FF', event.creator_id
    )
    .run();

  const stmts = event.attendee_ids.map((uid) =>
    db
      .prepare('INSERT INTO calendar_attendees (event_id, user_id, status) VALUES (?, ?, ?)')
      .bind(event.id, uid, uid === event.creator_id ? 'accepted' : 'pending')
  );
  if (stmts.length > 0) await db.batch(stmts);

  return db
    .prepare('SELECT * FROM calendar_events WHERE id = ?')
    .bind(event.id)
    .first<CalendarEvent>() as Promise<CalendarEvent>;
}

/** 获取事件参与者 */
export async function getEventAttendees(
  db: D1Database,
  eventId: string
): Promise<(CalendarAttendee & { user: User })[]> {
  const result = await db
    .prepare(
      `SELECT ca.*, u.name, u.email, u.avatar_url, u.status
       FROM calendar_attendees ca JOIN users u ON ca.user_id = u.id
       WHERE ca.event_id = ?`
    )
    .bind(eventId)
    .all<CalendarAttendee & { name: string; email: string; avatar_url: string | null; status: string }>();

  return result.results.map((row) => ({
    ...row,
    user: {
      id: row.user_id, email: row.email, name: row.name,
      avatar_url: row.avatar_url, status: row.status as User['status'],
      current_org_id: null, created_at: '',
    },
  }));
}

/* ==================== 云文档查询 ==================== */

/** 获取企业下的文档列表 */
export async function getDocuments(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<Document[]> {
  const result = await db
    .prepare(
      `SELECT d.*, u.name as creator_name FROM documents d
       JOIN users u ON d.creator_id = u.id
       WHERE d.org_id = ? AND d.creator_id = ?
       ORDER BY d.updated_at DESC`
    )
    .bind(orgId, userId)
    .all<Document & { creator_name: string }>();

  return result.results.map((row) => ({
    ...row,
    creator: {
      id: row.creator_id, email: '', name: row.creator_name,
      avatar_url: null, status: 'online' as const,
      current_org_id: orgId, created_at: '',
    },
  }));
}

/** 获取文档详情 */
export async function getDocument(
  db: D1Database,
  docId: string
): Promise<Document | null> {
  return db.prepare('SELECT * FROM documents WHERE id = ?').bind(docId).first<Document>();
}

/** 创建文档 */
export async function createDocument(
  db: D1Database,
  doc: { id: string; org_id: string; title: string; type: string; creator_id: string; content?: string }
): Promise<Document> {
  await db
    .prepare('INSERT INTO documents (id, org_id, title, type, creator_id, content) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(doc.id, doc.org_id, doc.title, doc.type, doc.creator_id, doc.content || '')
    .run();
  return (await getDocument(db, doc.id))!;
}

/** 更新文档内容 */
export async function updateDocument(
  db: D1Database,
  docId: string,
  content: string,
  title?: string
): Promise<void> {
  if (title) {
    await db
      .prepare('UPDATE documents SET content = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(content, title, docId).run();
  } else {
    await db
      .prepare('UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(content, docId).run();
  }
}
