# Skylark 架构与部署文档

> 本文档描述 Skylark 项目的技术架构、目录结构、Cloudflare 绑定配置、数据库设计及部署流程。

---

## 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [Cloudflare 绑定配置](#cloudflare-绑定配置)
- [Worker 入口](#worker-入口)
- [数据库设计](#数据库设计)
- [实时通信架构](#实时通信架构)
- [认证机制](#认证机制)
- [开发与部署](#开发与部署)

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 16.2.3 |
| UI 库 | React | 19.1.5 |
| 样式系统 | Tailwind CSS | 4.x |
| 图标 | Lucide React | 1.8.x |
| 运行时 | Cloudflare Workers | 通过 OpenNext 适配 |
| 适配层 | @opennextjs/cloudflare | 1.19.x |
| 数据库 | Cloudflare D1 (SQLite) | — |
| 对象存储 | Cloudflare R2 | — |
| 键值存储 | Cloudflare KV | — |
| 实时通信 | Cloudflare Durable Objects | WebSocket |
| CLI 工具 | Wrangler | 4.84.x |
| 语言 | TypeScript | 5.7.x |

---

## 项目结构

```
skylark/
├── docs/                          # 项目文档
│   ├── features.md                # 功能总览
│   ├── admin-guide.md             # 管理后台指南
│   ├── api-reference.md           # API 参考
│   ├── architecture.md            # 架构文档（本文件）
│   └── bot-api.md                 # Bot API 文档
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (workspace)/           # 登录后主界面（带侧栏）
│   │   │   ├── admin/             # 管理后台
│   │   │   │   ├── members/       # 成员管理
│   │   │   │   ├── departments/   # 部门管理
│   │   │   │   ├── bots/          # 机器人管理
│   │   │   │   ├── rooms/         # 会议室管理
│   │   │   │   ├── join-requests/ # 加入申请
│   │   │   │   ├── logs/          # 操作日志
│   │   │   │   └── settings/      # 企业设置
│   │   │   ├── messages/          # 即时消息
│   │   │   │   ├── layout.tsx     # 会话列表持久化布局
│   │   │   │   ├── page.tsx       # 消息首页（空态）
│   │   │   │   └── [id]/          # 会话详情
│   │   │   ├── contacts/          # 通讯录
│   │   │   ├── calendar/          # 日历
│   │   │   ├── docs/              # 云文档
│   │   │   ├── bases/             # 多维表格
│   │   │   │   ├── page.tsx       # 应用列表
│   │   │   │   └── [id]/          # 应用详情（表/视图）
│   │   │   ├── workspace/         # 工作台
│   │   │   ├── settings/          # 个人设置
│   │   │   └── layout.tsx         # 主布局（Auth + OrgProvider + Sidebar）
│   │   ├── api/                   # API 路由
│   │   │   ├── auth/              # 认证（me, register, logout）
│   │   │   ├── orgs/              # 企业（列表/创建/切换/加入）
│   │   │   ├── conversations/     # 会话（列表/创建/私聊/机器人会话）
│   │   │   ├── contacts/          # 通讯录
│   │   │   ├── calendar/          # 日历
│   │   │   ├── docs/              # 云文档
│   │   │   ├── bases/             # 多维表格
│   │   │   ├── rooms/             # 会议室（公开查询）
│   │   │   ├── bots/              # 机器人（公开查询）
│   │   │   ├── bot/               # Bot 开放 API（Bearer Token 鉴权）
│   │   │   ├── upload/            # 文件上传
│   │   │   ├── files/             # 文件下载
│   │   │   ├── invite/            # 邀请链接
│   │   │   ├── admin/             # 管理后台 API
│   │   │   ├── users/             # 用户查询
│   │   │   └── ws/                # WebSocket（fallback 路由）
│   │   ├── login/                 # 登录页
│   │   ├── org/                   # 企业选择/创建页
│   │   └── invite/                # 邀请接受页
│   ├── components/                # React 组件
│   │   ├── layout/
│   │   │   └── Sidebar.tsx        # 侧边导航栏
│   │   ├── ui/
│   │   │   └── Avatar.tsx         # 头像组件
│   │   ├── messages/              # 消息相关组件
│   │   │   ├── ChatView.tsx       # 聊天主面板
│   │   │   ├── ConversationList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── CreateGroupModal.tsx
│   │   ├── contacts/              # 通讯录组件
│   │   ├── calendar/              # 日历组件
│   │   ├── docs/                  # 文档组件
│   │   └── base/                  # 多维表格组件
│   │       ├── GridView.tsx       # 表格视图
│   │       ├── KanbanView.tsx     # 看板视图
│   │       ├── FormView.tsx       # 表单视图
│   │       ├── CellEditor.tsx     # 单元格编辑器
│   │       └── FieldTypeIcon.tsx  # 字段类型图标
│   ├── durable-objects/
│   │   └── ChatRoom.ts           # Durable Object：实时聊天室
│   └── lib/                      # 核心库
│       ├── auth.ts               # 服务端认证逻辑
│       ├── auth-context.tsx      # 客户端认证上下文
│       ├── org-context.tsx       # 企业上下文
│       ├── websocket.ts          # WebSocket 客户端封装
│       ├── r2.ts                 # R2 存储操作
│       ├── types.ts              # TypeScript 类型定义
│       └── db/
│           ├── queries.ts        # D1 数据库查询封装
│           └── schema.sql        # 数据库建表 DDL
├── worker-entry.ts               # Cloudflare Worker 自定义入口
├── wrangler.jsonc                # Wrangler 配置
├── package.json                  # 依赖管理
└── tsconfig.json                 # TypeScript 配置
```

---

## Cloudflare 绑定配置

`wrangler.jsonc` 中定义了以下 Cloudflare 资源绑定：

| 绑定名 | 类型 | 说明 |
|--------|------|------|
| `ASSETS` | Static Assets | OpenNext 构建产物（`.open-next/assets`） |
| `IMAGES` | Images | 图片优化服务 |
| `WORKER_SELF_REFERENCE` | Service Binding | 自引用，OpenNext 缓存需要 |
| `DB` | D1 Database | 主数据库 `skylarkd1`，存储所有关系数据 |
| `R2` | R2 Bucket | `skylark-files`，存储文件/图片/附件 |
| `KV` | KV Namespace | 在线状态、缓存等 |
| `CHAT_ROOM` | Durable Object | 实时聊天室，每个会话一个实例 |

---

## Worker 入口

`worker-entry.ts` 是 Cloudflare Worker 的入口文件，实现请求分流：

```
请求 ─→ /api/ws/* + WebSocket升级？
         │
         ├── 是 ──→ 从Cookie读取userId ──→ 查询用户名 ──→ 转发到 ChatRoom DO
         │
         └── 否 ──→ 交给 OpenNext (Next.js) 处理
```

关键设计：

1. **WebSocket 请求直接走 Durable Object**，绕过 Next.js 运行时（Next.js 不支持原生 WebSocket）
2. **Durable Object 类必须从入口模块导出**：`export { ChatRoom } from "./src/durable-objects/ChatRoom"`
3. 用户身份从 Cookie `skylark-uid` 中获取，查 D1 拿用户名后注入 WebSocket 连接

---

## 数据库设计

基于 Cloudflare D1 (SQLite)，共 18 张表：

### 企业管理

| 表名 | 说明 |
|------|------|
| `organizations` | 企业信息（名称、Logo、邀请码、Owner） |
| `org_members` | 企业成员关系（角色、部门、职位、工号、手机号、性别等） |
| `org_invites` | 邮箱邀请记录 |
| `departments` | 部门树（支持父子层级） |
| `join_requests` | 加入企业申请 |
| `admin_logs` | 管理员操作审计日志 |

### 用户

| 表名 | 说明 |
|------|------|
| `users` | 用户基本信息（邮箱、姓名、头像、在线状态） |

### 消息

| 表名 | 说明 |
|------|------|
| `conversations` | 会话（类型：direct/group，绑定企业） |
| `conversation_members` | 会话成员（角色、最后阅读时间） |
| `messages` | 消息（支持文本/图片/文件/系统消息、回复引用、文件附件信息） |

### 机器人

| 表名 | 说明 |
|------|------|
| `bots` | 企业自建机器人（Token、Webhook 配置） |
| `bot_subscriptions` | 机器人-会话订阅关系 |

### 通讯录

| 表名 | 说明 |
|------|------|
| `contacts` | 联系人关系（按企业隔离） |

### 日历与会议室

| 表名 | 说明 |
|------|------|
| `meeting_rooms` | 会议室（楼栋/楼层/房间号/容量/设施/状态） |
| `calendar_events` | 日历事件（可关联会议室） |
| `calendar_attendees` | 日程参与人 |

### 文档与多维表格

| 表名 | 说明 |
|------|------|
| `documents` | 云文档 |
| `bases` | 多维表格应用 |
| `base_tables` | 数据表 |
| `base_fields` | 字段定义（14 种类型） |
| `base_records` | 行数据（JSON 存储） |
| `base_views` | 视图配置（grid/kanban/form） |

### ER 关系概览

```
organizations ──1:N── org_members ──N:1── users
organizations ──1:N── departments
organizations ──1:N── conversations ──1:N── conversation_members
conversations ──1:N── messages
organizations ──1:N── bots ──1:N── bot_subscriptions ──N:1── conversations
organizations ──1:N── meeting_rooms ──1:N── calendar_events
organizations ──1:N── bases ──1:N── base_tables ──1:N── base_fields
                                                 ──1:N── base_records
                                                 ──1:N── base_views
```

---

## 实时通信架构

### 技术选型

- **Cloudflare Durable Objects** 作为 WebSocket 连接管理器
- 每个会话（conversationId）对应一个 ChatRoom DO 实例
- 支持 Hibernation API，长时间无消息时释放内存

### 数据流

```
用户A浏览器 ──WebSocket──→ Worker ──→ ChatRoom DO (按 conversationId)
                                        │
用户B浏览器 ──WebSocket──→ Worker ──→  ──┤ ←── broadcast()
                                        │
机器人服务  ──HTTP POST──→ Worker ──→  ──┘ (POST /broadcast)
```

### 消息广播流程

1. 用户在 `ChatView` 发送消息
2. **乐观更新**：立即在本地显示临时消息
3. `POST /api/conversations/{id}/messages` 持久化到 D1
4. 返回真实消息 ID，替换临时消息
5. 通过 WebSocket 发送到 ChatRoom DO
6. DO 广播给同一会话的所有连接用户
7. 同时触发已订阅机器人的 Webhook 推送

### 机器人消息流程

1. 用户消息触发 Webhook 推送到机器人服务
2. 机器人通过 `POST /api/bot/messages`（Bearer Token）回复
3. 消息写入 D1
4. 通过 DO 的 `/broadcast` 接口推送给用户
5. 用户 `ChatView` 的 WebSocket 接收并展示

---

## 认证机制

### 本地开发

- 登录/注册时通过 `POST /api/auth/register` 设置 `skylark-uid` Cookie
- 服务端通过 `getRequestUserId()` 从 Cookie 读取用户 ID
- Cookie 属性：`httpOnly`, `secure`, `sameSite=strict`, 30 天有效期

### 生产环境（预留）

- 支持 Cloudflare Access / Zero Trust 集成
- 从 `Cf-Access-Authenticated-User-Email` Header 获取用户邮箱
- 自动创建或匹配已有用户

### 权限控制

- `getOrgRole(db, orgId, userId)` — 获取用户在企业中的角色
- `requireOwner(db, orgId, userId)` — 要求 Owner 角色，否则返回 403
- 管理后台所有 API 通过 `requireOwner` 保护

---

## 开发与部署

### 环境准备

```bash
# 安装依赖
npm install

# 生成 Cloudflare 类型定义
npm run cf-typegen
```

### 本地开发

```bash
# 启动 Next.js 开发服务器
npm run dev
```

### 数据库操作

```bash
# 执行 SQL（远程数据库）
npx wrangler d1 execute skylarkd1 --remote --command "SQL语句"

# 从文件执行
npx wrangler d1 execute skylarkd1 --remote --file src/lib/db/schema.sql
```

### 构建与部署

```bash
# 完整部署（构建 + 部署到 Cloudflare）
npm run deploy

# 仅构建上传（不更新路由）
npm run upload

# 本地预览
npm run preview
```

### 部署流程

```
npm run deploy
    │
    ├── opennextjs-cloudflare build     # 将 Next.js 构建为 Worker 格式
    │   └── 生成 .open-next/ 目录
    │
    └── wrangler deploy                 # 部署到 Cloudflare Workers
        ├── 上传 Worker 代码（worker-entry.ts）
        ├── 上传静态资源（.open-next/assets）
        ├── 绑定 D1 / R2 / KV / DO
        └── 配置路由与域名
```

### TypeScript 类型检查

```bash
npx tsc --noEmit
```

---

## 环境变量与密钥

所有配置通过 Cloudflare 绑定管理，不使用 `.env` 文件：

| 配置项 | 来源 | 说明 |
|--------|------|------|
| D1 数据库 | `wrangler.jsonc` → `DB` | 自动注入 |
| R2 存储 | `wrangler.jsonc` → `R2` | 自动注入 |
| KV 缓存 | `wrangler.jsonc` → `KV` | 自动注入 |
| Durable Objects | `wrangler.jsonc` → `CHAT_ROOM` | 自动注入 |
| API Token | D1 `bots.api_token` | 机器人自行管理 |
