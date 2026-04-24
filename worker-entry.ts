/**
 * Cloudflare Worker 入口
 * - WebSocket 请求（/api/ws/*）直接转发到 ChatRoom DO，绕过 Next.js
 * - 其余请求交给 OpenNext 处理
 * @author skylark
 */

// @ts-ignore — 由 opennextjs-cloudflare build 生成
import openNextHandler from "./.open-next/worker.js";

/** 从 cookie 字符串中解析指定 key */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const isWsUpgrade = request.headers.get("Upgrade") === "websocket";

    // 全局通知 WebSocket：/api/ws/notify
    if (url.pathname === "/api/ws/notify" && isWsUpgrade) {
      const userId = getCookie(request.headers.get("Cookie"), "skylark-uid");
      if (!userId) return new Response("Unauthorized", { status: 401 });

      const doId = env.NOTIFICATION_HUB.idFromName(userId);
      const stub = env.NOTIFICATION_HUB.get(doId);

      const doUrl = new URL(request.url);
      doUrl.pathname = "/websocket";
      doUrl.searchParams.set("userId", userId);

      return stub.fetch(doUrl.toString(), { headers: request.headers });
    }

    // 会话 WebSocket：/api/ws/{conversationId}
    if (url.pathname.startsWith("/api/ws/") && isWsUpgrade) {
      const conversationId = url.pathname.replace("/api/ws/", "");
      if (!conversationId) return new Response("Missing conversationId", { status: 400 });

      const userId = getCookie(request.headers.get("Cookie"), "skylark-uid");
      if (!userId) return new Response("Unauthorized", { status: 401 });

      let userName = "用户";
      try {
        const row = await env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(userId).first<{ name: string }>();
        if (row) userName = row.name;
      } catch { /* 查询失败不影响连接 */ }

      const doId = env.CHAT_ROOM.idFromName(conversationId);
      const stub = env.CHAT_ROOM.get(doId);

      const doUrl = new URL(request.url);
      doUrl.pathname = "/websocket";
      doUrl.searchParams.set("userId", userId);
      doUrl.searchParams.set("userName", userName);

      return stub.fetch(doUrl.toString(), { headers: request.headers });
    }

    // 其余请求交给 OpenNext / Next.js
    return openNextHandler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Durable Object 必须从入口模块导出
export { ChatRoom } from "./src/durable-objects/ChatRoom";
export { NotificationHub } from "./src/durable-objects/NotificationHub";
