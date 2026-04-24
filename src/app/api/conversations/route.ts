/**
 * 会话 API - 获取会话列表 / 创建新会话
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserConversations, createConversation } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/conversations?org_id=xxx */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const conversations = await getUserConversations(env.DB, userId, orgId);
    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/conversations */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      org_id: string; type?: 'direct' | 'group'; name?: string; member_ids?: string[];
      description?: string; is_public?: boolean;
    };

    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const id = `conv-${Date.now().toString(36)}`;
    const conversation = await createConversation(
      env.DB, id, body.org_id,
      body.type || "direct", body.name || null,
      userId, [userId, ...(body.member_ids || [])],
      { description: body.description, is_public: body.is_public }
    );

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
