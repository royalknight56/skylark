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
  Department,
  JoinRequest,
  AdminLog,
  OrgStats,
  OrgMemberRole,
  Bot,
  BotSubscription,
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

/**
 * 查找两个用户之间已有的私聊会话
 * 返回会话 ID，不存在则返回 null
 */
export async function findDirectConversation(
  db: D1Database,
  orgId: string,
  userIdA: string,
  userIdB: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
       JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
       WHERE c.org_id = ? AND c.type = 'direct'
       LIMIT 1`
    )
    .bind(userIdA, userIdB, orgId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

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
        m.created_at as last_message_at,
        /* 私聊时取对方的名字和头像 */
        peer.name as peer_name,
        peer.avatar_url as peer_avatar
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      /* 私聊对方：同会话中另一个成员 */
      LEFT JOIN conversation_members cm2
        ON c.id = cm2.conversation_id AND cm2.user_id != ? AND c.type = 'direct'
      LEFT JOIN users peer ON cm2.user_id = peer.id
      WHERE cm.user_id = ? AND c.org_id = ?
      ORDER BY COALESCE(m.created_at, c.updated_at) DESC`
    )
    .bind(userId, userId, orgId)
    .all<Conversation & { peer_name: string | null; peer_avatar: string | null }>();

  return result.results.map((row) => ({
    ...row,
    name: row.name || row.peer_name || null,
    avatar_url: row.avatar_url || row.peer_avatar || null,
  }));
}

/** 获取会话详情（私聊时自动填充对方名字） */
export async function getConversation(
  db: D1Database,
  conversationId: string,
  currentUserId?: string
): Promise<Conversation | null> {
  if (!currentUserId) {
    return db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .bind(conversationId)
      .first<Conversation>();
  }

  const row = await db
    .prepare(
      `SELECT c.*,
        peer.name as peer_name,
        peer.avatar_url as peer_avatar
      FROM conversations c
      LEFT JOIN conversation_members cm2
        ON c.id = cm2.conversation_id AND cm2.user_id != ? AND c.type = 'direct'
      LEFT JOIN users peer ON cm2.user_id = peer.id
      WHERE c.id = ?`
    )
    .bind(currentUserId, conversationId)
    .first<Conversation & { peer_name: string | null; peer_avatar: string | null }>();

  if (!row) return null;

  return {
    ...row,
    name: row.name || row.peer_name || null,
    avatar_url: row.avatar_url || row.peer_avatar || null,
  };
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

/**
 * 搜索企业内部成员（排除自己和已有联系人）
 * 用于「添加联系人」场景
 */
export async function searchOrgMembers(
  db: D1Database,
  orgId: string,
  currentUserId: string,
  keyword: string,
  limit = 20
): Promise<(OrgMember & { user: User })[]> {
  const pattern = `%${keyword}%`;
  const result = await db
    .prepare(
      `SELECT om.*, u.name, u.email, u.avatar_url, u.status
       FROM org_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.org_id = ?
         AND om.user_id != ?
         AND om.user_id NOT IN (
           SELECT contact_id FROM contacts WHERE org_id = ? AND user_id = ?
         )
         AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.name
       LIMIT ?`
    )
    .bind(orgId, currentUserId, orgId, currentUserId, pattern, pattern, limit)
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

/* ==================== 管理后台：企业信息 ==================== */

/** 更新企业信息 */
export async function updateOrganization(
  db: D1Database,
  orgId: string,
  fields: { name?: string; description?: string; logo_url?: string; require_approval?: boolean }
): Promise<Organization | null> {
  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
  if (fields.description !== undefined) { sets.push('description = ?'); values.push(fields.description); }
  if (fields.logo_url !== undefined) { sets.push('logo_url = ?'); values.push(fields.logo_url); }
  if (fields.require_approval !== undefined) { sets.push('require_approval = ?'); values.push(fields.require_approval ? 1 : 0); }

  if (sets.length === 0) return getOrganization(db, orgId);

  values.push(orgId);
  await db
    .prepare(`UPDATE organizations SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getOrganization(db, orgId);
}

/** 重新生成邀请码 */
export async function regenerateInviteCode(
  db: D1Database,
  orgId: string
): Promise<string> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  await db
    .prepare('UPDATE organizations SET invite_code = ? WHERE id = ?')
    .bind(code, orgId)
    .run();
  return code;
}

/* ==================== 管理后台：成员操作 ==================== */

/** 更新成员角色 */
export async function updateMemberRole(
  db: D1Database,
  orgId: string,
  userId: string,
  newRole: OrgMemberRole
): Promise<void> {
  await db
    .prepare('UPDATE org_members SET role = ? WHERE org_id = ? AND user_id = ?')
    .bind(newRole, orgId, userId)
    .run();
}

/** 更新成员部门 / 职位 */
export async function updateMemberInfo(
  db: D1Database,
  orgId: string,
  userId: string,
  fields: { department?: string | null; title?: string | null }
): Promise<void> {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (fields.department !== undefined) { sets.push('department = ?'); values.push(fields.department); }
  if (fields.title !== undefined) { sets.push('title = ?'); values.push(fields.title); }

  if (sets.length === 0) return;

  values.push(orgId, userId);
  await db
    .prepare(`UPDATE org_members SET ${sets.join(', ')} WHERE org_id = ? AND user_id = ?`)
    .bind(...values)
    .run();
}

/** 移除成员 */
export async function removeMember(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .run();
}

/* ==================== 管理后台：部门 ==================== */

/** 获取企业的部门列表 */
export async function getDepartments(
  db: D1Database,
  orgId: string
): Promise<Department[]> {
  const result = await db
    .prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM org_members WHERE org_id = d.org_id AND department = d.name) as member_count
       FROM departments d WHERE d.org_id = ?
       ORDER BY d.name`
    )
    .bind(orgId)
    .all<Department & { member_count: number }>();
  return result.results;
}

/** 创建部门 */
export async function createDepartment(
  db: D1Database,
  dept: { id: string; org_id: string; name: string; parent_id?: string }
): Promise<Department> {
  await db
    .prepare('INSERT INTO departments (id, org_id, name, parent_id) VALUES (?, ?, ?, ?)')
    .bind(dept.id, dept.org_id, dept.name, dept.parent_id || null)
    .run();
  return db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(dept.id)
    .first<Department>() as Promise<Department>;
}

/** 更新部门名称 */
export async function updateDepartment(
  db: D1Database,
  deptId: string,
  name: string
): Promise<void> {
  await db
    .prepare('UPDATE departments SET name = ? WHERE id = ?')
    .bind(name, deptId)
    .run();
}

/** 删除部门 */
export async function deleteDepartment(
  db: D1Database,
  deptId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM departments WHERE id = ?')
    .bind(deptId)
    .run();
}

/* ==================== 管理后台：加入申请 ==================== */

/** 获取企业的加入申请列表 */
export async function getJoinRequests(
  db: D1Database,
  orgId: string,
  status?: string
): Promise<JoinRequest[]> {
  const query = status
    ? `SELECT jr.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
       FROM join_requests jr JOIN users u ON jr.user_id = u.id
       WHERE jr.org_id = ? AND jr.status = ?
       ORDER BY jr.created_at DESC`
    : `SELECT jr.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
       FROM join_requests jr JOIN users u ON jr.user_id = u.id
       WHERE jr.org_id = ?
       ORDER BY jr.created_at DESC`;

  const binds = status ? [orgId, status] : [orgId];
  const result = await db
    .prepare(query)
    .bind(...binds)
    .all<JoinRequest & { user_name: string; user_email: string; user_avatar: string | null }>();

  return result.results.map((row) => ({
    ...row,
    user: {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      avatar_url: row.user_avatar,
      status: 'offline' as const,
      current_org_id: null,
      created_at: '',
    },
  }));
}

/** 创建加入申请 */
export async function createJoinRequest(
  db: D1Database,
  req: { id: string; org_id: string; user_id: string; message?: string }
): Promise<JoinRequest> {
  await db
    .prepare('INSERT INTO join_requests (id, org_id, user_id, message) VALUES (?, ?, ?, ?)')
    .bind(req.id, req.org_id, req.user_id, req.message || null)
    .run();
  return db
    .prepare('SELECT * FROM join_requests WHERE id = ?')
    .bind(req.id)
    .first<JoinRequest>() as Promise<JoinRequest>;
}

/** 审批加入申请 */
export async function reviewJoinRequest(
  db: D1Database,
  requestId: string,
  reviewerId: string,
  approved: boolean
): Promise<void> {
  await db
    .prepare(
      'UPDATE join_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    .bind(approved ? 'approved' : 'rejected', reviewerId, requestId)
    .run();
}

/** 检查用户是否已提交过待处理的申请 */
export async function hasPendingJoinRequest(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM join_requests WHERE org_id = ? AND user_id = ? AND status = ?')
    .bind(orgId, userId, 'pending')
    .first();
  return !!row;
}

/* ==================== 管理后台：操作日志 ==================== */

/** 获取操作日志（分页） */
export async function getAdminLogs(
  db: D1Database,
  orgId: string,
  limit = 20,
  offset = 0
): Promise<{ logs: AdminLog[]; total: number }> {
  const countRow = await db
    .prepare('SELECT COUNT(*) as total FROM admin_logs WHERE org_id = ?')
    .bind(orgId)
    .first<{ total: number }>();

  const result = await db
    .prepare(
      `SELECT al.*, u.name as operator_name, u.avatar_url as operator_avatar
       FROM admin_logs al JOIN users u ON al.operator_id = u.id
       WHERE al.org_id = ?
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
    )
    .bind(orgId, limit, offset)
    .all<AdminLog & { operator_name: string; operator_avatar: string | null }>();

  return {
    logs: result.results.map((row) => ({
      ...row,
      operator: {
        id: row.operator_id,
        email: '',
        name: row.operator_name,
        avatar_url: row.operator_avatar,
        status: 'offline' as const,
        current_org_id: null,
        created_at: '',
      },
    })),
    total: countRow?.total ?? 0,
  };
}

/** 记录操作日志 */
export async function createAdminLog(
  db: D1Database,
  log: {
    id: string;
    org_id: string;
    operator_id: string;
    action: string;
    target_type?: string;
    target_id?: string;
    detail?: string;
  }
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO admin_logs (id, org_id, operator_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      log.id, log.org_id, log.operator_id, log.action,
      log.target_type || null, log.target_id || null, log.detail || null
    )
    .run();
}

/* ==================== 管理后台：统计 ==================== */

/** 获取企业统计数据 */
export async function getOrgStats(
  db: D1Database,
  orgId: string
): Promise<OrgStats> {
  const members = await db
    .prepare('SELECT COUNT(*) as cnt FROM org_members WHERE org_id = ?')
    .bind(orgId)
    .first<{ cnt: number }>();

  const newMembers = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM org_members
       WHERE org_id = ? AND joined_at >= datetime('now', '-7 days')`
    )
    .bind(orgId)
    .first<{ cnt: number }>();

  const messages = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.org_id = ?`
    )
    .bind(orgId)
    .first<{ cnt: number }>();

  const docs = await db
    .prepare('SELECT COUNT(*) as cnt FROM documents WHERE org_id = ?')
    .bind(orgId)
    .first<{ cnt: number }>();

  const pending = await db
    .prepare('SELECT COUNT(*) as cnt FROM join_requests WHERE org_id = ? AND status = ?')
    .bind(orgId, 'pending')
    .first<{ cnt: number }>();

  return {
    total_members: members?.cnt ?? 0,
    new_members_this_week: newMembers?.cnt ?? 0,
    total_messages: messages?.cnt ?? 0,
    total_documents: docs?.cnt ?? 0,
    pending_requests: pending?.cnt ?? 0,
  };
}

/* ==================== 机器人 ==================== */

/** 生成安全随机 token */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'sk-bot-';
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** 获取企业的机器人列表 */
export async function getBots(
  db: D1Database,
  orgId: string
): Promise<Bot[]> {
  const result = await db
    .prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM bot_subscriptions WHERE bot_id = b.id) as subscription_count,
        u.name as creator_name
       FROM bots b
       JOIN users u ON b.created_by = u.id
       WHERE b.org_id = ?
       ORDER BY b.created_at DESC`
    )
    .bind(orgId)
    .all<Bot & { creator_name: string }>();
  return result.results.map((row) => ({
    ...row,
    creator: {
      id: row.created_by,
      email: '',
      name: row.creator_name,
      avatar_url: null,
      status: 'offline' as const,
      current_org_id: null,
      created_at: '',
    },
  }));
}

/** 获取单个机器人详情 */
export async function getBot(
  db: D1Database,
  botId: string
): Promise<Bot | null> {
  return db
    .prepare('SELECT * FROM bots WHERE id = ?')
    .bind(botId)
    .first<Bot>();
}

/** 通过 API token 查找机器人 */
export async function getBotByToken(
  db: D1Database,
  token: string
): Promise<Bot | null> {
  return db
    .prepare('SELECT * FROM bots WHERE api_token = ? AND status = ?')
    .bind(token, 'active')
    .first<Bot>();
}

/** 创建机器人 */
export async function createBot(
  db: D1Database,
  bot: { id: string; org_id: string; name: string; description?: string; webhook_url?: string; created_by: string }
): Promise<Bot> {
  const apiToken = generateToken();
  const webhookSecret = generateToken().replace('sk-bot-', 'whsec-');

  await db
    .prepare(
      `INSERT INTO bots (id, org_id, name, description, api_token, webhook_url, webhook_secret, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(bot.id, bot.org_id, bot.name, bot.description || null, apiToken, bot.webhook_url || null, webhookSecret, bot.created_by)
    .run();

  return (await getBot(db, bot.id))!;
}

/** 更新机器人信息 */
export async function updateBot(
  db: D1Database,
  botId: string,
  fields: { name?: string; description?: string; avatar_url?: string; webhook_url?: string; status?: string }
): Promise<Bot | null> {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
  if (fields.description !== undefined) { sets.push('description = ?'); values.push(fields.description); }
  if (fields.avatar_url !== undefined) { sets.push('avatar_url = ?'); values.push(fields.avatar_url); }
  if (fields.webhook_url !== undefined) { sets.push('webhook_url = ?'); values.push(fields.webhook_url); }
  if (fields.status !== undefined) { sets.push('status = ?'); values.push(fields.status); }

  if (sets.length === 0) return getBot(db, botId);

  values.push(botId);
  await db
    .prepare(`UPDATE bots SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getBot(db, botId);
}

/** 重新生成 API token */
export async function regenerateBotToken(
  db: D1Database,
  botId: string
): Promise<string> {
  const newToken = generateToken();
  await db
    .prepare('UPDATE bots SET api_token = ? WHERE id = ?')
    .bind(newToken, botId)
    .run();
  return newToken;
}

/** 删除机器人 */
export async function deleteBot(
  db: D1Database,
  botId: string
): Promise<void> {
  await db.prepare('DELETE FROM bots WHERE id = ?').bind(botId).run();
}

/** 获取机器人订阅的会话列表 */
export async function getBotSubscriptions(
  db: D1Database,
  botId: string
): Promise<BotSubscription[]> {
  const result = await db
    .prepare(
      `SELECT bs.*, c.name as conv_name, c.type as conv_type
       FROM bot_subscriptions bs
       JOIN conversations c ON bs.conversation_id = c.id
       WHERE bs.bot_id = ?
       ORDER BY bs.subscribed_at DESC`
    )
    .bind(botId)
    .all<BotSubscription & { conv_name: string | null; conv_type: string }>();
  return result.results.map((row) => ({
    ...row,
    conversation: {
      id: row.conversation_id,
      org_id: '',
      type: row.conv_type as 'direct' | 'group',
      name: row.conv_name,
      avatar_url: null,
      created_by: '',
      created_at: '',
      updated_at: '',
    },
  }));
}

/** 订阅会话 */
export async function subscribeBotToConversation(
  db: D1Database,
  botId: string,
  conversationId: string
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO bot_subscriptions (bot_id, conversation_id) VALUES (?, ?)')
    .bind(botId, conversationId)
    .run();
}

/** 取消订阅会话 */
export async function unsubscribeBotFromConversation(
  db: D1Database,
  botId: string,
  conversationId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM bot_subscriptions WHERE bot_id = ? AND conversation_id = ?')
    .bind(botId, conversationId)
    .run();
}

/** 获取订阅了某会话的所有活跃机器人 */
export async function getBotsSubscribedToConversation(
  db: D1Database,
  conversationId: string
): Promise<Bot[]> {
  const result = await db
    .prepare(
      `SELECT b.* FROM bots b
       JOIN bot_subscriptions bs ON b.id = bs.bot_id
       WHERE bs.conversation_id = ? AND b.status = 'active' AND b.webhook_url IS NOT NULL`
    )
    .bind(conversationId)
    .all<Bot>();
  return result.results;
}

/** 以机器人身份发送消息（写入 messages 表，sender_id 使用 bot 的 id） */
export async function createBotMessage(
  db: D1Database,
  msg: { id: string; conversation_id: string; bot_id: string; bot_name: string; content: string; type?: string }
): Promise<Message> {
  await db
    .prepare(
      `INSERT INTO messages (id, conversation_id, sender_id, content, type)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(msg.id, msg.conversation_id, msg.bot_id, msg.content, msg.type || 'text')
    .run();

  await db
    .prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(msg.conversation_id)
    .run();

  return {
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.bot_id,
    content: msg.content,
    type: (msg.type || 'text') as Message['type'],
    reply_to: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    sender: {
      id: msg.bot_id,
      email: '',
      name: `🤖 ${msg.bot_name}`,
      avatar_url: null,
      status: 'online',
      current_org_id: null,
      created_at: '',
    },
  };
}
