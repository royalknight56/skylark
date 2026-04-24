/**
 * 管理后台 - 成员离职管理
 * 操作离职(含资源转移) / 已离职列表 / 恢复 / 永久删除
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  departMember, getDepartedMembers, restoreDepartedMember,
  permanentDeleteMember, createAdminLog,
} from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/departed?org_id= — 获取已离职成员列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const members = await getDepartedMembers(env.DB, orgId);
    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/departed — 操作成员离职 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      target_user_id: string;
      receiver_id: string | null;
      transfer_docs: boolean;
      transfer_events: boolean;
      transfer_conversations: boolean;
    };

    if (!body.org_id || !body.target_user_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    if (body.target_user_id === userId) {
      return NextResponse.json({ success: false, error: "不能操作自己离职" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const ownerRole = await requireOwner(env.DB, body.org_id, userId);
    if (!ownerRole) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const result = await departMember(
      env.DB, body.org_id, body.target_user_id,
      body.receiver_id,
      body.transfer_docs ?? false,
      body.transfer_events ?? false,
      body.transfer_conversations ?? false,
    );

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }

    const detail = result.transferred.length > 0
      ? `操作离职，资源转移：${result.transferred.join('、')}`
      : '操作离职，未转移资源';

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "depart_member",
      target_type: "member",
      target_id: body.target_user_id,
      detail,
    });

    return NextResponse.json({ success: true, transferred: result.transferred });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PATCH /api/admin/departed — 恢复离职成员 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; target_user_id: string };
    if (!body.org_id || !body.target_user_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const ownerRole = await requireOwner(env.DB, body.org_id, userId);
    if (!ownerRole) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const result = await restoreDepartedMember(env.DB, body.org_id, body.target_user_id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "restore_departed",
      target_type: "member",
      target_id: body.target_user_id,
      detail: "恢复离职成员",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/departed — 永久删除离职成员 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; target_user_id: string };
    if (!body.org_id || !body.target_user_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const ownerRole = await requireOwner(env.DB, body.org_id, userId);
    if (!ownerRole) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const result = await permanentDeleteMember(env.DB, body.org_id, body.target_user_id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "permanent_delete_member",
      target_type: "member",
      target_id: body.target_user_id,
      detail: "永久删除离职成员",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
