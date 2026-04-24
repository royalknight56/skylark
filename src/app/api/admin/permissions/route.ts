/**
 * 获取当前用户的管理权限列表
 * owner 返回 '*'（全部权限），admin 返回具体权限点列表
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserAdminPermissions } from "@/lib/db/queries";
import { getRequestUserId, getOrgRole } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/permissions?org_id= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await getOrgRole(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "非企业成员" }, { status: 403 });

    if (role === "owner") {
      return NextResponse.json({ success: true, data: { role: "owner", permissions: ["*"] } });
    }

    if (role === "admin") {
      const permissions = await getUserAdminPermissions(env.DB, orgId, userId);
      return NextResponse.json({ success: true, data: { role: "admin", permissions } });
    }

    return NextResponse.json({ success: true, data: { role: "member", permissions: [] } });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
