/**
 * ChatRoom Durable Object
 * 每个会话实例维护 WebSocket 连接池，实现实时消息广播
 * @author skylark
 */

import { DurableObject } from "cloudflare:workers";

interface ConnectedUser {
  userId: string;
  userName: string;
  websocket: WebSocket;
}

export class ChatRoom extends DurableObject<CloudflareEnv> {
  private connections: Map<string, ConnectedUser> = new Map();

  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);

    // 恢复已有的 WebSocket 连接（hibernation 恢复）
    this.ctx.getWebSockets().forEach((ws) => {
      const meta = ws.deserializeAttachment() as { userId: string; userName: string } | null;
      if (meta) {
        this.connections.set(meta.userId, {
          userId: meta.userId,
          userName: meta.userName,
          websocket: ws,
        });
      }
    });
  }

  /** 处理 HTTP 请求（WebSocket 升级） */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 升级请求
    if (request.headers.get("Upgrade") === "websocket") {
      const userId = url.searchParams.get("userId") || "anonymous";
      const userName = url.searchParams.get("userName") || "匿名用户";

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      // 附加用户元数据用于 hibernation 恢复
      server.serializeAttachment({ userId, userName });

      this.ctx.acceptWebSocket(server);

      this.connections.set(userId, {
        userId,
        userName,
        websocket: server,
      });

      // 广播上线通知
      this.broadcast(
        JSON.stringify({
          type: "online",
          payload: { userId, userName },
          timestamp: new Date().toISOString(),
        }),
        userId
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    // 获取在线用户列表
    if (url.pathname.endsWith("/online")) {
      const users = Array.from(this.connections.values()).map((c) => ({
        userId: c.userId,
        userName: c.userName,
      }));
      return new Response(JSON.stringify(users), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 外部广播接口（供 Bot API 等服务端推送使用）
    if (url.pathname.endsWith("/broadcast") && request.method === "POST") {
      try {
        const body = await request.text();
        this.broadcast(body);
        return new Response("OK", { status: 200 });
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }

  /** WebSocket 消息处理 */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;

    try {
      const data = JSON.parse(message);
      const meta = ws.deserializeAttachment() as { userId: string; userName: string } | null;
      if (!meta) return;

      switch (data.type) {
        case "message":
          // 广播新消息给所有连接的用户
          this.broadcast(
            JSON.stringify({
              type: "message",
              payload: {
                ...data.payload,
                senderId: meta.userId,
                senderName: meta.userName,
              },
              timestamp: new Date().toISOString(),
            })
          );
          break;

        case "typing":
          // 广播"正在输入"状态（不发给自己）
          this.broadcast(
            JSON.stringify({
              type: "typing",
              payload: { userId: meta.userId, userName: meta.userName },
              timestamp: new Date().toISOString(),
            }),
            meta.userId
          );
          break;

        case "read":
          // 广播已读状态
          this.broadcast(
            JSON.stringify({
              type: "read",
              payload: { userId: meta.userId, messageId: data.payload?.messageId },
              timestamp: new Date().toISOString(),
            }),
            meta.userId
          );
          break;
      }
    } catch {
      // 忽略无效消息
    }
  }

  /** WebSocket 关闭处理 */
  async webSocketClose(ws: WebSocket): Promise<void> {
    const meta = ws.deserializeAttachment() as { userId: string; userName: string } | null;
    if (meta) {
      this.connections.delete(meta.userId);
      this.broadcast(
        JSON.stringify({
          type: "offline",
          payload: { userId: meta.userId, userName: meta.userName },
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /** WebSocket 错误处理 */
  async webSocketError(ws: WebSocket): Promise<void> {
    const meta = ws.deserializeAttachment() as { userId: string; userName: string } | null;
    if (meta) {
      this.connections.delete(meta.userId);
    }
  }

  /** 向所有连接广播消息（可排除特定用户） */
  private broadcast(message: string, excludeUserId?: string): void {
    for (const [userId, conn] of this.connections) {
      if (excludeUserId && userId === excludeUserId) continue;
      try {
        conn.websocket.send(message);
      } catch {
        this.connections.delete(userId);
      }
    }
  }
}
