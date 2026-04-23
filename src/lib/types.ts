/**
 * Skylark 全局类型定义
 * @author skylark
 */

/* ==================== 企业/组织相关 ==================== */

export type OrgMemberRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  invite_code: string | null;
  owner_id: string;
  require_approval: boolean;
  created_at: string;
  /** 前端展示用 */
  member_count?: number;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  department: string | null;
  title: string | null;
  joined_at: string;
  user?: User;
}

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface OrgInvite {
  id: string;
  org_id: string;
  inviter_id: string;
  invitee_email: string | null;
  status: InviteStatus;
  created_at: string;
  expires_at: string | null;
  org?: Organization;
}

/* ==================== 用户相关 ==================== */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'busy' | 'away';
  current_org_id: string | null;
  created_at: string;
}

/* ==================== 会话相关 ==================== */

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  org_id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** 前端展示用：最后一条消息预览 */
  last_message?: string;
  last_message_at?: string;
  /** 未读消息数 */
  unread_count?: number;
}

export type MemberRole = 'owner' | 'admin' | 'member';

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_read_at: string | null;
}

/* ==================== 消息相关 ==================== */

export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  reply_to: string | null;
  created_at: string;
  updated_at: string | null;
  /** 前端展示用：发送者信息 */
  sender?: User;
  /** 文件附件信息（type 为 image/file 时） */
  attachment?: FileAttachment;
}

export interface FileAttachment {
  name: string;
  size: number;
  mime_type: string;
  r2_key: string;
  url?: string;
}

/* ==================== 通讯录相关 ==================== */

export interface Contact {
  user_id: string;
  contact_id: string;
  group_name: string;
  created_at: string;
  /** 前端展示用：联系人详情 */
  contact?: User;
}

/* ==================== 日历相关 ==================== */

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  creator_id: string;
  created_at: string;
}

export type AttendeeStatus = 'accepted' | 'declined' | 'pending';

export interface CalendarAttendee {
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  user?: User;
}

/* ==================== 云文档相关 ==================== */

export type DocType = 'doc' | 'sheet';

export interface Document {
  id: string;
  title: string;
  content: string | null;
  type: DocType;
  creator_id: string;
  r2_key: string | null;
  created_at: string;
  updated_at: string;
  creator?: User;
}

/* ==================== WebSocket 消息协议 ==================== */

export type WSMessageType =
  | 'message'
  | 'typing'
  | 'read'
  | 'online'
  | 'offline'
  | 'join'
  | 'leave';

export interface WSMessage {
  type: WSMessageType;
  payload: Record<string, unknown>;
  timestamp: string;
}

/* ==================== 部门相关 ==================== */

export interface Department {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  /** 前端展示用 */
  member_count?: number;
  /** 前端树状结构用 */
  children?: Department[];
}

/* ==================== 加入申请相关 ==================== */

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface JoinRequest {
  id: string;
  org_id: string;
  user_id: string;
  message: string | null;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  /** 前端展示用 */
  user?: User;
  reviewer?: User;
}

/* ==================== 操作日志相关 ==================== */

export interface AdminLog {
  id: string;
  org_id: string;
  operator_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
  /** 前端展示用 */
  operator?: User;
}

/* ==================== 管理后台统计 ==================== */

export interface OrgStats {
  total_members: number;
  new_members_this_week: number;
  total_messages: number;
  total_documents: number;
  pending_requests: number;
}

/* ==================== API 响应 ==================== */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  page_size: number;
}
