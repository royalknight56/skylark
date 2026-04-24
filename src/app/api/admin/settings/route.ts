/**
 * 管理后台 - 企业设置
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOrganization, updateOrganization, regenerateInviteCode, createAdminLog } from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/admin/settings?org_id= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const org = await getOrganization(env.DB, orgId);
    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/settings — 编辑企业信息 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      name?: string;
      description?: string;
      logo_url?: string;
      require_approval?: boolean;
      regenerate_invite_code?: boolean;
    };

    if (!body.org_id) {
      return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 重新生成邀请码
    if (body.regenerate_invite_code) {
      const newCode = await regenerateInviteCode(env.DB, body.org_id);
      await createAdminLog(env.DB, {
        id: `log-${Date.now().toString(36)}`,
        org_id: body.org_id,
        operator_id: userId,
        action: "regenerate_invite_code",
        target_type: "organization",
        target_id: body.org_id,
        detail: `新邀请码: ${newCode}`,
      });
    }

    // 更新其他字段
    const org = await updateOrganization(env.DB, body.org_id, {
      name: body.name,
      description: body.description,
      logo_url: body.logo_url,
      require_approval: body.require_approval,
    });

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}-s`,
      org_id: body.org_id,
      operator_id: userId,
      action: "update_settings",
      target_type: "organization",
      target_id: body.org_id,
      detail: "更新企业设置",
    });

    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
