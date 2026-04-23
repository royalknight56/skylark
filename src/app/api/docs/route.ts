/**
 * 云文档 API - 文档列表 / 创建文档（企业隔离）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDocuments, createDocument } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/docs?org_id=xxx */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const docs = await getDocuments(env.DB, orgId, userId);
    return NextResponse.json({ success: true, data: docs });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/docs */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      org_id: string; title?: string; type?: string; content?: string;
    };

    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const id = `doc-${Date.now().toString(36)}`;
    const doc = await createDocument(env.DB, {
      id,
      org_id: body.org_id,
      title: body.title || "无标题文档",
      type: body.type || "doc",
      creator_id: userId,
      content: body.content,
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
