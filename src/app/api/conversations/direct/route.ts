/**
 * 私聊会话 API - 查找或创建与指定用户的私聊
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { findDirectConversation, createConversation } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** POST /api/conversations/direct — 获取或创建私聊会话 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; target_user_id: string };
    if (!body.org_id || !body.target_user_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();

    // 先查找已有私聊
    const existingId = await findDirectConversation(env.DB, body.org_id, userId, body.target_user_id);
    if (existingId) {
      return NextResponse.json({ success: true, data: { id: existingId } });
    }

    // 不存在则创建
    const id = `conv-${Date.now().toString(36)}`;
    const conversation = await createConversation(
      env.DB, id, body.org_id,
      "direct", null,
      userId, [userId, body.target_user_id]
    );

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
