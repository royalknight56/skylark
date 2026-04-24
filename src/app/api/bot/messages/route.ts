/**
 * Bot 开放 API - 发送消息
 * 通过 Authorization: Bearer <api_token> 鉴权
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBotByToken, createBotMessage, getBot } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";
import type { BotSendMessagePayload } from "@/lib/types";


/** 从 Authorization header 提取 bot token */
function extractBotToken(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

/**
 * POST /api/bot/messages — 机器人发送消息到指定会话
 *
 * Headers:
 *   Authorization: Bearer <bot_api_token>
 *
 * Body:
 *   { conversation_id, content, type? }
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractBotToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "缺少 Authorization header（Bearer <token>）" },
        { status: 401 }
      );
    }

    const { env } = await getCloudflareContext();
    const bot = await getBotByToken(env.DB, token);
    if (!bot) {
      return NextResponse.json(
        { success: false, error: "无效的 token 或机器人已禁用" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BotSendMessagePayload;
    if (!body.conversation_id || !body.content) {
      return NextResponse.json(
        { success: false, error: "conversation_id 和 content 为必填" },
        { status: 400 }
      );
    }

    // 验证会话归属同一企业
    const conv = await env.DB
      .prepare("SELECT id, org_id FROM conversations WHERE id = ?")
      .bind(body.conversation_id)
      .first<{ id: string; org_id: string }>();
    if (!conv || conv.org_id !== bot.org_id) {
      return NextResponse.json(
        { success: false, error: "会话不存在或不属于该机器人所在企业" },
        { status: 404 }
      );
    }

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message = await createBotMessage(env.DB, {
      id: msgId,
      conversation_id: body.conversation_id,
      bot_id: bot.id,
      bot_name: bot.name,
      content: body.content,
      type: body.type,
    });

    // 通过 Durable Object 广播消息到 WebSocket 连接
    try {
      const doId = env.CHAT_ROOM.idFromName(body.conversation_id);
      const stub = env.CHAT_ROOM.get(doId);
      await stub.fetch("https://do/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          payload: {
            id: message.id,
            senderId: bot.id,
            senderName: `🤖 ${bot.name}`,
            senderAvatar: bot.avatar_url,
            content: message.content,
            type: message.type,
          },
          timestamp: message.created_at,
        }),
      });
    } catch {
      // Durable Object 广播失败不影响消息写入
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/bot/messages?conversation_id=&limit=&before= — 机器人拉取会话消息
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractBotToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
    }

    const { env } = await getCloudflareContext();
    const bot = await getBotByToken(env.DB, token);
    if (!bot) {
      return NextResponse.json({ success: false, error: "无效 token" }, { status: 403 });
    }

    const conversationId = request.nextUrl.searchParams.get("conversation_id");
    if (!conversationId) {
      return NextResponse.json({ success: false, error: "缺少 conversation_id" }, { status: 400 });
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "50"), 100);
    const before = request.nextUrl.searchParams.get("before");

    let query = `
      SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
    `;
    const params: (string | number)[] = [conversationId];

    if (before) {
      query += " AND m.created_at < ?";
      params.push(before);
    }

    query += " ORDER BY m.created_at DESC LIMIT ?";
    params.push(limit);

    const result = await env.DB
      .prepare(query)
      .bind(...params)
      .all();

    return NextResponse.json({ success: true, data: result.results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
