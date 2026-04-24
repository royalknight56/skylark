/**
 * 消息表情回复 API — 切换（添加/删除）表情回复
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { toggleReaction, getMessageReactions } from "@/lib/db/queries";
import { getRequestUserId, getRequestUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/conversations/[id]/messages/[msgId]/reactions
 * body: { emoji: string }
 * toggle 行为：已有则删除，没有则添加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id: conversationId, msgId } = await params;
    const body = (await request.json()) as { emoji: string };

    if (!body.emoji) {
      return NextResponse.json({ success: false, error: "缺少 emoji" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const action = await toggleReaction(env.DB, msgId, userId, body.emoji);

    // 获取最新的表情列表返回给前端
    const reactions = await getMessageReactions(env.DB, msgId, userId);

    // 通过 Durable Object 广播 reaction 事件
    const user = await getRequestUser(env.DB);
    try {
      const roomId = env.CHAT_ROOM.idFromName(conversationId);
      const roomStub = env.CHAT_ROOM.get(roomId);
      await roomStub.fetch(new Request("https://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "reaction",
          payload: {
            messageId: msgId,
            emoji: body.emoji,
            userId,
            userName: user?.name || "用户",
            action,
            reactions,
          },
          timestamp: new Date().toISOString(),
        }),
      }));
    } catch {
      // DO 广播失败不影响结果
    }

    return NextResponse.json({ success: true, data: { action, reactions } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
