/**
 * 会话已读 API — 标记会话消息为已读
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { markConversationRead } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/conversations/[id]/read
 * 进入会话时调用，将所有未读消息标记为已读
 * 返回 { read_count: number } 本次标记已读的数量
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id: conversationId } = await params;
    const { env } = await getCloudflareContext();

    const readCount = await markConversationRead(env.DB, conversationId, userId);

    // 通过 Durable Object 广播已读事件给对方
    if (readCount > 0) {
      try {
        const roomId = env.CHAT_ROOM.idFromName(conversationId);
        const roomStub = env.CHAT_ROOM.get(roomId);
        await roomStub.fetch(new Request("https://do/broadcast", {
          method: "POST",
          body: JSON.stringify({
            type: "read",
            payload: { userId, conversationId },
            timestamp: new Date().toISOString(),
          }),
        }));
      } catch {
        // DO 广播失败不影响结果
      }
    }

    return NextResponse.json({ success: true, data: { read_count: readCount } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
