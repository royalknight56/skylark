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

    const [
      userCount,
      orgCount,
      feedbackCount,
      openFeedbackCount,
      feedbackByStatus,
      feedbackByType,
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
        recent_feedback: recentFeedback.results || [],
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
