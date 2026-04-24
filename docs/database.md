# Skylark 数据库字典

> 基于 Cloudflare D1 (SQLite)，所有表定义在 `src/lib/db/schema.sql`，查询封装在 `src/lib/db/queries.ts`。

---

## 目录

- [organizations — 企业表](#organizations)
- [org_members — 企业成员表](#org_members)
- [org_invites — 企业邀请表](#org_invites)
- [departments — 部门表](#departments)
- [join_requests — 加入申请表](#join_requests)
- [admin_logs — 操作日志表](#admin_logs)
- [users — 用户表](#users)
- [conversations — 会话表](#conversations)
- [conversation_members — 会话成员表](#conversation_members)
- [messages — 消息表](#messages)
- [bots — 机器人表](#bots)
- [bot_subscriptions — 机器人订阅表](#bot_subscriptions)
- [contacts — 联系人表](#contacts)
- [meeting_rooms — 会议室表](#meeting_rooms)
- [calendar_events — 日历事件表](#calendar_events)
- [calendar_attendees — 日程参与人表](#calendar_attendees)
- [documents — 云文档表](#documents)
- [bases — 多维表格应用表](#bases)
- [base_tables — 数据表](#base_tables)
- [base_fields — 字段定义表](#base_fields)
- [base_records — 记录表](#base_records)
- [base_views — 视图表](#base_views)

---

## organizations

企业/组织信息。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 企业 ID |
| `name` | TEXT | NOT NULL | 企业名称 |
| `logo_url` | TEXT | | 企业 Logo URL |
| `description` | TEXT | | 企业描述 |
| `invite_code` | TEXT | UNIQUE | 企业邀请码 |
| `owner_id` | TEXT | NOT NULL | 创建者/拥有者 ID |
| `require_approval` | BOOLEAN | DEFAULT 0 | 加入是否需要审批 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

## org_members

企业与用户的成员关系。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `org_id` | TEXT | PK, FK → organizations | 企业 ID |
| `user_id` | TEXT | PK, FK → users | 用户 ID |
| `role` | TEXT | CHECK(owner/admin/member) DEFAULT 'member' | 角色 |
| `department` | TEXT | | 部门名称 |
| `title` | TEXT | | 职位 |
| `employee_id` | TEXT | | 工号 |
| `phone` | TEXT | | 手机号 |
| `work_city` | TEXT | | 工作城市 |
| `gender` | TEXT | CHECK(male/female/unknown) | 性别 |
| `joined_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 加入时间 |

---

## org_invites

管理员通过邮箱发出的邀请记录。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 邀请 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `inviter_id` | TEXT | FK → users | 邀请人 ID |
| `invitee_email` | TEXT | | 被邀请人邮箱 |
| `status` | TEXT | CHECK(pending/accepted/expired) DEFAULT 'pending' | 状态 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `expires_at` | DATETIME | | 过期时间 |

索引：`idx_org_invites_email(invitee_email, status)`

---

## departments

部门树形组织结构。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 部门 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `name` | TEXT | NOT NULL | 部门名称 |
| `parent_id` | TEXT | FK → departments, ON DELETE SET NULL | 父部门 ID |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

## join_requests

用户申请加入企业的审批记录。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 申请 ID |
| `org_id` | TEXT | FK → organizations | 目标企业 ID |
| `user_id` | TEXT | FK → users | 申请人 ID |
| `message` | TEXT | | 申请留言 |
| `status` | TEXT | CHECK(pending/approved/rejected) DEFAULT 'pending' | 审批状态 |
| `reviewed_by` | TEXT | FK → users | 审批人 ID |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 申请时间 |
| `reviewed_at` | DATETIME | | 审批时间 |

索引：`idx_join_requests_org_status(org_id, status)`

---

## admin_logs

管理员操作审计日志。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 日志 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `operator_id` | TEXT | FK → users | 操作人 ID |
| `action` | TEXT | NOT NULL | 操作类型（如 create_member, update_bot） |
| `target_type` | TEXT | | 操作对象类型 |
| `target_id` | TEXT | | 操作对象 ID |
| `detail` | TEXT | | 详细信息（JSON 或文本） |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 操作时间 |

索引：`idx_admin_logs_org_time(org_id, created_at DESC)`

---

## users

用户信息表。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 用户 ID |
| `email` | TEXT | UNIQUE, NOT NULL | 邮箱 |
| `name` | TEXT | NOT NULL | 姓名 |
| `avatar_url` | TEXT | | 头像 URL |
| `status` | TEXT | CHECK(online/offline/busy/away) DEFAULT 'offline' | 在线状态 |
| `current_org_id` | TEXT | FK → organizations | 当前所在企业 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 注册时间 |

---

## conversations

会话信息，绑定企业。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 会话 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `type` | TEXT | CHECK(direct/group) NOT NULL | 类型：私聊/群聊 |
| `name` | TEXT | | 会话名称（群名或机器人名） |
| `avatar_url` | TEXT | | 会话头像 |
| `created_by` | TEXT | FK → users | 创建者 ID |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 最后更新时间 |

---

## conversation_members

会话成员关系。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `conversation_id` | TEXT | PK, FK → conversations | 会话 ID |
| `user_id` | TEXT | PK, FK → users | 成员 ID |
| `role` | TEXT | CHECK(owner/admin/member) DEFAULT 'member' | 角色 |
| `joined_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 加入时间 |
| `last_read_at` | DATETIME | | 最后已读时间 |

---

## messages

消息内容表。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 消息 ID |
| `conversation_id` | TEXT | FK → conversations | 所属会话 |
| `sender_id` | TEXT | FK → users | 发送者 ID（机器人为 bot ID） |
| `content` | TEXT | NOT NULL | 消息内容（文本/URL） |
| `type` | TEXT | CHECK(text/image/file/system) DEFAULT 'text' | 消息类型 |
| `reply_to` | TEXT | FK → messages | 回复的消息 ID |
| `file_name` | TEXT | | 文件名 |
| `file_size` | INTEGER | | 文件大小（字节） |
| `file_mime` | TEXT | | MIME 类型 |
| `file_r2_key` | TEXT | | R2 存储 Key |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 发送时间 |
| `updated_at` | DATETIME | | 编辑时间 |

索引：`idx_messages_conv_time(conversation_id, created_at DESC)`

---

## bots

企业自建机器人。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 机器人 ID |
| `org_id` | TEXT | FK → organizations | 所属企业 |
| `name` | TEXT | NOT NULL | 机器人名称 |
| `avatar_url` | TEXT | | 头像 URL |
| `description` | TEXT | | 功能描述 |
| `api_token` | TEXT | UNIQUE, NOT NULL | API 鉴权 Token |
| `webhook_url` | TEXT | | 回调地址 |
| `webhook_secret` | TEXT | | 回调签名密钥 |
| `status` | TEXT | CHECK(active/disabled) DEFAULT 'active' | 状态 |
| `created_by` | TEXT | FK → users | 创建者 ID |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引：`idx_bots_org(org_id)`，`idx_bots_token(api_token)`

---

## bot_subscriptions

机器人对会话的订阅关系。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `bot_id` | TEXT | PK, FK → bots | 机器人 ID |
| `conversation_id` | TEXT | PK, FK → conversations | 会话 ID |
| `subscribed_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 订阅时间 |

---

## contacts

通讯录联系人关系（按企业隔离）。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `org_id` | TEXT | PK, FK → organizations | 企业 ID |
| `user_id` | TEXT | PK, FK → users | 用户 ID |
| `contact_id` | TEXT | PK, FK → users | 联系人 ID |
| `group_name` | TEXT | DEFAULT '我的联系人' | 分组名称 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 添加时间 |

---

## meeting_rooms

会议室配置（管理员维护）。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 会议室 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `name` | TEXT | NOT NULL | 名称 |
| `building` | TEXT | NOT NULL | 楼栋 |
| `floor` | TEXT | | 楼层 |
| `room_number` | TEXT | NOT NULL | 房间号 |
| `capacity` | INTEGER | DEFAULT 10 | 容纳人数 |
| `facilities` | TEXT | | 设施（JSON 数组） |
| `status` | TEXT | CHECK(available/maintenance/disabled) DEFAULT 'available' | 状态 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引：`idx_meeting_rooms_org(org_id)`

---

## calendar_events

日历事件/日程。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 事件 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `title` | TEXT | NOT NULL | 标题 |
| `description` | TEXT | | 描述 |
| `start_time` | DATETIME | NOT NULL | 开始时间 |
| `end_time` | DATETIME | NOT NULL | 结束时间 |
| `all_day` | BOOLEAN | DEFAULT 0 | 是否全天 |
| `color` | TEXT | DEFAULT '#3370FF' | 事件颜色 |
| `creator_id` | TEXT | FK → users | 创建者 ID |
| `room_id` | TEXT | FK → meeting_rooms, ON DELETE SET NULL | 关联会议室 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引：`idx_calendar_events_room(room_id)`

---

## calendar_attendees

日程参与人。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `event_id` | TEXT | PK, FK → calendar_events | 事件 ID |
| `user_id` | TEXT | PK, FK → users | 参与人 ID |
| `status` | TEXT | CHECK(accepted/declined/pending) DEFAULT 'pending' | 响应状态 |

---

## documents

云文档。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 文档 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `title` | TEXT | NOT NULL | 标题 |
| `content` | TEXT | | 文档内容 |
| `type` | TEXT | CHECK(doc/sheet) DEFAULT 'doc' | 文档类型 |
| `creator_id` | TEXT | FK → users | 创建者 |
| `r2_key` | TEXT | | R2 存储 Key |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

## bases

多维表格应用。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 应用 ID |
| `org_id` | TEXT | FK → organizations | 企业 ID |
| `name` | TEXT | NOT NULL | 应用名称 |
| `description` | TEXT | | 描述 |
| `icon` | TEXT | DEFAULT '📊' | 图标 |
| `creator_id` | TEXT | FK → users | 创建者 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

索引：`idx_bases_org(org_id)`

---

## base_tables

多维表格中的数据表。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 表 ID |
| `base_id` | TEXT | FK → bases | 所属应用 |
| `name` | TEXT | NOT NULL | 表名 |
| `position` | INTEGER | DEFAULT 0 | 排序权重 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引：`idx_base_tables_base(base_id)`

---

## base_fields

数据表中的字段（列）定义。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 字段 ID |
| `table_id` | TEXT | FK → base_tables | 所属表 |
| `name` | TEXT | NOT NULL | 字段名 |
| `type` | TEXT | CHECK(见下方) NOT NULL | 字段类型 |
| `options` | TEXT | | 类型配置（JSON） |
| `is_primary` | INTEGER | DEFAULT 0 | 是否为主字段 |
| `position` | INTEGER | DEFAULT 0 | 排序权重 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

字段类型枚举：`text`, `number`, `date`, `checkbox`, `select`, `multi_select`, `url`, `email`, `phone`, `rating`, `progress`, `member`, `created_at`, `updated_at`

索引：`idx_base_fields_table(table_id)`

---

## base_records

数据表中的记录（行），`data` 以 JSON 形式存储各字段值。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 记录 ID |
| `table_id` | TEXT | FK → base_tables | 所属表 |
| `data` | TEXT | DEFAULT '{}' | 行数据 JSON（`{ field_id: value }`） |
| `created_by` | TEXT | | 创建者 ID |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

索引：`idx_base_records_table(table_id)`

---

## base_views

数据表的不同展示视图。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 视图 ID |
| `table_id` | TEXT | FK → base_tables | 所属表 |
| `name` | TEXT | NOT NULL | 视图名称 |
| `type` | TEXT | CHECK(grid/kanban/form) DEFAULT 'grid' | 视图类型 |
| `config` | TEXT | DEFAULT '{}' | 视图配置 JSON（分组字段、排序、筛选等） |
| `position` | INTEGER | DEFAULT 0 | 排序权重 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引：`idx_base_views_table(table_id)`
