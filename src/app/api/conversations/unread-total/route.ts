/**
 * 全局未读消息总数 API
 * 聚合当前用户所有会话的未读消息数
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

/** GET /api/conversations/unread-total */
export async function GET() {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();

    const row = await env.DB
      .prepare(
        `SELECT COUNT(*) as total FROM messages msg
         JOIN conversation_members cm ON msg.conversation_id = cm.conversation_id
         WHERE cm.user_id = ?
           AND msg.sender_id != ?
           AND msg.recalled = 0
           AND NOT EXISTS (
             SELECT 1 FROM message_reads mr
             WHERE mr.message_id = msg.id AND mr.user_id = ?
           )`
      )
      .bind(userId, userId, userId)
      .first<{ total: number }>();

    return NextResponse.json({ success: true, data: { total: row?.total || 0 } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
