/**
 * 管理后台 - 企业邮箱域名 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId, requireAdmin } from "@/lib/auth";
import { createAdminLog } from "@/lib/db/queries";
import { createMailDomain, generateMailId, getMailDomains } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) && !domain.includes("..");
}

/** GET /api/admin/mail/domains?org_id= - 域名列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, orgId, userId, "mail");
    if (!role) return NextResponse.json({ success: false, error: "无企业邮箱管理权限" }, { status: 403 });

    const domains = await getMailDomains(env.DB, orgId);
    return NextResponse.json({ success: true, data: domains });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/mail/domains - 新增域名 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const body = (await request.json()) as { org_id?: string; domain?: string };
    const orgId = body.org_id;
    const domain = normalizeDomain(body.domain || "");
    if (!orgId || !domain) return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    if (!isValidDomain(domain)) return NextResponse.json({ success: false, error: "域名格式不正确" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, orgId, userId, "mail");
    if (!role) return NextResponse.json({ success: false, error: "无企业邮箱管理权限" }, { status: 403 });

    const created = await createMailDomain(env.DB, {
      id: generateMailId("maildom"),
      org_id: orgId,
      domain,
      created_by: userId,
    });
    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: orgId,
      operator_id: userId,
      action: "create_mail_domain",
      target_type: "mail_domain",
      target_id: created.id,
      detail: `新增企业邮箱域名: ${domain}`,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
