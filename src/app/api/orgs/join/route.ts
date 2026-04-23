/**
 * 加入企业 API - 通过邀请码加入
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOrgByInviteCode, joinOrganization, isOrgMember } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** POST /api/orgs/join */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { invite_code: string };
    const code = (body.invite_code || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ success: false, error: "请输入邀请码" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const org = await getOrgByInviteCode(env.DB, code);
    if (!org) {
      return NextResponse.json({ success: false, error: "邀请码无效，请检查后重试" }, { status: 404 });
    }

    const already = await isOrgMember(env.DB, org.id, userId);
    if (already) {
      return NextResponse.json({ success: false, error: "你已经是该企业的成员" }, { status: 409 });
    }

    await joinOrganization(env.DB, org.id, userId);
    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
