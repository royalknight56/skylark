/**
 * 会话消息 API - 获取消息列表 / 发送消息
 * 发送消息时自动推送 webhook 事件到订阅了该会话的机器人
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getMessages, createMessage, getMessage, recallMessage, getBotsSubscribedToConversation, getConversationMemberIds, getConversation } from "@/lib/db/queries";
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
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const before = searchParams.get("before") || undefined;

    const messages = await getMessages(env.DB, id, limit, before, userId);
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

    const user = await getRequestUser(env.DB);
    const conv = await getConversation(env.DB, id, userId);

    // 实时通知推送：向所有会话成员的 NotificationHub 推送新消息事件
    const memberIds = await getConversationMemberIds(env.DB, id);
    const notifyPayload = JSON.stringify({
      type: "new_message",
      payload: {
        conversation_id: id,
        conversation_name: conv?.name || null,
        conversation_type: conv?.type || "direct",
        message_id: message.id,
        sender_id: userId,
        sender_name: user?.name || "未知用户",
        sender_avatar: user?.avatar_url || null,
        content: body.content,
        message_type: body.type || "text",
        created_at: message.created_at,
      },
      timestamp: new Date().toISOString(),
    });

    const notifyPromises = memberIds
      .filter((mid) => mid !== userId)
      .map(async (memberId) => {
        try {
          const hubId = env.NOTIFICATION_HUB.idFromName(memberId);
          const hub = env.NOTIFICATION_HUB.get(hubId);
          await hub.fetch(new Request("https://do/push", {
            method: "POST",
            body: notifyPayload,
          }));
        } catch {
          // 单个通知失败不影响其他
        }
      });

    // 异步推送 webhook 给订阅了该会话的机器人
    const subscribedBots = await getBotsSubscribedToConversation(env.DB, id);
    const botPromises = subscribedBots.map((bot) => {
      const webhookEvent: BotWebhookEvent = {
        event: "message",
        bot_id: bot.id,
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
      return pushWebhookEvent(bot, webhookEvent);
    });

    // 使用 waitUntil 不阻塞响应
    try {
      const { ctx } = await getCloudflareContext();
      ctx.waitUntil(Promise.allSettled([...notifyPromises, ...botPromises]));
    } catch {
      await Promise.allSettled([...notifyPromises, ...botPromises]);
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** 撤回消息的时间限制（24 小时） */
const RECALL_TIME_LIMIT_MS = 24 * 60 * 60 * 1000;

/**
 * DELETE /api/conversations/[id]/messages
 * body: { message_id }
 * 消息发送者可撤回自己的消息（24小时内）
 * 群主/群管理员可撤回群内任意消息
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id: conversationId } = await params;
    const body = (await request.json()) as { message_id: string };

    if (!body.message_id) {
      return NextResponse.json({ success: false, error: "缺少 message_id" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();

    const msg = await getMessage(env.DB, body.message_id);
    if (!msg) {
      return NextResponse.json({ success: false, error: "消息不存在" }, { status: 404 });
    }
    if (msg.conversation_id !== conversationId) {
      return NextResponse.json({ success: false, error: "消息不属于该会话" }, { status: 400 });
    }
    if (msg.recalled) {
      return NextResponse.json({ success: false, error: "消息已被撤回" }, { status: 400 });
    }

    const isSender = msg.sender_id === userId;

    // 非发送者需检查是否群主/管理员（通过 conversation.creator_id）
    if (!isSender) {
      const conv = await env.DB
        .prepare('SELECT created_by, type FROM conversations WHERE id = ?')
        .bind(conversationId)
        .first<{ created_by: string; type: string }>();

      if (!conv || conv.created_by !== userId) {
        return NextResponse.json({ success: false, error: "无权撤回此消息" }, { status: 403 });
      }
    }

    // 发送者撤回需检查时间限制
    if (isSender) {
      const elapsed = Date.now() - new Date(msg.created_at).getTime();
      if (elapsed > RECALL_TIME_LIMIT_MS) {
        return NextResponse.json({ success: false, error: "消息发送已超过 24 小时，无法撤回" }, { status: 400 });
      }
    }

    const success = await recallMessage(env.DB, body.message_id, userId);
    if (!success) {
      return NextResponse.json({ success: false, error: "撤回失败" }, { status: 500 });
    }

    // 通过 Durable Object 广播撤回事件
    const user = await getRequestUser(env.DB);
    try {
      const roomId = env.CHAT_ROOM.idFromName(conversationId);
      const roomStub = env.CHAT_ROOM.get(roomId);
      await roomStub.fetch(new Request("https://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "recall",
          payload: {
            messageId: body.message_id,
            recalledBy: userId,
            recallerName: user?.name || "管理员",
          },
          timestamp: new Date().toISOString(),
        }),
      }));
    } catch {
      // DO 广播失败不影响撤回结果
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
