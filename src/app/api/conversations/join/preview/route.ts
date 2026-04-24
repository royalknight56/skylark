/**
 * 预览邀请码对应的群组信息（加入前展示）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getConversationByInviteCode } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/conversations/join/preview?code=xxx */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const code = request.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.json({ success: false, error: "缺少 code" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const conv = await getConversationByInviteCode(env.DB, code);

    if (!conv) {
      return NextResponse.json({ success: false, error: "邀请链接无效" }, { status: 404 });
    }

    if (conv.invite_expire_at && new Date(conv.invite_expire_at) < new Date()) {
      return NextResponse.json({ success: false, error: "邀请链接已过期" }, { status: 400 });
    }

    // 返回基本信息（不暴露敏感数据）
    return NextResponse.json({
      success: true,
      data: {
        id: conv.id,
        name: conv.name,
        description: conv.description,
        avatar_url: conv.avatar_url,
        is_public: conv.is_public,
        type: conv.type,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
