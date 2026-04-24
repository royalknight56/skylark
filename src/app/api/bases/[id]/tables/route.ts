/**
 * 多维表格 - 数据表 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createBaseTable, renameBaseTable, deleteBaseTable } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/bases/[id]/tables — 新建数据表 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json()) as { name: string };
    if (!body.name) return NextResponse.json({ success: false, error: "缺少表名" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const table = await createBaseTable(env.DB, id, body.name);
    return NextResponse.json({ success: true, data: table }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/bases/[id]/tables — 重命名 / 删除数据表 */
export async function PUT(
  request: NextRequest,
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { table_id: string; name?: string; action?: 'delete' };

    const { env } = await getCloudflareContext();
    if (body.action === 'delete') {
      await deleteBaseTable(env.DB, body.table_id);
    } else if (body.name) {
      await renameBaseTable(env.DB, body.table_id, body.name);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
