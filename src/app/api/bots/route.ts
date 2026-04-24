/**
 * 机器人公开 API - 企业成员可查看活跃机器人列表
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/bots?org_id=xxx — 获取企业下所有激活的机器人（不含敏感信息） */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const result = await env.DB
      .prepare(
        `SELECT b.id, b.org_id, b.name, b.avatar_url, b.description, b.status, b.created_at,
                u.name AS creator_name, u.avatar_url AS creator_avatar
         FROM bots b
         LEFT JOIN users u ON b.created_by = u.id
         WHERE b.org_id = ? AND b.status = 'active'
         ORDER BY b.created_at DESC`
      )
      .bind(orgId)
      .all<{
        id: string; org_id: string; name: string; avatar_url: string | null;
        description: string | null; status: string; created_at: string;
        creator_name: string; creator_avatar: string | null;
      }>();

    const bots = result.results.map((row) => ({
      id: row.id,
      name: row.name,
      avatar_url: row.avatar_url,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      creator: { name: row.creator_name, avatar_url: row.creator_avatar },
    }));

    return NextResponse.json({ success: true, data: bots });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
