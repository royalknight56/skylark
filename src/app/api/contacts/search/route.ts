/**
 * 通讯录搜索 API - 搜索企业内部成员（排除已有联系人）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { searchOrgMembers } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/contacts/search?org_id=&q= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const keyword = (request.nextUrl.searchParams.get("q") || "").trim();
    if (!keyword) return NextResponse.json({ success: true, data: [] });

    const { env } = await getCloudflareContext();
    const members = await searchOrgMembers(env.DB, orgId, userId, keyword);
    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
