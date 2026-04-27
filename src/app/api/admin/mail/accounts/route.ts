/**
 * 管理后台 - 企业邮箱账号 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId, requireAdmin } from "@/lib/auth";
import { createAdminLog } from "@/lib/db/queries";
import {
  createMailAccount,
  generateMailId,
  getMailDomains,
  getOrgMailAccounts,
  normalizeMailAddress,
} from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

function isValidLocalPart(localPart: string): boolean {
  return /^[a-z0-9._-]{1,64}$/.test(localPart);
}

/** GET /api/admin/mail/accounts?org_id= - 邮箱账号列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, orgId, userId, "mail");
    if (!role) return NextResponse.json({ success: false, error: "无企业邮箱管理权限" }, { status: 403 });

    const accounts = await getOrgMailAccounts(env.DB, orgId);
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/mail/accounts - 分配邮箱账号 */
export async function POST(request: NextRequest) {
  try {
    const operatorId = await getRequestUserId();
    if (!operatorId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const body = (await request.json()) as {
      org_id?: string;
      user_id?: string;
      domain_id?: string;
      local_part?: string;
      display_name?: string;
      is_default?: boolean;
    };
    if (!body.org_id || !body.user_id || !body.domain_id || !body.local_part || !body.display_name) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const localPart = body.local_part.trim().toLowerCase();
    if (!isValidLocalPart(localPart)) {
      return NextResponse.json({ success: false, error: "邮箱前缀仅支持小写字母、数字、点、下划线和短横线" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, body.org_id, operatorId, "mail");
    if (!role) return NextResponse.json({ success: false, error: "无企业邮箱管理权限" }, { status: 403 });

    const member = await env.DB
      .prepare("SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ?")
      .bind(body.org_id, body.user_id)
      .first();
    if (!member) return NextResponse.json({ success: false, error: "成员不属于当前企业" }, { status: 400 });

    const domain = (await getMailDomains(env.DB, body.org_id)).find((item) => item.id === body.domain_id);
    if (!domain) return NextResponse.json({ success: false, error: "邮箱域名不存在" }, { status: 404 });
    if (domain.status === "disabled") return NextResponse.json({ success: false, error: "邮箱域名已禁用" }, { status: 400 });

    const address = normalizeMailAddress(`${localPart}@${domain.domain}`);
    const account = await createMailAccount(env.DB, {
      id: generateMailId("mailacc"),
      org_id: body.org_id,
      user_id: body.user_id,
      domain_id: body.domain_id,
      address,
      display_name: body.display_name,
      is_default: body.is_default,
    });

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: operatorId,
      action: "create_mail_account",
      target_type: "mail_account",
      target_id: account.id,
      detail: `分配企业邮箱: ${address}`,
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
