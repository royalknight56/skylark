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
  Base,
  BaseTable,
  BaseField,
  BaseFieldOptions,
  BaseRecord,
  BaseView,
  BaseViewConfig,
  MeetingRoom,
  EmployeeType,
  MemberStatus,
} from '../types';

/* ==================== 企业/组织查询 ==================== */

/** 获取用户所属的所有企业 */
export async function getUserOrganizations(
  db: D1Database,
  userId: string
): Promise<(Organization & { member_status?: string })[]> {
  const result = await db
    .prepare(
      `SELECT o.*, om.member_status,
        (SELECT COUNT(*) FROM org_members WHERE org_id = o.id) as member_count
       FROM organizations o
       JOIN org_members om ON o.id = om.org_id
       WHERE om.user_id = ?
       ORDER BY om.joined_at`
    )
    .bind(userId)
    .all<Organization & { member_count: number; member_status?: string }>();
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
      `SELECT om.*, u.name, u.email, u.avatar_url, u.login_phone, u.status
       FROM org_members om JOIN users u ON om.user_id = u.id
       WHERE om.org_id = ? AND (om.member_status IS NULL OR om.member_status != 'departed')
       ORDER BY
         CASE WHEN om.sort_order > 0 THEN 0 ELSE 1 END,
         om.sort_order DESC,
         CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         u.name`
    )
    .bind(orgId)
    .all<OrgMember & { name: string; email: string; avatar_url: string | null; login_phone?: string | null; status: string }>();

  return result.results.map((row) => ({
    ...row,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      login_phone: row.login_phone ?? null,
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

/* ==================== 会议室查询 ==================== */

/** 获取企业下所有会议室 */
export async function getMeetingRooms(db: D1Database, orgId: string): Promise<MeetingRoom[]> {
  const result = await db
    .prepare('SELECT * FROM meeting_rooms WHERE org_id = ? ORDER BY building, room_number')
    .bind(orgId)
    .all<MeetingRoom & { facilities: string | null }>();
  return result.results.map((r) => ({
    ...r,
    facilities: r.facilities ? JSON.parse(r.facilities as string) as string[] : null,
  }));
}

/** 获取可用会议室 */
export async function getAvailableRooms(db: D1Database, orgId: string): Promise<MeetingRoom[]> {
  const result = await db
    .prepare("SELECT * FROM meeting_rooms WHERE org_id = ? AND status = 'available' ORDER BY building, room_number")
    .bind(orgId)
    .all<MeetingRoom & { facilities: string | null }>();
  return result.results.map((r) => ({
    ...r,
    facilities: r.facilities ? JSON.parse(r.facilities as string) as string[] : null,
  }));
}

/** 获取单个会议室 */
export async function getMeetingRoom(db: D1Database, roomId: string): Promise<MeetingRoom | null> {
  const row = await db.prepare('SELECT * FROM meeting_rooms WHERE id = ?').bind(roomId)
    .first<MeetingRoom & { facilities: string | null }>();
  if (!row) return null;
  return { ...row, facilities: row.facilities ? JSON.parse(row.facilities as string) as string[] : null };
}

/** 创建会议室 */
export async function createMeetingRoom(
  db: D1Database,
  room: { org_id: string; name: string; building: string; floor?: string; room_number: string; capacity?: number; facilities?: string[] }
): Promise<MeetingRoom> {
  const id = `room-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await db.prepare(
    'INSERT INTO meeting_rooms (id, org_id, name, building, floor, room_number, capacity, facilities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, room.org_id, room.name, room.building, room.floor || null,
    room.room_number, room.capacity || 10, room.facilities ? JSON.stringify(room.facilities) : null
  ).run();
  return {
    id, org_id: room.org_id, name: room.name, building: room.building,
    floor: room.floor || null, room_number: room.room_number,
    capacity: room.capacity || 10,
    facilities: room.facilities || null,
    status: 'available', created_at: new Date().toISOString(),
  };
}

/** 更新会议室 */
export async function updateMeetingRoom(
  db: D1Database,
  roomId: string,
  data: { name?: string; building?: string; floor?: string; room_number?: string; capacity?: number; facilities?: string[]; status?: string }
) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.building !== undefined) { sets.push('building = ?'); vals.push(data.building); }
  if (data.floor !== undefined) { sets.push('floor = ?'); vals.push(data.floor); }
  if (data.room_number !== undefined) { sets.push('room_number = ?'); vals.push(data.room_number); }
  if (data.capacity !== undefined) { sets.push('capacity = ?'); vals.push(data.capacity); }
  if (data.facilities !== undefined) { sets.push('facilities = ?'); vals.push(JSON.stringify(data.facilities)); }
  if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
  if (sets.length === 0) return;
  vals.push(roomId);
  await db.prepare(`UPDATE meeting_rooms SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

/** 删除会议室 */
export async function deleteMeetingRoom(db: D1Database, roomId: string) {
  await db.prepare('DELETE FROM meeting_rooms WHERE id = ?').bind(roomId).run();
}

/** 检测会议室时间冲突（区间重叠判断） */
export async function checkRoomConflict(
  db: D1Database,
  roomId: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<CalendarEvent | null> {
  const sql = excludeEventId
    ? `SELECT * FROM calendar_events WHERE room_id = ? AND id != ? AND start_time < ? AND end_time > ? LIMIT 1`
    : `SELECT * FROM calendar_events WHERE room_id = ? AND start_time < ? AND end_time > ? LIMIT 1`;

  const stmt = excludeEventId
    ? db.prepare(sql).bind(roomId, excludeEventId, endTime, startTime)
    : db.prepare(sql).bind(roomId, endTime, startTime);

  return stmt.first<CalendarEvent>() as Promise<CalendarEvent | null>;
}

/** 查询指定时段内某会议室的所有预订 */
export async function getRoomBookings(
  db: D1Database,
  roomId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const result = await db
    .prepare('SELECT * FROM calendar_events WHERE room_id = ? AND start_time < ? AND end_time > ? ORDER BY start_time')
    .bind(roomId, endDate, startDate)
    .all<CalendarEvent>();
  return result.results;
}

/* ==================== 日历查询 ==================== */

/** 获取企业下用户的日历事件（关联会议室信息） */
export async function getCalendarEvents(
  db: D1Database,
  orgId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const result = await db
    .prepare(
      `SELECT ce.*, mr.name AS room_name, mr.building AS room_building,
              mr.floor AS room_floor, mr.room_number AS room_room_number,
              mr.capacity AS room_capacity
       FROM calendar_events ce
       JOIN calendar_attendees ca ON ce.id = ca.event_id
       LEFT JOIN meeting_rooms mr ON ce.room_id = mr.id
       WHERE ce.org_id = ? AND ca.user_id = ? AND ce.start_time >= ? AND ce.end_time <= ?
       ORDER BY ce.start_time`
    )
    .bind(orgId, userId, startDate, endDate)
    .all<CalendarEvent & {
      room_name: string | null; room_building: string | null;
      room_floor: string | null; room_room_number: string | null;
      room_capacity: number | null;
    }>();

  return result.results.map((row) => ({
    ...row,
    room: row.room_id && row.room_name ? {
      id: row.room_id, org_id: orgId, name: row.room_name,
      building: row.room_building!, floor: row.room_floor,
      room_number: row.room_room_number!, capacity: row.room_capacity || 10,
      facilities: null, status: 'available' as const, created_at: '',
    } : undefined,
  }));
}

/** 创建日历事件（支持预订会议室） */
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
    room_id?: string;
  }
): Promise<CalendarEvent> {
  await db
    .prepare(
      `INSERT INTO calendar_events (id, org_id, title, description, start_time, end_time, all_day, color, creator_id, room_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.id, event.org_id, event.title, event.description || null,
      event.start_time, event.end_time, event.all_day ? 1 : 0,
      event.color || '#3370FF', event.creator_id, event.room_id || null
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

/* ==================== 管理后台：邮件邀请 ==================== */

/** 创建邀请记录（按邮箱邀请） */
export async function createInvite(
  db: D1Database,
  invite: { id: string; org_id: string; inviter_id: string; invitee_email: string; expires_at: string }
): Promise<OrgInvite> {
  await db.prepare(
    'INSERT INTO org_invites (id, org_id, inviter_id, invitee_email, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(invite.id, invite.org_id, invite.inviter_id, invite.invitee_email, invite.expires_at).run();

  return {
    id: invite.id, org_id: invite.org_id, inviter_id: invite.inviter_id,
    invitee_email: invite.invitee_email, status: 'pending',
    created_at: new Date().toISOString(), expires_at: invite.expires_at,
  };
}

/** 批量创建邀请（多个邮箱） */
export async function createBatchInvites(
  db: D1Database,
  orgId: string,
  inviterId: string,
  emails: string[],
  expiresAt: string
): Promise<OrgInvite[]> {
  const invites: OrgInvite[] = [];
  const stmts = emails.map((email) => {
    const id = `inv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    invites.push({
      id, org_id: orgId, inviter_id: inviterId, invitee_email: email,
      status: 'pending', created_at: new Date().toISOString(), expires_at: expiresAt,
    });
    return db.prepare(
      'INSERT INTO org_invites (id, org_id, inviter_id, invitee_email, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, orgId, inviterId, email, expiresAt);
  });
  if (stmts.length > 0) await db.batch(stmts);
  return invites;
}

/** 获取企业的邀请列表（含邀请人信息） */
export async function getOrgInvites(
  db: D1Database,
  orgId: string,
  status?: string
): Promise<OrgInvite[]> {
  const sql = status
    ? `SELECT oi.*, u.name AS inviter_name, u.email AS inviter_email, u.avatar_url AS inviter_avatar
       FROM org_invites oi JOIN users u ON oi.inviter_id = u.id
       WHERE oi.org_id = ? AND oi.status = ? ORDER BY oi.created_at DESC`
    : `SELECT oi.*, u.name AS inviter_name, u.email AS inviter_email, u.avatar_url AS inviter_avatar
       FROM org_invites oi JOIN users u ON oi.inviter_id = u.id
       WHERE oi.org_id = ? ORDER BY oi.created_at DESC`;

  const result = status
    ? await db.prepare(sql).bind(orgId, status).all<OrgInvite & { inviter_name: string; inviter_email: string; inviter_avatar: string | null }>()
    : await db.prepare(sql).bind(orgId).all<OrgInvite & { inviter_name: string; inviter_email: string; inviter_avatar: string | null }>();

  return result.results.map((row) => ({
    ...row,
    inviter: {
      id: row.inviter_id, name: row.inviter_name, email: row.inviter_email,
      avatar_url: row.inviter_avatar, status: 'offline' as const,
      current_org_id: null, created_at: '',
    },
  }));
}

/** 通过邀请 ID 获取邀请详情（含企业信息） */
export async function getInviteById(
  db: D1Database,
  inviteId: string
): Promise<(OrgInvite & { org: Organization }) | null> {
  const row = await db.prepare(
    `SELECT oi.*, o.name AS org_name, o.logo_url AS org_logo, o.description AS org_desc,
            o.owner_id AS org_owner_id, o.invite_code AS org_invite_code,
            (SELECT COUNT(*) FROM org_members WHERE org_id = o.id) AS org_member_count
     FROM org_invites oi JOIN organizations o ON oi.org_id = o.id
     WHERE oi.id = ?`
  ).bind(inviteId).first<OrgInvite & {
    org_name: string; org_logo: string | null; org_desc: string | null;
    org_owner_id: string; org_invite_code: string | null; org_member_count: number;
  }>();

  if (!row) return null;
  return {
    ...row,
    org: {
      id: row.org_id, name: row.org_name, logo_url: row.org_logo,
      description: row.org_desc, invite_code: row.org_invite_code,
      owner_id: row.org_owner_id, require_approval: false,
      created_at: '', member_count: row.org_member_count,
    },
  };
}

/** 通过邮箱查找待处理的邀请 */
export async function getPendingInviteByEmail(
  db: D1Database,
  orgId: string,
  email: string
): Promise<OrgInvite | null> {
  return db.prepare(
    "SELECT * FROM org_invites WHERE org_id = ? AND invitee_email = ? AND status = 'pending' LIMIT 1"
  ).bind(orgId, email).first<OrgInvite>();
}

/** 接受邀请（更新状态 + 加入企业） */
export async function acceptInvite(
  db: D1Database,
  inviteId: string,
  userId: string
): Promise<boolean> {
  await db.prepare("UPDATE org_invites SET status = 'accepted' WHERE id = ?").bind(inviteId).run();
  const invite = await db.prepare('SELECT * FROM org_invites WHERE id = ?').bind(inviteId).first<OrgInvite>();
  if (!invite) return false;

  const already = await isOrgMember(db, invite.org_id, userId);
  if (!already) {
    await joinOrganization(db, invite.org_id, userId);
  }
  return true;
}

/** 撤销/取消邀请 */
export async function cancelInvite(db: D1Database, inviteId: string): Promise<void> {
  await db.prepare("UPDATE org_invites SET status = 'expired' WHERE id = ?").bind(inviteId).run();
}

/** 将过期邀请标记为 expired */
export async function expireInvites(db: D1Database, orgId: string): Promise<void> {
  await db.prepare(
    "UPDATE org_invites SET status = 'expired' WHERE org_id = ? AND status = 'pending' AND expires_at < datetime('now')"
  ).bind(orgId).run();
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
  fields: {
    department?: string | null;
    title?: string | null;
    employee_id?: string | null;
    phone?: string | null;
    work_city?: string | null;
    gender?: string | null;
    employee_type?: string | null;
  }
): Promise<void> {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (fields.department !== undefined) { sets.push('department = ?'); values.push(fields.department); }
  if (fields.title !== undefined) { sets.push('title = ?'); values.push(fields.title); }
  if (fields.employee_id !== undefined) { sets.push('employee_id = ?'); values.push(fields.employee_id); }
  if (fields.phone !== undefined) { sets.push('phone = ?'); values.push(fields.phone); }
  if (fields.work_city !== undefined) { sets.push('work_city = ?'); values.push(fields.work_city); }
  if (fields.gender !== undefined) { sets.push('gender = ?'); values.push(fields.gender); }
  if (fields.employee_type !== undefined) { sets.push('employee_type = ?'); values.push(fields.employee_type); }

  if (sets.length === 0) return;

  values.push(orgId, userId);
  await db
    .prepare(`UPDATE org_members SET ${sets.join(', ')} WHERE org_id = ? AND user_id = ?`)
    .bind(...values)
    .run();
}

/** 获取单个成员详情（含用户信息） */
export async function getMemberDetail(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<(OrgMember & { user: User }) | null> {
  const row = await db
    .prepare(
      `SELECT om.*, u.name, u.email, u.avatar_url, u.status, u.created_at AS user_created_at
       FROM org_members om JOIN users u ON om.user_id = u.id
       WHERE om.org_id = ? AND om.user_id = ?`
    )
    .bind(orgId, userId)
    .first<OrgMember & { name: string; email: string; avatar_url: string | null; status: string; user_created_at: string }>();

  if (!row) return null;
  return {
    ...row,
    user: {
      id: row.user_id, email: row.email, name: row.name,
      avatar_url: row.avatar_url, status: row.status as User['status'],
      current_org_id: orgId, created_at: row.user_created_at,
    },
  };
}

/** 更新用户基本信息（姓名等） */
export async function updateUserName(db: D1Database, userId: string, name: string): Promise<void> {
  await db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, userId).run();
}

/** 修改用户登录邮箱（需先校验唯一性） */
export async function updateUserEmail(
  db: D1Database, userId: string, newEmail: string
): Promise<{ ok: boolean; reason?: string }> {
  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .bind(newEmail, userId)
    .first<{ id: string }>();
  if (existing) return { ok: false, reason: '该邮箱已被其他用户使用' };

  await db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(newEmail, userId).run();
  return { ok: true };
}

/** 修改用户登录手机号（需先校验唯一性，传 null 清除手机号） */
export async function updateUserLoginPhone(
  db: D1Database, userId: string, phone: string | null
): Promise<{ ok: boolean; reason?: string }> {
  if (phone) {
    const existing = await db
      .prepare('SELECT id FROM users WHERE login_phone = ? AND id != ?')
      .bind(phone, userId)
      .first<{ id: string }>();
    if (existing) return { ok: false, reason: '该手机号已被其他用户使用' };
  }

  await db.prepare('UPDATE users SET login_phone = ? WHERE id = ?').bind(phone, userId).run();
  return { ok: true };
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

/** 暂停成员账号 */
export async function suspendMember(
  db: D1Database, orgId: string, userId: string
): Promise<{ ok: boolean; reason?: string }> {
  const row = await db
    .prepare('SELECT role, member_status FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ role: string; member_status: string | null }>();
  if (!row) return { ok: false, reason: '成员不存在' };
  if (row.role === 'owner') return { ok: false, reason: '不能暂停创建者账号' };
  if (row.member_status === 'suspended') return { ok: false, reason: '该成员已处于暂停状态' };

  await db
    .prepare('UPDATE org_members SET member_status = ?, suspended_at = ? WHERE org_id = ? AND user_id = ?')
    .bind('suspended', new Date().toISOString(), orgId, userId)
    .run();
  return { ok: true };
}

/** 恢复成员账号 */
export async function restoreMember(
  db: D1Database, orgId: string, userId: string
): Promise<{ ok: boolean; reason?: string }> {
  const row = await db
    .prepare('SELECT member_status FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ member_status: string | null }>();
  if (!row) return { ok: false, reason: '成员不存在' };
  if (row.member_status !== 'suspended') return { ok: false, reason: '该成员未处于暂停状态' };

  await db
    .prepare('UPDATE org_members SET member_status = ?, suspended_at = NULL WHERE org_id = ? AND user_id = ?')
    .bind('active', orgId, userId)
    .run();
  return { ok: true };
}

/** 检查成员是否被暂停 */
export async function isMemberSuspended(
  db: D1Database, orgId: string, userId: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT member_status FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ member_status: string | null }>();
  return row?.member_status === 'suspended';
}

/** 操作成员离职（标记为 departed + 可选资源转移） */
export async function departMember(
  db: D1Database,
  orgId: string,
  userId: string,
  receiverId: string | null,
  transferDocs: boolean,
  transferEvents: boolean,
  transferConversations: boolean,
): Promise<{ ok: boolean; reason?: string; transferred: string[] }> {
  const row = await db
    .prepare('SELECT role, member_status FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ role: string; member_status: string | null }>();
  if (!row) return { ok: false, reason: '成员不存在', transferred: [] };
  if (row.role === 'owner') return { ok: false, reason: '不能操作创建者离职', transferred: [] };
  if (row.member_status === 'departed') return { ok: false, reason: '该成员已离职', transferred: [] };

  const now = new Date().toISOString();
  const transferred: string[] = [];

  // 资源转移
  if (receiverId) {
    if (transferDocs) {
      const docs = await db
        .prepare('UPDATE documents SET creator_id = ? WHERE org_id = ? AND creator_id = ?')
        .bind(receiverId, orgId, userId).run();
      transferred.push(`文档 ${docs.meta.changes} 篇`);
    }
    if (transferEvents) {
      const events = await db
        .prepare('UPDATE calendar_events SET creator_id = ? WHERE org_id = ? AND creator_id = ? AND start_time > ?')
        .bind(receiverId, orgId, userId, now).run();
      transferred.push(`未来日程 ${events.meta.changes} 个`);
    }
    if (transferConversations) {
      const convos = await db
        .prepare('UPDATE conversations SET created_by = ? WHERE org_id = ? AND created_by = ? AND type = ?')
        .bind(receiverId, orgId, userId, 'group').run();
      transferred.push(`群聊 ${convos.meta.changes} 个`);
    }
  }

  // 标记离职
  await db
    .prepare('UPDATE org_members SET member_status = ?, departed_at = ?, resource_receiver_id = ? WHERE org_id = ? AND user_id = ?')
    .bind('departed', now, receiverId, orgId, userId)
    .run();

  return { ok: true, transferred };
}

/** 获取已离职成员列表 */
export async function getDepartedMembers(
  db: D1Database, orgId: string
): Promise<OrgMember[]> {
  const result = await db
    .prepare(
      `SELECT om.*,
        u.id as uid, u.email, u.name, u.avatar_url, u.status as ustatus, u.created_at as ucreated,
        r.id as rid, r.name as rname, r.email as remail, r.avatar_url as ravatar
       FROM org_members om
       LEFT JOIN users u ON om.user_id = u.id
       LEFT JOIN users r ON om.resource_receiver_id = r.id
       WHERE om.org_id = ? AND om.member_status = 'departed'
       ORDER BY om.departed_at DESC`
    )
    .bind(orgId)
    .all();
  return result.results.map((r: Record<string, unknown>) => ({
    org_id: r.org_id as string,
    user_id: r.user_id as string,
    role: r.role as OrgMemberRole,
    department: r.department as string | null,
    title: r.title as string | null,
    employee_id: r.employee_id as string | null,
    phone: r.phone as string | null,
    work_city: r.work_city as string | null,
    gender: r.gender as string | null,
    employee_type: r.employee_type as string | null,
    member_status: r.member_status as MemberStatus,
    suspended_at: r.suspended_at as string | null,
    departed_at: r.departed_at as string | null,
    resource_receiver_id: r.resource_receiver_id as string | null,
    joined_at: r.joined_at as string,
    user: r.uid ? {
      id: r.uid as string, email: r.email as string, name: r.name as string,
      avatar_url: r.avatar_url as string | null, status: (r.ustatus || 'offline') as User['status'],
      current_org_id: null, created_at: r.ucreated as string,
    } : undefined,
    receiver: r.rid ? {
      id: r.rid as string, email: r.remail as string, name: r.rname as string,
      avatar_url: r.ravatar as string | null, status: 'offline' as const,
      current_org_id: null, created_at: '',
    } : undefined,
  })) as OrgMember[];
}

/** 恢复离职成员 */
export async function restoreDepartedMember(
  db: D1Database, orgId: string, userId: string
): Promise<{ ok: boolean; reason?: string }> {
  const row = await db
    .prepare('SELECT member_status, departed_at FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ member_status: string | null; departed_at: string | null }>();
  if (!row) return { ok: false, reason: '成员不存在' };
  if (row.member_status !== 'departed') return { ok: false, reason: '该成员不是离职状态' };

  // 30天内可恢复
  if (row.departed_at) {
    const departedTime = new Date(row.departed_at).getTime();
    const daysSince = (Date.now() - departedTime) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return { ok: false, reason: '离职超过30天，无法恢复' };
  }

  await db
    .prepare('UPDATE org_members SET member_status = ?, departed_at = NULL, resource_receiver_id = NULL WHERE org_id = ? AND user_id = ?')
    .bind('active', orgId, userId)
    .run();
  return { ok: true };
}

/** 永久删除离职成员 */
export async function permanentDeleteMember(
  db: D1Database, orgId: string, userId: string
): Promise<{ ok: boolean; reason?: string }> {
  const row = await db
    .prepare('SELECT member_status FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ member_status: string | null }>();
  if (!row) return { ok: false, reason: '成员不存在' };
  if (row.member_status !== 'departed') return { ok: false, reason: '只能删除已离职成员' };

  await db
    .prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .run();
  return { ok: true };
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
        (SELECT COUNT(*) FROM org_members WHERE org_id = d.org_id AND department = d.name AND (member_status IS NULL OR member_status != 'departed')) as member_count,
        u.id as lid, u.name as lname, u.email as lemail, u.avatar_url as lavatar
       FROM departments d
       LEFT JOIN users u ON d.leader_id = u.id
       WHERE d.org_id = ?
       ORDER BY d.name`
    )
    .bind(orgId)
    .all();
  return result.results.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    org_id: r.org_id as string,
    name: r.name as string,
    parent_id: r.parent_id as string | null,
    leader_id: r.leader_id as string | null,
    created_at: r.created_at as string,
    member_count: r.member_count as number,
    leader: r.lid ? {
      id: r.lid as string, name: r.lname as string, email: r.lemail as string,
      avatar_url: r.lavatar as string | null, status: 'offline' as const,
      current_org_id: null, created_at: '',
    } : undefined,
  })) as Department[];
}

/** 创建部门 */
export async function createDepartment(
  db: D1Database,
  dept: { id: string; org_id: string; name: string; parent_id?: string; leader_id?: string }
): Promise<Department> {
  await db
    .prepare('INSERT INTO departments (id, org_id, name, parent_id, leader_id) VALUES (?, ?, ?, ?, ?)')
    .bind(dept.id, dept.org_id, dept.name, dept.parent_id || null, dept.leader_id || null)
    .run();
  return db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(dept.id)
    .first<Department>() as Promise<Department>;
}

/** 更新部门（名称 + 负责人） */
export async function updateDepartment(
  db: D1Database,
  deptId: string,
  name: string,
  leaderId?: string | null
): Promise<void> {
  if (leaderId !== undefined) {
    await db
      .prepare('UPDATE departments SET name = ?, leader_id = ? WHERE id = ?')
      .bind(name, leaderId, deptId)
      .run();
  } else {
    await db
      .prepare('UPDATE departments SET name = ? WHERE id = ?')
      .bind(name, deptId)
      .run();
  }
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

/** 查找用户与机器人的现有会话（通过会话名匹配 bot:${botId}） */
export async function findBotConversation(
  db: D1Database,
  orgId: string,
  userId: string,
  botId: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id AND cm.user_id = ?
       JOIN bot_subscriptions bs ON c.id = bs.conversation_id AND bs.bot_id = ?
       WHERE c.org_id = ? AND c.type = 'direct'
       LIMIT 1`
    )
    .bind(userId, botId, orgId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

/** 创建用户与机器人的会话（自动订阅机器人） */
export async function createBotConversation(
  db: D1Database,
  orgId: string,
  userId: string,
  bot: { id: string; name: string; avatar_url: string | null }
): Promise<Conversation> {
  const convId = `conv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  // 创建会话，名称用机器人名（带机器人标识）
  await db.prepare(
    'INSERT INTO conversations (id, org_id, type, name, avatar_url, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(convId, orgId, 'direct', `🤖 ${bot.name}`, bot.avatar_url, userId).run();

  // 添加用户为成员
  await db.prepare(
    'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(convId, userId, 'owner').run();

  // 自动订阅机器人到此会话
  await db.prepare(
    'INSERT OR IGNORE INTO bot_subscriptions (bot_id, conversation_id) VALUES (?, ?)'
  ).bind(bot.id, convId).run();

  return (await getConversation(db, convId))!;
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

/* ==================== 人员类型查询 ==================== */

/** 预置人员类型列表 */
const BUILTIN_EMPLOYEE_TYPES = ['正式', '实习', '外包', '劳务', '顾问'];

/** 初始化企业的预置人员类型（仅当该企业还没有任何记录时） */
export async function ensureBuiltinEmployeeTypes(db: D1Database, orgId: string): Promise<void> {
  const existing = await db
    .prepare('SELECT COUNT(*) as cnt FROM employee_types WHERE org_id = ?')
    .bind(orgId)
    .first<{ cnt: number }>();
  if (existing && existing.cnt > 0) return;

  const stmts = BUILTIN_EMPLOYEE_TYPES.map((name, i) =>
    db.prepare(
      `INSERT INTO employee_types (id, org_id, name, is_builtin, is_active, is_default, sort_order)
       VALUES (?, ?, ?, 1, 1, ?, ?)`
    ).bind(`et-builtin-${i + 1}`, orgId, name, i === 0 ? 1 : 0, i)
  );
  await db.batch(stmts);
}

/** D1 返回的人员类型原始行（boolean 字段为 number） */
interface EmployeeTypeRow {
  id: string; org_id: string; name: string;
  is_builtin: number; is_active: number; is_default: number;
  sort_order: number; created_at: string;
}

function mapEmployeeTypeRow(r: EmployeeTypeRow): EmployeeType {
  return {
    id: r.id, org_id: r.org_id, name: r.name,
    is_builtin: r.is_builtin === 1,
    is_active: r.is_active === 1,
    is_default: r.is_default === 1,
    sort_order: r.sort_order, created_at: r.created_at,
  };
}

/** 获取企业所有人员类型 */
export async function getEmployeeTypes(db: D1Database, orgId: string): Promise<EmployeeType[]> {
  await ensureBuiltinEmployeeTypes(db, orgId);
  const result = await db
    .prepare('SELECT * FROM employee_types WHERE org_id = ? ORDER BY sort_order, created_at')
    .bind(orgId)
    .all<EmployeeTypeRow>();
  return result.results.map(mapEmployeeTypeRow);
}

/** 获取企业活跃的人员类型（给成员选择用） */
export async function getActiveEmployeeTypes(db: D1Database, orgId: string): Promise<EmployeeType[]> {
  await ensureBuiltinEmployeeTypes(db, orgId);
  const result = await db
    .prepare('SELECT * FROM employee_types WHERE org_id = ? AND is_active = 1 ORDER BY sort_order, created_at')
    .bind(orgId)
    .all<EmployeeTypeRow>();
  return result.results.map(mapEmployeeTypeRow);
}

/** 创建自定义人员类型 */
export async function createEmployeeType(
  db: D1Database,
  id: string,
  orgId: string,
  name: string
): Promise<EmployeeType> {
  const maxOrder = await db
    .prepare('SELECT MAX(sort_order) as mx FROM employee_types WHERE org_id = ?')
    .bind(orgId)
    .first<{ mx: number | null }>();
  const order = (maxOrder?.mx ?? -1) + 1;

  await db.prepare(
    `INSERT INTO employee_types (id, org_id, name, is_builtin, is_active, is_default, sort_order)
     VALUES (?, ?, ?, 0, 1, 0, ?)`
  ).bind(id, orgId, name, order).run();

  return {
    id, org_id: orgId, name,
    is_builtin: false, is_active: true, is_default: false,
    sort_order: order, created_at: new Date().toISOString(),
  };
}

/** 切换人员类型启用/停用状态 */
export async function toggleEmployeeType(db: D1Database, id: string, isActive: boolean): Promise<void> {
  await db.prepare('UPDATE employee_types SET is_active = ? WHERE id = ?')
    .bind(isActive ? 1 : 0, id).run();
}

/** 设置默认人员类型（先清除旧默认，再设新默认） */
export async function setDefaultEmployeeType(db: D1Database, orgId: string, typeId: string): Promise<void> {
  await db.prepare('UPDATE employee_types SET is_default = 0 WHERE org_id = ?').bind(orgId).run();
  await db.prepare('UPDATE employee_types SET is_default = 1 WHERE id = ? AND org_id = ?')
    .bind(typeId, orgId).run();
}

/** 删除自定义人员类型（仅非内置类型可删；需检查是否有成员在用） */
export async function deleteEmployeeType(db: D1Database, orgId: string, typeId: string): Promise<{ ok: boolean; reason?: string }> {
  const et = await db
    .prepare('SELECT is_builtin, name FROM employee_types WHERE id = ? AND org_id = ?')
    .bind(typeId, orgId)
    .first<{ is_builtin: number; name: string }>();
  if (!et) return { ok: false, reason: '人员类型不存在' };
  if (et.is_builtin === 1) return { ok: false, reason: '预置类型不可删除' };

  const usedCount = await db
    .prepare('SELECT COUNT(*) as cnt FROM org_members WHERE org_id = ? AND employee_type = ?')
    .bind(orgId, et.name)
    .first<{ cnt: number }>();
  if (usedCount && usedCount.cnt > 0) {
    return { ok: false, reason: `仍有 ${usedCount.cnt} 名成员使用该类型，请先修改后再删除` };
  }

  await db.prepare('DELETE FROM employee_types WHERE id = ? AND org_id = ?').bind(typeId, orgId).run();
  return { ok: true };
}

/** 批量新增自定义人员类型 */
export async function batchCreateEmployeeTypes(
  db: D1Database, orgId: string, names: string[]
): Promise<EmployeeType[]> {
  const maxOrder = await db
    .prepare('SELECT MAX(sort_order) as mx FROM employee_types WHERE org_id = ?')
    .bind(orgId)
    .first<{ mx: number | null }>();
  let order = (maxOrder?.mx ?? -1) + 1;

  const results: EmployeeType[] = [];
  const stmts = names.map((name) => {
    const id = `et-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const o = order++;
    results.push({
      id, org_id: orgId, name,
      is_builtin: false, is_active: true, is_default: false,
      sort_order: o, created_at: new Date().toISOString(),
    });
    return db.prepare(
      `INSERT INTO employee_types (id, org_id, name, is_builtin, is_active, is_default, sort_order)
       VALUES (?, ?, ?, 0, 1, 0, ?)`
    ).bind(id, orgId, name, o);
  });
  await db.batch(stmts);
  return results;
}

/* ==================== 多维表格查询 ==================== */

/** 生成短 ID */
function baseId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 获取企业下所有多维表格 */
export async function getBases(db: D1Database, orgId: string): Promise<Base[]> {
  const result = await db
    .prepare(
      `SELECT b.*, u.name AS creator_name, u.avatar_url AS creator_avatar,
              (SELECT COUNT(*) FROM base_tables WHERE base_id = b.id) AS table_count
       FROM bases b
       LEFT JOIN users u ON b.creator_id = u.id
       WHERE b.org_id = ?
       ORDER BY b.updated_at DESC`
    )
    .bind(orgId)
    .all<Base & { creator_name: string; creator_avatar: string | null; table_count: number }>();

  return result.results.map((row) => ({
    ...row,
    creator: { id: row.creator_id, name: row.creator_name, avatar_url: row.creator_avatar, email: '', status: 'offline' as const, current_org_id: null, created_at: '' },
  }));
}

/** 获取单个多维表格 */
export async function getBase(db: D1Database, baseId: string): Promise<Base | null> {
  const row = await db
    .prepare(
      `SELECT b.*, u.name AS creator_name, u.avatar_url AS creator_avatar,
              (SELECT COUNT(*) FROM base_tables WHERE base_id = b.id) AS table_count
       FROM bases b LEFT JOIN users u ON b.creator_id = u.id
       WHERE b.id = ?`
    )
    .bind(baseId)
    .first<Base & { creator_name: string; creator_avatar: string | null; table_count: number }>();

  if (!row) return null;
  return {
    ...row,
    creator: { id: row.creator_id, name: row.creator_name, avatar_url: row.creator_avatar, email: '', status: 'offline' as const, current_org_id: null, created_at: '' },
  };
}

/** 创建多维表格（自动创建默认数据表和字段） */
export async function createBase(
  db: D1Database,
  orgId: string,
  creatorId: string,
  name: string,
  description?: string
): Promise<Base> {
  const id = baseId('base');
  const tableId = baseId('tbl');
  const fieldId = baseId('fld');
  const viewId = baseId('viw');

  const batch = [
    db.prepare('INSERT INTO bases (id, org_id, name, description, creator_id) VALUES (?, ?, ?, ?, ?)')
      .bind(id, orgId, name, description || null, creatorId),
    db.prepare('INSERT INTO base_tables (id, base_id, name, position) VALUES (?, ?, ?, 0)')
      .bind(tableId, id, '数据表 1'),
    db.prepare('INSERT INTO base_fields (id, table_id, name, type, is_primary, position) VALUES (?, ?, ?, ?, 1, 0)')
      .bind(fieldId, tableId, '标题', 'text'),
    db.prepare('INSERT INTO base_views (id, table_id, name, type, position) VALUES (?, ?, ?, ?, 0)')
      .bind(viewId, tableId, '表格视图', 'grid'),
  ];
  await db.batch(batch);

  return {
    id, org_id: orgId, name, description: description || null,
    icon: '📊', creator_id: creatorId,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    table_count: 1,
  };
}

/** 更新多维表格 */
export async function updateBase(db: D1Database, id: string, data: { name?: string; description?: string; icon?: string }) {
  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
  if (data.icon !== undefined) { sets.push('icon = ?'); vals.push(data.icon); }
  vals.push(id);
  await db.prepare(`UPDATE bases SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

/** 删除多维表格 */
export async function deleteBase(db: D1Database, id: string) {
  await db.prepare('DELETE FROM bases WHERE id = ?').bind(id).run();
}

/* ---------- 数据表 ---------- */

/** 获取 base 下所有数据表 */
export async function getBaseTables(db: D1Database, baseIdVal: string): Promise<BaseTable[]> {
  const result = await db
    .prepare('SELECT * FROM base_tables WHERE base_id = ? ORDER BY position')
    .bind(baseIdVal)
    .all<BaseTable>();
  return result.results;
}

/** 创建数据表 */
export async function createBaseTable(db: D1Database, baseIdVal: string, name: string): Promise<BaseTable> {
  const id = baseId('tbl');
  const fieldId = baseId('fld');
  const viewId = baseId('viw');
  const pos = await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM base_tables WHERE base_id = ?')
    .bind(baseIdVal).first<{ p: number }>();

  const batch = [
    db.prepare('INSERT INTO base_tables (id, base_id, name, position) VALUES (?, ?, ?, ?)')
      .bind(id, baseIdVal, name, pos?.p || 0),
    db.prepare('INSERT INTO base_fields (id, table_id, name, type, is_primary, position) VALUES (?, ?, ?, ?, 1, 0)')
      .bind(fieldId, id, '标题', 'text'),
    db.prepare('INSERT INTO base_views (id, table_id, name, type, position) VALUES (?, ?, ?, ?, 0)')
      .bind(viewId, id, '表格视图', 'grid'),
    db.prepare('UPDATE bases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(baseIdVal),
  ];
  await db.batch(batch);

  return { id, base_id: baseIdVal, name, position: pos?.p || 0, created_at: new Date().toISOString() };
}

/** 重命名数据表 */
export async function renameBaseTable(db: D1Database, tableId: string, name: string) {
  await db.prepare('UPDATE base_tables SET name = ? WHERE id = ?').bind(name, tableId).run();
}

/** 删除数据表 */
export async function deleteBaseTable(db: D1Database, tableId: string) {
  await db.prepare('DELETE FROM base_tables WHERE id = ?').bind(tableId).run();
}

/* ---------- 字段 ---------- */

/** D1 返回的字段行原始类型 */
interface BaseFieldRow {
  id: string;
  table_id: string;
  name: string;
  type: string;
  options: string | null;
  is_primary: number;
  position: number;
  created_at: string;
}

/** 获取数据表的所有字段 */
export async function getBaseFields(db: D1Database, tableId: string): Promise<BaseField[]> {
  const result = await db
    .prepare('SELECT * FROM base_fields WHERE table_id = ? ORDER BY position')
    .bind(tableId)
    .all<BaseFieldRow>();
  return result.results.map((r) => ({
    id: r.id,
    table_id: r.table_id,
    name: r.name,
    type: r.type as BaseField['type'],
    options: r.options ? JSON.parse(r.options) as BaseFieldOptions : null,
    is_primary: r.is_primary === 1,
    position: r.position,
    created_at: r.created_at,
  }));
}

/** 创建字段 */
export async function createBaseField(
  db: D1Database,
  tableId: string,
  name: string,
  type: string,
  options?: BaseFieldOptions
): Promise<BaseField> {
  const id = baseId('fld');
  const pos = await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM base_fields WHERE table_id = ?')
    .bind(tableId).first<{ p: number }>();
  await db.prepare('INSERT INTO base_fields (id, table_id, name, type, options, position) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, tableId, name, type, options ? JSON.stringify(options) : null, pos?.p || 0).run();
  return {
    id, table_id: tableId, name, type: type as BaseField['type'],
    options: options || null, is_primary: false, position: pos?.p || 0,
    created_at: new Date().toISOString(),
  };
}

/** 更新字段 */
export async function updateBaseField(
  db: D1Database,
  fieldId: string,
  data: { name?: string; type?: string; options?: BaseFieldOptions }
) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.type !== undefined) { sets.push('type = ?'); vals.push(data.type); }
  if (data.options !== undefined) { sets.push('options = ?'); vals.push(JSON.stringify(data.options)); }
  if (sets.length === 0) return;
  vals.push(fieldId);
  await db.prepare(`UPDATE base_fields SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

/** 删除字段（同时清理记录中的数据） */
export async function deleteBaseField(db: D1Database, fieldId: string, tableId: string) {
  await db.batch([
    db.prepare('DELETE FROM base_fields WHERE id = ? AND is_primary = 0').bind(fieldId),
  ]);
  // 从记录 data JSON 中移除该字段的值
  const records = await db.prepare('SELECT id, data FROM base_records WHERE table_id = ?').bind(tableId).all<{ id: string; data: string }>();
  if (records.results.length > 0) {
    const stmts = records.results.map((r) => {
      const parsed = JSON.parse(r.data) as Record<string, unknown>;
      delete parsed[fieldId];
      return db.prepare('UPDATE base_records SET data = ? WHERE id = ?').bind(JSON.stringify(parsed), r.id);
    });
    if (stmts.length > 0) await db.batch(stmts);
  }
}

/* ---------- 记录 ---------- */

/** 获取数据表的所有记录 */
export async function getBaseRecords(db: D1Database, tableId: string): Promise<BaseRecord[]> {
  const result = await db
    .prepare('SELECT * FROM base_records WHERE table_id = ? ORDER BY created_at')
    .bind(tableId)
    .all<BaseRecord & { data: string }>();
  return result.results.map((r) => ({
    ...r,
    data: JSON.parse(r.data as string) as Record<string, unknown>,
  }));
}

/** 创建记录 */
export async function createBaseRecord(
  db: D1Database,
  tableId: string,
  data: Record<string, unknown>,
  createdBy?: string
): Promise<BaseRecord> {
  const id = baseId('rec');
  await db.prepare('INSERT INTO base_records (id, table_id, data, created_by) VALUES (?, ?, ?, ?)')
    .bind(id, tableId, JSON.stringify(data), createdBy || null).run();
  return {
    id, table_id: tableId, data, created_by: createdBy || null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

/** 更新记录 */
export async function updateBaseRecord(db: D1Database, recordId: string, data: Record<string, unknown>) {
  await db.prepare('UPDATE base_records SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(JSON.stringify(data), recordId).run();
}

/** 删除记录 */
export async function deleteBaseRecord(db: D1Database, recordId: string) {
  await db.prepare('DELETE FROM base_records WHERE id = ?').bind(recordId).run();
}

/** 批量删除记录 */
export async function deleteBaseRecords(db: D1Database, recordIds: string[]) {
  if (recordIds.length === 0) return;
  const stmts = recordIds.map((id) => db.prepare('DELETE FROM base_records WHERE id = ?').bind(id));
  await db.batch(stmts);
}

/* ---------- 视图 ---------- */

/** 获取数据表的所有视图 */
export async function getBaseViews(db: D1Database, tableId: string): Promise<BaseView[]> {
  const result = await db
    .prepare('SELECT * FROM base_views WHERE table_id = ? ORDER BY position')
    .bind(tableId)
    .all<BaseView & { config: string }>();
  return result.results.map((r) => ({
    ...r,
    config: JSON.parse(r.config as string) as BaseViewConfig,
  }));
}

/** 创建视图 */
export async function createBaseView(
  db: D1Database,
  tableId: string,
  name: string,
  type: string,
  config?: BaseViewConfig
): Promise<BaseView> {
  const id = baseId('viw');
  const pos = await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM base_views WHERE table_id = ?')
    .bind(tableId).first<{ p: number }>();
  await db.prepare('INSERT INTO base_views (id, table_id, name, type, config, position) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, tableId, name, type, JSON.stringify(config || {}), pos?.p || 0).run();
  return {
    id, table_id: tableId, name, type: type as BaseView['type'],
    config: config || {}, position: pos?.p || 0, created_at: new Date().toISOString(),
  };
}

/** 更新视图配置 */
export async function updateBaseView(db: D1Database, viewId: string, data: { name?: string; config?: BaseViewConfig }) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.config !== undefined) { sets.push('config = ?'); vals.push(JSON.stringify(data.config)); }
  if (sets.length === 0) return;
  vals.push(viewId);
  await db.prepare(`UPDATE base_views SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

/** 删除视图 */
export async function deleteBaseView(db: D1Database, viewId: string) {
  await db.prepare('DELETE FROM base_views WHERE id = ?').bind(viewId).run();
}

// ─── 成员排序 ─────────────────────────────────

/** 置顶成员（设置 sort_order） */
export async function pinMember(db: D1Database, orgId: string, userId: string) {
  const max = await db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM org_members WHERE org_id = ?')
    .bind(orgId)
    .first<{ m: number }>();
  const next = (max?.m ?? 0) + 1;
  await db
    .prepare('UPDATE org_members SET sort_order = ? WHERE org_id = ? AND user_id = ?')
    .bind(next, orgId, userId)
    .run();
  return next;
}

/** 取消置顶 */
export async function unpinMember(db: D1Database, orgId: string, userId: string) {
  await db
    .prepare('UPDATE org_members SET sort_order = 0 WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .run();
}

/** 批量更新成员排序（拖拽重排后提交） */
export async function batchUpdateSortOrder(
  db: D1Database,
  orgId: string,
  orders: { user_id: string; sort_order: number }[]
) {
  const stmts = orders.map((o) =>
    db
      .prepare('UPDATE org_members SET sort_order = ? WHERE org_id = ? AND user_id = ?')
      .bind(o.sort_order, orgId, o.user_id)
  );
  await db.batch(stmts);
}
