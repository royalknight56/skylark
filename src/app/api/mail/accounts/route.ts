/**
 * 邮箱账号 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { getUserMailAccounts } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/mail/accounts - 获取当前用户邮箱账号 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id") || undefined;
    const { env } = await getCloudflareContext();
    const accounts = await getUserMailAccounts(env.DB, userId, orgId);
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
