/**
 * 云文档详情 API - 获取/更新文档
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDocument, updateDocument, renameDocument, deleteDocument } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


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

/** PATCH /api/docs/[id] - 重命名文档 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const body = (await request.json()) as { title: string };
    if (!body.title?.trim()) return NextResponse.json({ success: false, error: "标题不能为空" }, { status: 400 });

    await renameDocument(env.DB, id, body.title.trim());
    const doc = await getDocument(env.DB, id);
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/docs/[id] - 删除文档 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    await deleteDocument(env.DB, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
