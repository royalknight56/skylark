/**
 * 加入群组 API
 * 支持通过邀请码加入 + 直接加入公开群
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getConversationByInviteCode,
  addConversationMember,
  isConversationMember,
} from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/conversations/join
 * body: { invite_code?: string; conversation_id?: string }
 * 通过邀请码或直接加入公开群
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      invite_code?: string;
      conversation_id?: string;
    };

    let conversationId: string | null = null;

    if (body.invite_code) {
      // 通过邀请码加入
      const conv = await getConversationByInviteCode(env.DB, body.invite_code);
      if (!conv) {
        return NextResponse.json({ success: false, error: "邀请链接无效" }, { status: 404 });
      }
      // 检查是否过期
      if (conv.invite_expire_at && new Date(conv.invite_expire_at) < new Date()) {
        return NextResponse.json({ success: false, error: "邀请链接已过期" }, { status: 400 });
      }
      conversationId = conv.id;
    } else if (body.conversation_id) {
      // 直接加入公开群
      const conv = await env.DB
        .prepare('SELECT id, is_public FROM conversations WHERE id = ?')
        .bind(body.conversation_id)
        .first<{ id: string; is_public: number }>();

      if (!conv) {
        return NextResponse.json({ success: false, error: "群组不存在" }, { status: 404 });
      }
      if (!conv.is_public) {
        return NextResponse.json({ success: false, error: "该群组不是公开群，无法直接加入" }, { status: 403 });
      }
      conversationId = conv.id;
    } else {
      return NextResponse.json({ success: false, error: "请提供 invite_code 或 conversation_id" }, { status: 400 });
    }

    // 检查是否已是成员
    const isMember = await isConversationMember(env.DB, conversationId, userId);
    if (isMember) {
      return NextResponse.json({ success: true, data: { conversation_id: conversationId, already_member: true } });
    }

    await addConversationMember(env.DB, conversationId, userId);

    return NextResponse.json({
      success: true,
      data: { conversation_id: conversationId, already_member: false },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
