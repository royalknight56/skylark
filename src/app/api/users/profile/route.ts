/**
 * 用户名片 API — 公开接口，用于分享名片页
 * GET /api/users/profile?id=xxx
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import type { User, OrgMember } from "@/lib/types";

/** GET /api/users/profile?id=xxx */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("id");
    if (!userId) return NextResponse.json({ success: false, error: "缺少用户 ID" }, { status: 400 });

    const { env } = await getCloudflareContext();

    /* 获取用户基本信息 */
    const user = await env.DB
      .prepare("SELECT id, name, avatar_url, email, status, status_text, status_emoji, signature FROM users WHERE id = ?")
      .bind(userId)
      .first<Partial<User>>();

    if (!user) return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });

    /* 获取关联企业的成员信息 */
    let orgInfo: { org_name: string; title: string | null; department: string | null } | null = null;
    if (user.id) {
      const member = await env.DB
        .prepare(
          `SELECT om.title, om.department, o.name AS org_name
           FROM org_members om
           JOIN organizations o ON o.id = om.org_id
           WHERE om.user_id = ? AND om.member_status = 'active'
           LIMIT 1`
        )
        .bind(userId)
        .first<OrgMember & { org_name: string }>();

      if (member) {
        orgInfo = { org_name: member.org_name, title: member.title, department: member.department };
      }
    }

    return NextResponse.json({ success: true, data: { user, orgInfo } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
