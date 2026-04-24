# Skylark API 参考

> 所有 API 均以 JSON 格式交互，路径前缀为站点域名。
>
> 用户身份通过 Cookie `skylark-uid` 识别（本地开发）或 `Cf-Access-Authenticated-User-Email` Header（生产环境）。
>
> 管理后台 API（`/api/admin/*`）要求当前用户为企业 Owner。

---

## 目录

- [认证](#认证)
- [企业](#企业)
- [邀请](#邀请)
- [会话](#会话)
- [消息](#消息)
- [通讯录](#通讯录)
- [日历](#日历)
- [会议室](#会议室)
- [云文档](#云文档)
- [多维表格](#多维表格)
- [文件存储](#文件存储)
- [机器人 (Bot API)](#机器人-bot-api)
- [管理后台](#管理后台)

---

## 通用响应格式

**成功：**

```json
{ "success": true, "data": { ... } }
```

**失败：**

```json
{ "success": false, "error": "错误描述" }
```

---

## 认证

### 获取当前用户

```
GET /api/auth/me
```

返回当前登录用户信息（id, name, email, avatar_url, current_org_id）。未登录返回 401。

### 注册/登录

```
POST /api/auth/register
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 用户名 |
| `email` | string | 是 | 邮箱 |

若邮箱已注册则自动登录，否则创建新用户。成功后设置 `skylark-uid` Cookie。

### 登出

```
POST /api/auth/logout
```

清除 `skylark-uid` Cookie。

---

## 企业

### 获取企业列表

```
GET /api/orgs
```

返回当前用户加入的所有企业。

### 创建企业

```
POST /api/orgs
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 企业名称 |

创建者自动成为 Owner。

### 切换企业

```
POST /api/orgs/switch
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 目标企业 ID |

### 通过邀请码加入企业

```
POST /api/orgs/join
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `invite_code` | string | 是 | 企业邀请码 |

### 获取企业成员

```
GET /api/orgs/{id}/members
```

返回指定企业的所有成员列表。

---

## 邀请

### 获取邀请详情（公开）

```
GET /api/invite/{id}
```

返回邀请信息：邀请人、企业名称、邀请邮箱、状态、过期时间。不需要登录。

### 接受邀请

```
POST /api/invite/{id}
```

需要登录。自动将当前用户加入目标企业。校验邀请状态和有效期。

---

## 会话

### 获取会话列表

```
GET /api/conversations?org_id={orgId}
```

返回当前用户在指定企业内的所有会话，按最后消息时间倒序。包含 `last_message`、`last_message_at` 字段。

### 创建群聊

```
POST /api/conversations
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `name` | string | 是 | 群名称 |
| `member_ids` | string[] | 是 | 成员 ID 列表 |

### 创建/获取私聊

```
POST /api/conversations/direct
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `target_user_id` | string | 是 | 对方用户 ID |

自动查找已有私聊会话，不存在则创建。

### 创建/获取机器人会话

```
POST /api/conversations/bot
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `bot_id` | string | 是 | 机器人 ID |

自动查找已有机器人会话，不存在则创建（自动订阅机器人到会话）。

### 获取会话详情

```
GET /api/conversations/{id}
```

返回会话基本信息和成员列表。

---

## 消息

### 获取会话消息

```
GET /api/conversations/{id}/messages?limit=50&before={timestamp}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | number | 否 | 返回条数，默认 50 |
| `before` | string | 否 | 分页游标（ISO 8601 时间） |

### 发送消息

```
POST /api/conversations/{id}/messages
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | string | 是 | 消息内容 |
| `type` | string | 否 | 消息类型：`text`(默认) / `image` / `file` |

发送后自动触发已订阅机器人的 Webhook 推送。

### WebSocket 实时连接

```
WS /api/ws/{conversationId}
```

升级为 WebSocket 连接后，实时接收同一会话中其他用户/机器人的消息。

**消息类型：**

| type | 说明 |
|------|------|
| `message` | 新消息 |
| `typing` | 正在输入 |
| `read` | 已读回执 |
| `online` | 用户上线 |
| `offline` | 用户离线 |

---

## 通讯录

### 获取联系人列表

```
GET /api/contacts?org_id={orgId}
```

### 添加联系人

```
POST /api/contacts
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `contact_id` | string | 是 | 联系人用户 ID |

### 删除联系人

```
DELETE /api/contacts?org_id={orgId}&contact_id={contactId}
```

### 搜索联系人

```
GET /api/contacts/search?org_id={orgId}&q={keyword}
```

按姓名/邮箱模糊搜索。

---

## 日历

### 获取日程列表

```
GET /api/calendar?org_id={orgId}&start={date}&end={date}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `start` | string | 否 | 起始日期 |
| `end` | string | 否 | 结束日期 |

返回日程列表，包含关联的会议室信息。

### 创建日程

```
POST /api/calendar
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `title` | string | 是 | 日程标题 |
| `description` | string | 否 | 描述 |
| `start_time` | string | 是 | 开始时间（ISO 8601） |
| `end_time` | string | 是 | 结束时间 |
| `attendee_ids` | string[] | 否 | 参与人 ID 列表 |
| `room_id` | string | 否 | 会议室 ID（自动进行冲突检测） |

若指定 `room_id` 且存在时间冲突，返回 `409 Conflict`。

---

## 会议室

### 获取可用会议室

```
GET /api/rooms?org_id={orgId}&start={time}&end={time}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `start` | string | 否 | 查询时段起始 |
| `end` | string | 否 | 查询时段结束 |

返回所有可用状态的会议室列表及指定时段内的预订情况。

---

## 云文档

### 获取文档列表

```
GET /api/docs?org_id={orgId}
```

### 创建文档

```
POST /api/docs
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `org_id` | string | 是 | 企业 ID |
| `title` | string | 是 | 文档标题 |

### 获取文档详情

```
GET /api/docs/{id}
```

### 更新文档

```
PUT /api/docs/{id}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 新标题 |
| `content` | string | 否 | 文档内容 |

---

## 多维表格

### 应用

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bases?org_id={orgId}` | 获取应用列表 |
| POST | `/api/bases` | 创建应用（name, icon, color, org_id） |
| GET | `/api/bases/{id}` | 获取应用详情（含表/字段/视图） |
| PUT | `/api/bases/{id}` | 编辑应用 |
| DELETE | `/api/bases/{id}` | 删除应用 |

### 数据表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bases/{id}/tables` | 创建数据表（name） |
| PUT | `/api/bases/{id}/tables` | 重命名数据表（table_id, name） |

### 字段

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bases/{id}/fields` | 添加字段（table_id, name, type, options） |
| PUT | `/api/bases/{id}/fields` | 编辑字段 |
| DELETE | `/api/bases/{id}/fields?field_id=xxx` | 删除字段 |

**字段类型：** `text`, `number`, `select`, `multi_select`, `date`, `checkbox`, `url`, `email`, `phone`, `rating`, `currency`, `percent`, `attachment`, `user`

### 记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bases/{id}/records?table_id=xxx` | 获取记录列表 |
| POST | `/api/bases/{id}/records` | 创建记录（table_id, data） |
| PUT | `/api/bases/{id}/records` | 更新记录（record_id, data） |
| DELETE | `/api/bases/{id}/records?record_id=xxx` | 删除记录 |

### 视图

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bases/{id}/views` | 创建视图（table_id, name, type, config） |
| PUT | `/api/bases/{id}/views` | 更新视图 |
| DELETE | `/api/bases/{id}/views?view_id=xxx` | 删除视图 |

**视图类型：** `grid`（表格）, `kanban`（看板）, `form`（表单）

---

## 文件存储

### 上传文件

```
POST /api/upload
```

**请求格式：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | 上传的文件 |
| `conversation_id` | string | 否 | 关联的会话 ID |

返回 `{ url: "/api/files/{key}" }`。

### 下载文件

```
GET /api/files/{...key}
```

直接返回文件内容（从 R2 读取），支持各种 MIME 类型。

---

## 机器人 (Bot API)

使用 Bearer Token 鉴权，详见 [Bot API 文档](./bot-api.md)。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bot/messages` | 机器人发送消息 |
| GET | `/api/bot/messages` | 机器人拉取消息历史 |
| POST | `/api/bot/subscribe` | 订阅会话 |
| GET | `/api/bot/subscribe` | 查看订阅列表 |
| DELETE | `/api/bot/subscribe` | 取消订阅 |
| GET | `/api/bots?org_id={orgId}` | 获取企业活跃机器人（脱敏） |

---

## 管理后台

> 所有 `/api/admin/*` 路由要求当前用户为企业 Owner。

### 成员管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/members?org_id={orgId}` | 获取成员列表 |
| PUT | `/api/admin/members` | 编辑成员信息（name, department, title, employee_id, phone, work_city, gender, role） |
| DELETE | `/api/admin/members` | 移除成员 |

### 部门管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/departments?org_id={orgId}` | 获取部门列表 |
| POST | `/api/admin/departments` | 创建部门（name, parent_id） |
| PUT | `/api/admin/departments` | 编辑部门 |
| DELETE | `/api/admin/departments?id=xxx` | 删除部门 |

### 机器人管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/bots?org_id={orgId}` | 获取机器人列表（含敏感字段） |
| POST | `/api/admin/bots` | 创建机器人 |
| PUT | `/api/admin/bots` | 编辑机器人 / 重新生成 Token |
| DELETE | `/api/admin/bots?id=xxx` | 删除机器人 |

### 会议室管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/rooms?org_id={orgId}` | 获取会议室列表 |
| POST | `/api/admin/rooms` | 创建会议室 |
| PUT | `/api/admin/rooms` | 编辑会议室 |
| DELETE | `/api/admin/rooms?id=xxx` | 删除会议室 |

### 邀请管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/invites?org_id={orgId}` | 获取邀请列表 |
| POST | `/api/admin/invites` | 创建邀请（emails, org_id, expires_days） |
| DELETE | `/api/admin/invites?id=xxx` | 取消邀请 |

### 加入申请

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/join-requests?org_id={orgId}` | 获取申请列表 |
| PUT | `/api/admin/join-requests` | 审批申请（approve/reject） |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats?org_id={orgId}` | 企业统计数据 |
| GET | `/api/admin/logs?org_id={orgId}` | 操作日志列表 |
| GET | `/api/admin/settings?org_id={orgId}` | 获取企业设置 |
| PUT | `/api/admin/settings` | 更新企业设置 |
