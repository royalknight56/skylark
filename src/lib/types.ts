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
  industry: string | null;
  address: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  invite_code: string | null;
  owner_id: string;
  require_approval: boolean;
  created_at: string;
  /** 前端展示用 */
  member_count?: number;
  /** 当前用户在该企业中的成员状态 */
  member_status?: MemberStatus;
}

export type Gender = 'male' | 'female' | 'unknown';
export type MemberStatus = 'active' | 'suspended' | 'departed';

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  department: string | null;
  title: string | null;
  employee_id: string | null;
  phone: string | null;
  work_city: string | null;
  gender: Gender | null;
  employee_type: string | null;
  member_status: MemberStatus;
  suspended_at: string | null;
  departed_at: string | null;
  resource_receiver_id: string | null;
  sort_order: number;
  joined_at: string;
  user?: User;
  /** 资源接收人（前端展示用） */
  receiver?: User;
}

/** 人员类型选项 */
export interface EmployeeType {
  id: string;
  org_id: string;
  name: string;
  is_builtin: boolean;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
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
  /** 前端展示用 */
  inviter?: User;
}

/* ==================== 用户相关 ==================== */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  login_phone?: string | null;
  status: 'online' | 'offline' | 'busy' | 'away';
  status_text?: string | null;
  status_emoji?: string | null;
  signature?: string | null;
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
  description: string | null;
  is_public: boolean;
  invite_code: string | null;
  invite_expire_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** 前端展示用：最后一条消息预览 */
  last_message?: string;
  last_message_at?: string;
  /** 未读消息数 */
  unread_count?: number;
  /** 成员数（群设置时用） */
  member_count?: number;
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

export type MessageType = 'text' | 'image' | 'file' | 'system' | 'card';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  reply_to: string | null;
  recalled: boolean;
  recalled_by: string | null;
  recalled_at: string | null;
  created_at: string;
  updated_at: string | null;
  /** 前端展示用：发送者信息 */
  sender?: User;
  /** 撤回者信息（前端展示用） */
  recaller?: User;
  /** 文件附件信息（type 为 image/file 时） */
  attachment?: FileAttachment;
  /** 已读人数（群聊时展示） */
  read_count?: number;
  /** 当前用户是否已读 / 单聊对方是否已读 */
  is_read?: boolean;
  /** 表情回复列表 */
  reactions?: MessageReaction[];
}

/** 消息已读用户信息 */
export interface MessageReadInfo {
  user_id: string;
  read_at: string;
  user?: User;
}

/** 消息表情回复 */
export interface MessageReaction {
  emoji: string;
  count: number;
  users: { user_id: string; name: string }[];
  /** 当前用户是否发送过该表情 */
  is_self?: boolean;
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

/* ==================== 会议室相关 ==================== */

export type RoomStatus = 'available' | 'maintenance' | 'disabled';

export interface MeetingRoom {
  id: string;
  org_id: string;
  name: string;
  building: string;
  floor: string | null;
  room_number: string;
  capacity: number;
  facilities: string[] | null;
  status: RoomStatus;
  created_at: string;
}

/* ==================== 日历相关 ==================== */

export interface CalendarEvent {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  creator_id: string;
  room_id: string | null;
  recurrence_rule: string | null;
  recurrence_end: string | null;
  reminder_minutes: number;
  visibility: 'default' | 'public' | 'private';
  status: 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
  /** 前端展示用 */
  room?: MeetingRoom;
  creator?: User;
  attendees?: CalendarAttendee[];
  /** 参与者统计 */
  attendee_count?: number;
  accepted_count?: number;
}

/** 重复规则预设 */
export type RecurrencePreset = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'weekdays';

export type AttendeeStatus = 'accepted' | 'declined' | 'pending' | 'tentative';

export interface CalendarAttendee {
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  is_optional: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  responded_at: string | null;
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
  | 'leave'
  | 'recall'
  | 'reaction';

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
  leader_id: string | null;
  created_at: string;
  /** 前端展示用 */
  member_count?: number;
  /** 部门负责人信息 */
  leader?: User;
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

/* ==================== 机器人相关 ==================== */

export type BotStatus = 'active' | 'disabled';

export interface Bot {
  id: string;
  org_id: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  api_token: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  status: BotStatus;
  created_by: string;
  created_at: string;
  /** 前端展示用 */
  subscription_count?: number;
  creator?: User;
}

export interface BotSubscription {
  bot_id: string;
  conversation_id: string;
  subscribed_at: string;
  /** 前端展示用 */
  conversation?: Conversation;
}

/** Bot API 发送消息请求体 */
export interface BotSendMessagePayload {
  conversation_id: string;
  content: string;
  type?: 'text' | 'image' | 'file';
}

/** Webhook 事件推送体 */
export interface BotWebhookEvent {
  event: 'message';
  bot_id: string;
  timestamp: string;
  data: {
    message_id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    type: string;
    created_at: string;
  };
}

/* ==================== 多维表格相关 ==================== */

/** 多维表格（相当于一个独立的数据库/应用） */
export interface Base {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  icon: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  creator?: User;
  /** 数据表数量（前端展示用） */
  table_count?: number;
}

/** 数据表（base 下的一张表） */
export interface BaseTable {
  id: string;
  base_id: string;
  name: string;
  position: number;
  created_at: string;
}

/** 字段类型枚举 */
export type BaseFieldType =
  | 'text' | 'number' | 'date' | 'checkbox'
  | 'select' | 'multi_select'
  | 'url' | 'email' | 'phone'
  | 'rating' | 'progress' | 'member'
  | 'created_at' | 'updated_at';

/** 单选 / 多选的选项 */
export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

/** 字段配置（存储在 options JSON 列中） */
export interface BaseFieldOptions {
  /** select / multi_select 的选项列表 */
  choices?: SelectOption[];
  /** number 的精度 */
  precision?: number;
  /** date 的格式 */
  dateFormat?: string;
  /** rating 的最大值 */
  maxRating?: number;
}

/** 字段（列定义） */
export interface BaseField {
  id: string;
  table_id: string;
  name: string;
  type: BaseFieldType;
  options: BaseFieldOptions | null;
  is_primary: boolean;
  position: number;
  created_at: string;
}

/** 记录（行数据） */
export interface BaseRecord {
  id: string;
  table_id: string;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 视图类型 */
export type BaseViewType = 'grid' | 'kanban' | 'form';

/** 筛选条件 */
export interface ViewFilter {
  field_id: string;
  operator: 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'is_empty' | 'is_not_empty';
  value: unknown;
}

/** 排序条件 */
export interface ViewSort {
  field_id: string;
  direction: 'asc' | 'desc';
}

/** 视图配置 */
export interface BaseViewConfig {
  filters?: ViewFilter[];
  sorts?: ViewSort[];
  hidden_fields?: string[];
  field_widths?: Record<string, number>;
  /** 看板视图的分组字段 ID */
  kanban_field_id?: string;
  /** 表单视图的字段顺序和描述 */
  form_fields?: { field_id: string; required?: boolean; description?: string }[];
}

/** 视图 */
export interface BaseView {
  id: string;
  table_id: string;
  name: string;
  type: BaseViewType;
  config: BaseViewConfig;
  position: number;
  created_at: string;
}

/* ==================== 管理员角色与权限 ==================== */

/** 系统预定义的管理权限点 */
export type AdminPermission =
  | 'members'         // 成员管理
  | 'departments'     // 部门管理
  | 'employee_types'  // 人员类型管理
  | 'settings'        // 企业设置
  | 'join_requests'   // 加入审批
  | 'rooms'           // 会议室管理
  | 'bots'            // 机器人管理
  | 'logs'            // 操作日志
  | 'roles';          // 管理员权限管理

/** 权限点描述 */
export const ADMIN_PERMISSION_META: Record<AdminPermission, { label: string; desc: string }> = {
  members:        { label: '成员管理',     desc: '查看和管理企业成员信息、邀请、离职等' },
  departments:    { label: '部门管理',     desc: '创建、编辑、删除部门，设置部门负责人' },
  employee_types: { label: '人员类型',     desc: '管理自定义人员类型' },
  settings:       { label: '企业设置',     desc: '修改企业名称、头像、联系人等基本信息' },
  join_requests:  { label: '加入审批',     desc: '审批通过邀请码申请加入的请求' },
  rooms:          { label: '会议室管理',   desc: '管理会议室资源和预定设置' },
  bots:           { label: '机器人管理',   desc: '管理企业自建机器人' },
  logs:           { label: '操作日志',     desc: '查看管理后台操作记录' },
  roles:          { label: '管理员权限',   desc: '创建管理员角色、分配权限和管理员' },
};

/** 全部权限 key 列表 */
export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = Object.keys(ADMIN_PERMISSION_META) as AdminPermission[];

/** 管理员角色 */
export interface AdminRole {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  parent_role_id: string | null;
  permissions: AdminPermission[];
  can_delegate: boolean;
  created_at: string;
  /** 关联的成员数 */
  member_count?: number;
  /** 上级角色名称 */
  parent_name?: string;
}

/** 角色成员 */
export interface AdminRoleMember {
  role_id: string;
  user_id: string;
  added_at: string;
  user?: User;
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
