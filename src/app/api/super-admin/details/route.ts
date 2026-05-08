/**
 * 超级管理后台详情 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isSuperAdminConfigured, verifySuperAdminSession } from "@/lib/super-admin";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/super-admin/details?type=user|organization&id=xxx */
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!isSuperAdminConfigured(env)) {
      return NextResponse.json({ success: false, error: "超级管理后台未配置" }, { status: 503 });
    }

    const authenticated = await verifySuperAdminSession(request, env);
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get("type");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "缺少 ID" }, { status: 400 });

    if (type === "user") {
      const user = await env.DB.prepare(`
        SELECT u.*, o.name AS current_org_name
        FROM users u
        LEFT JOIN organizations o ON o.id = u.current_org_id
        WHERE u.id = ?
      `).bind(id).first();
      if (!user) return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });

      const [orgs, feedback] = await Promise.all([
        env.DB.prepare(`
          SELECT
            om.org_id, o.name AS org_name, om.role, om.department, om.title,
            om.employee_id, om.phone, om.work_city, om.gender, om.employee_type,
            om.member_status, om.suspended_at, om.departed_at, om.joined_at
          FROM org_members om
          JOIN organizations o ON o.id = om.org_id
          WHERE om.user_id = ?
          ORDER BY om.joined_at DESC
        `).bind(id).all(),
        env.DB.prepare(`
          SELECT f.*, o.name AS org_name
          FROM product_feedback f
          LEFT JOIN organizations o ON o.id = f.org_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
          LIMIT 50
        `).bind(id).all(),
      ]);

      return NextResponse.json({ success: true, data: { kind: "user", user, orgs: orgs.results, feedback: feedback.results } });
    }

    if (type === "organization") {
      const organization = await env.DB.prepare(`
        SELECT o.*, u.name AS owner_name, u.email AS owner_email,
          COUNT(om.user_id) AS member_count,
          SUM(CASE WHEN om.member_status = 'active' THEN 1 ELSE 0 END) AS active_member_count
        FROM organizations o
        LEFT JOIN users u ON u.id = o.owner_id
        LEFT JOIN org_members om ON om.org_id = o.id AND om.member_status != 'departed'
        WHERE o.id = ?
        GROUP BY o.id, u.name, u.email
      `).bind(id).first();
      if (!organization) return NextResponse.json({ success: false, error: "企业不存在" }, { status: 404 });

      const [members, feedback] = await Promise.all([
        env.DB.prepare(`
          SELECT
            om.user_id, u.name, u.email, u.login_phone, u.status AS user_status,
            om.role, om.department, om.title, om.employee_id, om.phone,
            om.work_city, om.gender, om.employee_type, om.member_status,
            om.suspended_at, om.departed_at, om.joined_at
          FROM org_members om
          JOIN users u ON u.id = om.user_id
          WHERE om.org_id = ?
          ORDER BY
            CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
            om.joined_at DESC
          LIMIT 200
        `).bind(id).all(),
        env.DB.prepare(`
          SELECT f.*, u.name AS user_name, u.email AS user_email
          FROM product_feedback f
          LEFT JOIN users u ON u.id = f.user_id
          WHERE f.org_id = ?
          ORDER BY f.created_at DESC
          LIMIT 50
        `).bind(id).all(),
      ]);

      return NextResponse.json({
        success: true,
        data: { kind: "organization", organization, members: members.results, feedback: feedback.results },
      });
    }

    return NextResponse.json({ success: false, error: "类型无效" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
