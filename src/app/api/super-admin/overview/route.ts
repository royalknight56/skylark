/**
 * 超级管理后台总览 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isSuperAdminConfigured, verifySuperAdminSession } from "@/lib/super-admin";
import { NextRequest, NextResponse } from "next/server";

interface CountRow {
  count: number;
}

interface FeedbackRow {
  id: string;
  org_id: string | null;
  user_id: string;
  type: string;
  title: string;
  content: string;
  contact: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
  org_name: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  login_phone: string | null;
  status: string;
  status_text: string | null;
  current_org_id: string | null;
  created_at: string;
  current_org_name: string | null;
  joined_org_count: number;
}

interface OrganizationRow {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
  active_member_count: number;
  created_at: string;
}

function parsePageParam(request: NextRequest, key: string): number {
  const value = Number.parseInt(request.nextUrl.searchParams.get(key) || "1", 10);
  return Number.isFinite(value) ? Math.max(1, value) : 1;
}

function parsePageSizeParam(request: NextRequest, key: string): number {
  const value = Number.parseInt(request.nextUrl.searchParams.get(key) || "20", 10);
  if (!Number.isFinite(value)) return 20;
  return Math.min(50, Math.max(5, value));
}

/** GET /api/super-admin/overview */
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

    const userPage = parsePageParam(request, "user_page");
    const userPageSize = parsePageSizeParam(request, "user_page_size");
    const userOffset = (userPage - 1) * userPageSize;
    const orgPage = parsePageParam(request, "org_page");
    const orgPageSize = parsePageSizeParam(request, "org_page_size");
    const orgOffset = (orgPage - 1) * orgPageSize;

    const [
      userCount,
      orgCount,
      feedbackCount,
      openFeedbackCount,
      feedbackByStatus,
      feedbackByType,
      recentUsers,
      organizations,
      recentFeedback,
    ] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<CountRow>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM organizations").first<CountRow>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM product_feedback").first<CountRow>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM product_feedback WHERE status = 'open'").first<CountRow>(),
      env.DB.prepare("SELECT status, COUNT(*) AS count FROM product_feedback GROUP BY status ORDER BY count DESC").all(),
      env.DB.prepare("SELECT type, COUNT(*) AS count FROM product_feedback GROUP BY type ORDER BY count DESC").all(),
      env.DB.prepare(`
        SELECT
          u.id, u.email, u.name, u.avatar_url, u.login_phone, u.status,
          u.status_text, u.current_org_id, u.created_at,
          o.name AS current_org_name,
          COUNT(om.org_id) AS joined_org_count
        FROM users u
        LEFT JOIN organizations o ON o.id = u.current_org_id
        LEFT JOIN org_members om ON om.user_id = u.id
          AND om.member_status != 'departed'
        GROUP BY
          u.id, u.email, u.name, u.avatar_url, u.login_phone, u.status,
          u.status_text, u.current_org_id, u.created_at, o.name
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(userPageSize, userOffset).all<UserRow>(),
      env.DB.prepare(`
        SELECT
          o.id, o.name, o.description, o.industry, o.owner_id, o.created_at,
          u.name AS owner_name, u.email AS owner_email,
          COUNT(om.user_id) AS member_count,
          SUM(CASE WHEN om.member_status = 'active' THEN 1 ELSE 0 END) AS active_member_count
        FROM organizations o
        LEFT JOIN users u ON u.id = o.owner_id
        LEFT JOIN org_members om ON om.org_id = o.id
          AND om.member_status != 'departed'
        GROUP BY
          o.id, o.name, o.description, o.industry, o.owner_id, o.created_at,
          u.name, u.email
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(orgPageSize, orgOffset).all<OrganizationRow>(),
      env.DB.prepare(`
        SELECT
          f.id, f.org_id, f.user_id, f.type, f.title, f.content, f.contact,
          f.page_url, f.user_agent, f.status, f.created_at, f.updated_at,
          u.name AS user_name, u.email AS user_email, o.name AS org_name
        FROM product_feedback f
        LEFT JOIN users u ON u.id = f.user_id
        LEFT JOIN organizations o ON o.id = f.org_id
        ORDER BY f.created_at DESC
        LIMIT 100
      `).all<FeedbackRow>(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: userCount?.count || 0,
        organizations: orgCount?.count || 0,
        feedback: feedbackCount?.count || 0,
        open_feedback: openFeedbackCount?.count || 0,
        feedback_by_status: feedbackByStatus.results || [],
        feedback_by_type: feedbackByType.results || [],
        recent_users: recentUsers.results || [],
        users_page: userPage,
        users_page_size: userPageSize,
        users_total: userCount?.count || 0,
        organization_list: organizations.results || [],
        organizations_page: orgPage,
        organizations_page_size: orgPageSize,
        organizations_total: orgCount?.count || 0,
        recent_feedback: recentFeedback.results || [],
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
