/**
 * NotificationHub Durable Object
 * 每个用户一个实例，维护全局 WebSocket 连接，推送实时通知
 * 支持多端同时在线（同一用户可有多个 WebSocket 连接）
 * @author skylark
 */

import { DurableObject } from "cloudflare:workers";

interface ConnectionMeta {
  userId: string;
  connId: string;
}

export class NotificationHub extends DurableObject<CloudflareEnv> {
  private connections: Map<string, WebSocket> = new Map();

  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);

    // hibernation 恢复已有连接
    this.ctx.getWebSockets().forEach((ws) => {
      const meta = ws.deserializeAttachment() as ConnectionMeta | null;
      if (meta) {
        this.connections.set(meta.connId, ws);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 升级
    if (request.headers.get("Upgrade") === "websocket") {
      const userId = url.searchParams.get("userId") || "anonymous";
      const connId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      server.serializeAttachment({ userId, connId } satisfies ConnectionMeta);
      this.ctx.acceptWebSocket(server);
      this.connections.set(connId, server);

      return new Response(null, { status: 101, webSocket: client });
    }

    // 服务端推送通知：POST /push
    if (url.pathname.endsWith("/push") && request.method === "POST") {
      try {
        const body = await request.text();
        this.pushToAll(body);
        return new Response("OK", { status: 200 });
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }

  /** 客户端消息（心跳等） */
  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    try {
      const data = JSON.parse(message);
      if (data.type === "ping") {
        _ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
      }
    } catch {
      // 忽略无效消息
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const meta = ws.deserializeAttachment() as ConnectionMeta | null;
    if (meta) {
      this.connections.delete(meta.connId);
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const meta = ws.deserializeAttachment() as ConnectionMeta | null;
    if (meta) {
      this.connections.delete(meta.connId);
    }
  }

  /** 向该用户所有连接推送消息 */
  private pushToAll(message: string): void {
    for (const [connId, ws] of this.connections) {
      try {
        ws.send(message);
      } catch {
        this.connections.delete(connId);
      }
    }
  }
}
