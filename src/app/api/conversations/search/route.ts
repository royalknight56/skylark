/**
 * 搜索公开群组 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { searchPublicGroups } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/conversations/search?org_id=xxx&q=keyword */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    const keyword = request.nextUrl.searchParams.get("q") || "";

    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const groups = await searchPublicGroups(env.DB, orgId, keyword);

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
