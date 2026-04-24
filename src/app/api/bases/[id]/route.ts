/**
 * 多维表格 API - 单个表格的 CRUD
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBase, updateBase, deleteBase, getBaseTables, getBaseFields, getBaseViews, getBaseRecords } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/bases/[id] — 获取多维表格详情（含数据表、字段、视图） */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const base = await getBase(env.DB, id);
    if (!base) return NextResponse.json({ success: false, error: "表格不存在" }, { status: 404 });

    // 获取所有数据表及其字段和视图
    const tables = await getBaseTables(env.DB, id);
    const tablesWithDetails = await Promise.all(
      tables.map(async (table) => {
        const [fields, views, records] = await Promise.all([
          getBaseFields(env.DB, table.id),
          getBaseViews(env.DB, table.id),
          getBaseRecords(env.DB, table.id),
        ]);
        return { ...table, fields, views, records };
      })
    );

    return NextResponse.json({ success: true, data: { ...base, tables: tablesWithDetails } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/bases/[id] — 更新多维表格信息 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json()) as { name?: string; description?: string; icon?: string };

    const { env } = await getCloudflareContext();
    await updateBase(env.DB, id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/bases/[id] — 删除多维表格 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    await deleteBase(env.DB, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
