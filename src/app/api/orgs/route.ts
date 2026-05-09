/**
 * 企业 API - 获取用户的企业列表 / 创建新企业
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserOrganizations, createOrganization } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { getOrgCreationQuota } from "@/lib/referrals";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/orgs */
export async function GET() {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const [orgs, quota] = await Promise.all([
      getUserOrganizations(env.DB, userId),
      getOrgCreationQuota(env.DB, userId),
    ]);
    return NextResponse.json({ success: true, data: orgs, quota });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/orgs */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as { name: string; description?: string };
    const quota = await getOrgCreationQuota(env.DB, userId);
    if (!quota.can_create) {
      return NextResponse.json(
        {
          success: false,
          error: quota.org_limit >= 2
            ? "你已达到企业创建数量上限"
            : "个人最多可创建 1 个企业；邀请 5 人完成注册验证后可创建第 2 个企业",
          quota,
        },
        { status: 403 }
      );
    }

    const id = `org-${Date.now().toString(36)}`;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const org = await createOrganization(env.DB, {
      id, name: body.name, description: body.description,
      owner_id: userId, invite_code: inviteCode,
    });

    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
