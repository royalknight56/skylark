/**
 * 邀请链接公开 API
 * GET: 查看邀请详情（无需登录即可预览企业信息）
 * POST: 接受邀请（需登录）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getInviteById, acceptInvite, isOrgMember } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/invite/[id] — 查看邀请详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const invite = await getInviteById(env.DB, id);

    if (!invite) {
      return NextResponse.json({ success: false, error: "邀请不存在" }, { status: 404 });
    }

    // 检查是否过期
    if (invite.status === 'expired' || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
      return NextResponse.json({ success: false, error: "邀请已过期", data: { status: "expired", org: invite.org } }, { status: 410 });
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({ success: false, error: "邀请已被接受", data: { status: "accepted", org: invite.org } }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invite.id,
        org: invite.org,
        invitee_email: invite.invitee_email,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/invite/[id] — 接受邀请 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const invite = await getInviteById(env.DB, id);

    if (!invite) {
      return NextResponse.json({ success: false, error: "邀请不存在" }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ success: false, error: "邀请已失效" }, { status: 410 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "邀请已过期" }, { status: 410 });
    }

    // 检查是否已是成员
    const already = await isOrgMember(env.DB, invite.org_id, userId);
    if (already) {
      return NextResponse.json({ success: true, data: { already_member: true, org: invite.org } });
    }

    await acceptInvite(env.DB, id, userId);

    return NextResponse.json({
      success: true,
      data: { org: invite.org, joined: true },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
