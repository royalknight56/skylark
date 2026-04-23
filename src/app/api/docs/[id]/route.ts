/**
 * 云文档详情 API - 获取/更新文档
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDocument, updateDocument } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/docs/[id] - 获取文档详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const doc = await getDocument(env.DB, id);

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "文档不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/** PUT /api/docs/[id] - 更新文档内容 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const body = (await request.json()) as { content: string; title?: string };

    await updateDocument(env.DB, id, body.content, body.title);
    const doc = await getDocument(env.DB, id);

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
