/**
 * 会话消息 API - 获取消息列表 / 发送消息
 * 发送消息时自动推送 webhook 事件到订阅了该会话的机器人
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getMessages, createMessage, getBotsSubscribedToConversation } from "@/lib/db/queries";
import { getRequestUserId, getRequestUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { BotWebhookEvent } from "@/lib/types";


/** 向机器人推送 webhook 事件（fire-and-forget，不阻塞响应） */
async function pushWebhookEvent(bot: { id: string; webhook_url: string | null; webhook_secret: string | null }, event: BotWebhookEvent) {
  if (!bot.webhook_url) return;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bot.webhook_secret) {
      headers["X-Bot-Secret"] = bot.webhook_secret;
    }
    await fetch(bot.webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
  } catch {
    // webhook 推送失败不影响主流程
  }
}

/** GET /api/conversations/[id]/messages */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before") || undefined;

    const messages = await getMessages(env.DB, id, limit, before);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/conversations/[id]/messages */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      content: string; type?: string; reply_to?: string;
      file_name?: string; file_size?: number; file_mime?: string; file_r2_key?: string;
    };

    const msgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const message = await createMessage(env.DB, {
      id: msgId,
      conversation_id: id,
      sender_id: userId,
      content: body.content,
      type: body.type || "text",
      reply_to: body.reply_to,
      file_name: body.file_name,
      file_size: body.file_size,
      file_mime: body.file_mime,
      file_r2_key: body.file_r2_key,
    });

    // 异步推送 webhook 给订阅了该会话的机器人
    const user = await getRequestUser(env.DB);
    const subscribedBots = await getBotsSubscribedToConversation(env.DB, id);
    if (subscribedBots.length > 0) {
      const webhookEvent: BotWebhookEvent = {
        event: "message",
        bot_id: "",
        timestamp: new Date().toISOString(),
        data: {
          message_id: message.id,
          conversation_id: id,
          sender_id: userId,
          sender_name: user?.name || "未知用户",
          content: body.content,
          type: body.type || "text",
          created_at: message.created_at,
        },
      };
      // 并行推送给所有机器人
      const pushPromises = subscribedBots.map((bot) =>
        pushWebhookEvent(bot, { ...webhookEvent, bot_id: bot.id })
      );
      // 使用 waitUntil 不阻塞响应（Cloudflare Workers 环境下可用）
      try {
        const { ctx } = await getCloudflareContext();
        ctx.waitUntil(Promise.allSettled(pushPromises));
      } catch {
        await Promise.allSettled(pushPromises);
      }
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
