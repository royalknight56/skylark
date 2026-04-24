/**
 * WebSocket 路由 - 代理到 ChatRoom Durable Object
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId, getRequestUser } from "@/lib/auth";
import { NextRequest } from "next/server";


/** GET /api/ws/[conversationId] - WebSocket 升级 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  try {
    const { env } = await getCloudflareContext();

    const userId = await getRequestUserId();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const user = await getRequestUser(env.DB);

    if (!env.CHAT_ROOM) {
      return new Response("WebSocket not available", { status: 503 });
    }

    const chatRoomId = env.CHAT_ROOM.idFromName(conversationId);
    const chatRoom = env.CHAT_ROOM.get(chatRoomId);

    const url = new URL(request.url);
    url.pathname = "/websocket";
    url.searchParams.set("userId", userId);
    url.searchParams.set("userName", user?.name || "");

    return chatRoom.fetch(url.toString(), {
      headers: request.headers,
    });
  } catch (error) {
    return new Response(`WebSocket error: ${error}`, { status: 500 });
  }
}
