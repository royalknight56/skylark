/**
 * 会话详情 API
 * GET: 获取会话信息
 * PUT: 更新群设置（名称、描述、头像、公开/私有）
 * PATCH: 群成员管理（添加/批量添加/移除成员 + 生成邀请链接）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getConversation,
  getConversationMembers,
  updateConversation,
  generateInviteCode,
  addConversationMember,
  batchAddConversationMembers,
  removeConversationMember,
  getConversationMemberRole,
} from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/conversations/[id] */
export async function GET(
  request: NextRequest,
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

    // 获取成员列表
    const members = await getConversationMembers(env.DB, id);

    return NextResponse.json({
      success: true,
      data: { ...conversation, member_count: members.length, members },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/conversations/[id] — 更新群设置 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();

    // 仅群主/管理员可修改
    const role = await getConversationMemberRole(env.DB, id, userId);
    if (!role || role === "member") {
      return NextResponse.json({ success: false, error: "无权修改" }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      avatar_url?: string;
      is_public?: boolean;
    };

    await updateConversation(env.DB, id, body);
    const updated = await getConversation(env.DB, id, userId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations/[id] — 群成员管理 + 邀请链接
 * body.action: 'add_member' | 'batch_add' | 'remove_member' | 'generate_invite'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();

    const body = (await request.json()) as {
      action: string;
      user_id?: string;
      user_ids?: string[];
      expire_days?: number;
    };

    switch (body.action) {
      case "add_member": {
        if (!body.user_id) return NextResponse.json({ success: false, error: "缺少 user_id" }, { status: 400 });
        await addConversationMember(env.DB, id, body.user_id);
        return NextResponse.json({ success: true });
      }

      case "batch_add": {
        if (!body.user_ids || body.user_ids.length === 0) {
          return NextResponse.json({ success: false, error: "缺少 user_ids" }, { status: 400 });
        }
        const count = await batchAddConversationMembers(env.DB, id, body.user_ids);
        return NextResponse.json({ success: true, data: { added: count } });
      }

      case "remove_member": {
        if (!body.user_id) return NextResponse.json({ success: false, error: "缺少 user_id" }, { status: 400 });

        // 仅群主/管理员或用户自己可移除
        const role = await getConversationMemberRole(env.DB, id, userId);
        const isSelf = body.user_id === userId;
        if (!isSelf && (!role || role === "member")) {
          return NextResponse.json({ success: false, error: "无权操作" }, { status: 403 });
        }

        await removeConversationMember(env.DB, id, body.user_id);
        return NextResponse.json({ success: true });
      }

      case "generate_invite": {
        const role = await getConversationMemberRole(env.DB, id, userId);
        if (!role) return NextResponse.json({ success: false, error: "非群成员" }, { status: 403 });

        const code = await generateInviteCode(env.DB, id, body.expire_days || 7);
        const link = `/join/${code}`;
        return NextResponse.json({ success: true, data: { invite_code: code, link } });
      }

      default:
        return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
