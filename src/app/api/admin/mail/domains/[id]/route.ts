/**
 * 管理后台 - 企业邮箱域名更新 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId, requireAdmin } from "@/lib/auth";
import { createAdminLog } from "@/lib/db/queries";
import { getMailDomains, updateMailDomain } from "@/lib/mail";
import type { MailDomainStatus } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUS: MailDomainStatus[] = ["pending", "active", "disabled"];

/** PATCH /api/admin/mail/domains/[id] - 更新域名 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as {
      org_id?: string;
      status?: MailDomainStatus;
      routing_enabled?: boolean;
    };
    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });
    if (body.status && !VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ success: false, error: "域名状态不合法" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, body.org_id, userId, "mail");
    if (!role) return NextResponse.json({ success: false, error: "无企业邮箱管理权限" }, { status: 403 });

    const exists = (await getMailDomains(env.DB, body.org_id)).some((item) => item.id === id);
    if (!exists) return NextResponse.json({ success: false, error: "邮箱域名不存在" }, { status: 404 });

    const updated = await updateMailDomain(env.DB, id, {
      status: body.status,
      routing_enabled: body.routing_enabled,
    });
    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "update_mail_domain",
      target_type: "mail_domain",
      target_id: id,
      detail: `更新企业邮箱域名: ${updated?.domain || id}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
