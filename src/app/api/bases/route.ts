/**
 * 多维表格 API - 列表 / 新建
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBases, createBase } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/bases?org_id=xxx — 获取企业下所有多维表格 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const bases = await getBases(env.DB, orgId);
    return NextResponse.json({ success: true, data: bases });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/bases — 新建多维表格 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; name: string; description?: string };
    if (!body.org_id || !body.name) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const base = await createBase(env.DB, body.org_id, userId, body.name, body.description);
    return NextResponse.json({ success: true, data: base }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
