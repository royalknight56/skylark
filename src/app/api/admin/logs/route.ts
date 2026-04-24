/**
 * 管理后台 - 操作日志
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAdminLogs } from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/admin/logs?org_id=&page=&page_size= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("page_size") || "20", 10)));
    const offset = (page - 1) * pageSize;

    const { logs, total } = await getAdminLogs(env.DB, orgId, pageSize, offset);

    return NextResponse.json({
      success: true,
      data: logs,
      total,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
