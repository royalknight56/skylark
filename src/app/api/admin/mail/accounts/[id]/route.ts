/**
 * 管理后台 - 企业邮箱账号更新 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId, requireAdmin } from "@/lib/auth";
import { createAdminLog } from "@/lib/db/queries";
import { getOrgMailAccounts, updateMailAccountStatus } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

/** PATCH /api/admin/mail/accounts/[id] - 启用或禁用邮箱账号 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const operatorId = await getRequestUserId();
    if (!operatorId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as { org_id?: string; status?: "active" | "disabled" };
    if (!body.org_id || !body.status) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }
    if (!["active", "disabled"].includes(body.status)) {
      return NextResponse.json({ success: false, error: "账号状态不合法" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, body.org_id, operatorId, "mail");
    if (!role) return NextResponse.json({ success: false, error: "无企业邮箱管理权限" }, { status: 403 });

    const account = (await getOrgMailAccounts(env.DB, body.org_id)).find((item) => item.id === id);
    if (!account) return NextResponse.json({ success: false, error: "邮箱账号不存在" }, { status: 404 });

    await updateMailAccountStatus(env.DB, id, body.status);
    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: operatorId,
      action: "update_mail_account",
      target_type: "mail_account",
      target_id: id,
      detail: `${body.status === "active" ? "启用" : "禁用"}企业邮箱: ${account.address}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
