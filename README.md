# 开源云雀 Skylark

> 一个面向 AI 时代的开源企业协作套件，基于 Cloudflare 全栈生态构建。

云雀是一款正在开发中的企业通讯与办公协作软件，目标是提供一个可自托管、可二次开发、可被 AI 深度改造的开源工作台。它不是一个只开放 API 的 SaaS 平台，而是一套可以被企业直接拿走、部署、修改、重组的代码。

在传统企业软件里，组织往往只能在厂商预设的能力范围内工作：想接入业务系统，需要阅读开放平台文档；想改一个工作流，需要等待插件市场；想拥有真正适合自己的工具，需要在封闭平台之外再搭一套系统。

云雀想做的是反过来：把企业协作软件本身开源出来，让每个组织都能拥有自己的“飞书/Lark 底座”，并在此之上用 AI 快速生长出自己的业务系统。

## 理念

AI 正在改变软件开发的基本单位。

过去，软件能力主要由平台提供，企业通过配置、插件、开放 API 和人工开发去适配平台。这个模式在很长时间里是合理的，因为修改软件本身的成本太高。

但当 AI 可以阅读代码、理解业务意图、生成实现、补齐测试、迭代界面之后，企业软件不一定还要被设计成一个封闭平台。更自然的方式是：企业拥有完整代码，AI 直接修改代码，业务能力直接进入产品。

云雀基于这个判断设计：

- 企业不再只是 SaaS 的租户，而是自己协作系统的拥有者。
- 自定义应用不必先变成“开放平台插件”，可以直接成为代码库的一部分。
- 业务流程不必绕远路接 API，可以在同一个工程里实现、审查、部署。
- AI 不只是辅助写脚本，而是参与软件长期演进的开发者。

这也是“开源云雀”这个项目的核心：不是再造一个封闭办公平台，而是提供一个开放的企业工作台，让组织可以把自己的协作、沟通、知识、数据和业务流程放在同一套可控代码里。

## 当前能力

云雀目前处于开发早期，已经包含以下模块的基础实现：

- 即时消息：单聊、群聊、实时 WebSocket 消息、已读、在线状态、文件与图片消息。
- 通讯录：组织成员、联系人搜索、联系人卡片、从通讯录发起会话。
- 日历与会议室：日程创建、参与人、会议室预订、冲突检测、会议室管理。
- 云文档：企业文档列表、富文本编辑、实时保存。
- 多维表格：类似 Feishu Base / Airtable 的结构化数据应用。
- 企业自建机器人：Bot API、Webhook 回调、机器人会话。
- 管理后台：成员、部门、角色、权限、邀请、日志、企业设置。
- 企业邮箱：基于 Cloudflare Email Routing / Send Email 的收发信能力。

完整说明见：

- [功能总览](docs/features.md)
- [架构文档](docs/architecture.md)
- [Bot API](docs/bot-api.md)
- [企业邮箱系统](docs/mail-system.md)

## 技术栈

云雀尽量把运行复杂度压到 Cloudflare 生态内：

- Next.js + React + TypeScript
- Tailwind CSS
- OpenNext for Cloudflare
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Cloudflare KV
- Cloudflare Durable Objects
- Cloudflare Email Routing / Send Email

这种选择的目标不是追求新奇，而是让一个企业可以用相对少的运维成本拥有一套完整协作系统：前端、API、数据库、对象存储、实时通信、邮件入口都可以部署在同一个边缘平台上。

## 快速开始

安装依赖：

```bash
pnpm install
```

本地开发：

```bash
pnpm dev
```

生成 Cloudflare 类型：

```bash
pnpm cf-typegen
```

构建：

```bash
pnpm build
```

部署到 Cloudflare：

```bash
pnpm deploy
```

部署前需要根据自己的 Cloudflare 账号创建并配置 D1、R2、KV、Durable Objects、Email Routing 等绑定。当前仓库中的 `wrangler.jsonc` 仅代表本项目的开发配置，公开部署时建议替换为自己的资源。

## 项目结构

```text
src/
  app/                  Next.js App Router 页面与 API
  components/           前端组件
  durable-objects/      Cloudflare Durable Objects
  lib/                  认证、数据库、R2、WebSocket 等核心逻辑
docs/                   功能、架构、API 与管理文档
migrations/             D1 数据库迁移
worker-entry.ts         Cloudflare Worker 入口
wrangler.jsonc          Cloudflare 绑定配置
```

## 贡献方式

云雀会长期探索一种更 AI-native 的开源协作方式。

我们欢迎 issue、想法、场景描述、架构建议和安全反馈。与传统项目不同的是，云雀更鼓励把贡献表达成“清晰的问题”和“可验证的目标”，再由 AI 或维护者把它们转化为代码变更。

也就是说，贡献不一定是 pull request。一个好问题、一个真实业务场景、一段可复现的操作路径，都可以成为项目演进的输入。

未来我们也会继续实验更自动化的贡献流程：由 AI 读取需求、生成补丁、运行检查、提交候选实现，再由维护者审查合并。

## 开源状态

项目仍在早期阶段，接口、数据结构和 UI 都可能快速变化。现在更适合：

- 研究 Cloudflare 全栈应用如何组织。
- 作为企业协作软件的二次开发起点。
- 探索 AI 参与长期软件演进的工作流。
- 根据自己的组织需求定制一套私有协作系统。

如果你需要一个稳定可直接商用的成品，请谨慎评估当前状态。如果你想参与一个关于“AI 时代企业软件应该是什么样”的实验，欢迎一起把云雀往前推。
