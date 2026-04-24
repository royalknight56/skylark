/**
 * 管理后台 - 邀请成员 API
 * 管理员通过邮箱邀请成员加入企业
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getOrgInvites, createInvite, createBatchInvites,
  cancelInvite, expireInvites, getPendingInviteByEmail,
  isOrgMember, createAdminLog,
} from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/invites?org_id=&status= — 获取邀请列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 先清理过期邀请
    await expireInvites(env.DB, orgId);

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const invites = await getOrgInvites(env.DB, orgId, status);
    return NextResponse.json({ success: true, data: invites });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/invites — 发送邀请（支持单个或批量邮箱） */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      emails: string[];
      expires_days?: number;
    };

    if (!body.org_id || !body.emails || body.emails.length === 0) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 邮箱去重 + 格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [...new Set(body.emails.map((e) => e.trim().toLowerCase()))].filter((e) => emailRegex.test(e));

    if (validEmails.length === 0) {
      return NextResponse.json({ success: false, error: "没有有效的邮箱地址" }, { status: 400 });
    }

    // 过期时间默认 7 天
    const expiresDays = body.expires_days || 7;
    const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

    // 检查哪些邮箱已有待处理邀请或已是成员
    const skipped: { email: string; reason: string }[] = [];
    const toInvite: string[] = [];

    for (const email of validEmails) {
      const pending = await getPendingInviteByEmail(env.DB, body.org_id, email);
      if (pending) {
        skipped.push({ email, reason: "已有待处理的邀请" });
        continue;
      }
      toInvite.push(email);
    }

    let invites: unknown[] = [];
    if (toInvite.length === 1) {
      const id = `inv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const invite = await createInvite(env.DB, {
        id, org_id: body.org_id, inviter_id: userId,
        invitee_email: toInvite[0], expires_at: expiresAt,
      });
      invites = [invite];
    } else if (toInvite.length > 1) {
      invites = await createBatchInvites(env.DB, body.org_id, userId, toInvite, expiresAt);
    }

    if (invites.length > 0) {
      await createAdminLog(env.DB, {
        id: `log-${Date.now().toString(36)}`, org_id: body.org_id,
        operator_id: userId, action: "invite_members",
        target_type: "invite", target_id: body.org_id,
        detail: `邀请 ${toInvite.length} 人: ${toInvite.join(", ")}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: { invited: invites, skipped },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/invites — 撤销邀请 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; invite_id: string };
    if (!body.org_id || !body.invite_id) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    await cancelInvite(env.DB, body.invite_id);

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`, org_id: body.org_id,
      operator_id: userId, action: "cancel_invite",
      target_type: "invite", target_id: body.invite_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
