# Skylark Bot API 文档

> 企业自建机器人开放接口，支持通过 API 发送消息、拉取历史消息、订阅会话并接收 Webhook 事件回调。

## 鉴权方式

所有 Bot API 请求需在 Header 中携带机器人的 API Token：

```
Authorization: Bearer <api_token>
```

API Token 在管理后台创建机器人时自动生成，可在管理后台重新生成（旧 token 立即失效）。

---

## 接口列表

### 1. 发送消息

机器人向指定会话发送消息，消息会实时广播给该会话中的所有在线用户。

```
POST /api/bot/messages
```

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversation_id` | string | 是 | 目标会话 ID |
| `content` | string | 是 | 消息内容 |
| `type` | string | 否 | 消息类型，默认 `text`，可选 `text` / `image` / `file` |

**请求示例：**

```bash
curl -X POST https://your-domain/api/bot/messages \
  -H "Authorization: Bearer sk-bot-xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-abc123",
    "content": "你好，这是来自机器人的消息！",
    "type": "text"
  }'
```

**成功响应 (201)：**

```json
{
  "success": true,
  "data": {
    "id": "msg-xxxxx",
    "conversation_id": "conv-abc123",
    "sender_id": "bot-xxxxx",
    "content": "你好，这是来自机器人的消息！",
    "type": "text",
    "created_at": "2026-04-24T06:00:00.000Z"
  }
}
```

---

### 2. 拉取会话消息

获取指定会话的历史消息列表，支持分页。

```
GET /api/bot/messages?conversation_id=xxx&limit=50&before=2026-04-24T00:00:00Z
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversation_id` | string | 是 | 会话 ID |
| `limit` | number | 否 | 返回条数，默认 50，最大 100 |
| `before` | string | 否 | 分页游标，返回该时间之前的消息（ISO 8601 格式） |

**成功响应 (200)：**

```json
{
  "success": true,
  "data": [
    {
      "id": "msg-xxxxx",
      "conversation_id": "conv-abc123",
      "sender_id": "user-xxxxx",
      "content": "Hello",
      "type": "text",
      "sender_name": "张三",
      "sender_avatar": null,
      "created_at": "2026-04-24T05:00:00.000Z"
    }
  ]
}
```

---

### 3. 订阅会话

订阅指定会话的消息事件。订阅后，该会话的新消息将通过 Webhook 推送到机器人配置的 `webhook_url`。

```
POST /api/bot/subscribe
```

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversation_id` | string | 是 | 要订阅的会话 ID |

**请求示例：**

```bash
curl -X POST https://your-domain/api/bot/subscribe \
  -H "Authorization: Bearer sk-bot-xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "conversation_id": "conv-abc123" }'
```

**成功响应 (200)：**

```json
{ "success": true }
```

---

### 4. 查看订阅列表

获取当前机器人已订阅的所有会话。

```
GET /api/bot/subscribe
```

**成功响应 (200)：**

```json
{
  "success": true,
  "data": [
    {
      "bot_id": "bot-xxxxx",
      "conversation_id": "conv-abc123",
      "subscribed_at": "2026-04-24T06:00:00.000Z",
      "conversation": {
        "id": "conv-abc123",
        "type": "group",
        "name": "项目讨论群"
      }
    }
  ]
}
```

---

### 5. 取消订阅

取消对指定会话的订阅，不再接收该会话的 Webhook 回调。

```
DELETE /api/bot/subscribe?conversation_id=xxx
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversation_id` | string | 是 | 要取消订阅的会话 ID |

**成功响应 (200)：**

```json
{ "success": true }
```

---

## Webhook 事件回调

当订阅的会话中有用户发送新消息时，系统将向机器人配置的 `webhook_url` 发送 HTTP POST 请求。

### 请求格式

**Headers：**

| Header | 说明 |
|--------|------|
| `Content-Type` | `application/json` |
| `X-Bot-Secret` | 机器人的 Webhook Secret，用于验证请求来源 |

**请求体 (JSON)：**

```json
{
  "event": "message",
  "bot_id": "bot-xxxxx",
  "timestamp": "2026-04-24T06:30:00.000Z",
  "data": {
    "message_id": "msg-xxxxx",
    "conversation_id": "conv-abc123",
    "sender_id": "user-xxxxx",
    "sender_name": "张三",
    "content": "大家好",
    "type": "text",
    "created_at": "2026-04-24T06:30:00.000Z"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `event` | string | 事件类型，目前固定为 `message` |
| `bot_id` | string | 接收该事件的机器人 ID |
| `timestamp` | string | 事件触发时间（ISO 8601） |
| `data.message_id` | string | 消息 ID |
| `data.conversation_id` | string | 会话 ID |
| `data.sender_id` | string | 发送者用户 ID |
| `data.sender_name` | string | 发送者名称 |
| `data.content` | string | 消息内容 |
| `data.type` | string | 消息类型：`text` / `image` / `file` |
| `data.created_at` | string | 消息创建时间 |

### 验证签名

收到 Webhook 请求时，建议校验 `X-Bot-Secret` Header 的值与管理后台显示的 Webhook Secret 一致，确保请求来自 Skylark 平台。

### 回复消息

机器人收到 Webhook 回调后，可调用 **发送消息 API** (`POST /api/bot/messages`) 向同一会话回复消息，实现自动应答。

---

## 错误响应

所有接口在出错时返回统一格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

**常见错误码：**

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 请求参数缺失或格式错误 |
| 401 | 未提供 Authorization Header |
| 403 | Token 无效或机器人已禁用 |
| 404 | 会话不存在或不属于该机器人所在企业 |
| 500 | 服务端内部错误 |

---

## 快速上手示例

以下是一个完整的 Webhook 自动回复机器人示例（Node.js）：

```javascript
const express = require("express");
const app = express();
app.use(express.json());

const BOT_TOKEN = "sk-bot-xxxxxxxxxxxx";
const BOT_SECRET = "whsec-xxxxxxxxxxxx";
const SKYLARK_HOST = "https://your-domain";

// 接收 Webhook 回调
app.post("/webhook", async (req, res) => {
  // 验证来源
  if (req.headers["x-bot-secret"] !== BOT_SECRET) {
    return res.status(403).send("Invalid secret");
  }

  const { event, data } = req.body;
  if (event === "message") {
    // 自动回复
    await fetch(`${SKYLARK_HOST}/api/bot/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: data.conversation_id,
        content: `收到你的消息：「${data.content}」`,
      }),
    });
  }

  res.sendStatus(200);
});

app.listen(3001, () => console.log("Bot server running on :3001"));
```
