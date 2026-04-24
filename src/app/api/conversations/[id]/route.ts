/**
 * 会话详情 API - 获取单个会话信息
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getConversation } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/conversations/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const conversation = await getConversation(env.DB, id, userId);

    if (!conversation) {
      return NextResponse.json({ success: false, error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
