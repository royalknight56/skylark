/**
 * 管理后台 - 加入审批
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getJoinRequests, reviewJoinRequest, joinOrganization, createAdminLog } from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/admin/join-requests?org_id= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const requests = await getJoinRequests(env.DB, orgId, status);
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/join-requests — 审批 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      request_id: string;
      approved: boolean;
    };

    if (!body.org_id || !body.request_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    await reviewJoinRequest(env.DB, body.request_id, userId, body.approved);

    // 审批通过 → 真正加入企业
    if (body.approved) {
      const req = await env.DB
        .prepare("SELECT user_id FROM join_requests WHERE id = ?")
        .bind(body.request_id)
        .first<{ user_id: string }>();

      if (req) {
        await joinOrganization(env.DB, body.org_id, req.user_id);
      }
    }

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: body.approved ? "approve_join" : "reject_join",
      target_type: "join_request",
      target_id: body.request_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
