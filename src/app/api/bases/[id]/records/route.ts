/**
 * 多维表格 - 记录 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBaseRecords, createBaseRecord, updateBaseRecord, deleteBaseRecord, deleteBaseRecords } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/bases/[id]/records?table_id=xxx — 获取记录列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const tableId = request.nextUrl.searchParams.get("table_id");
    if (!tableId) return NextResponse.json({ success: false, error: "缺少 table_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const records = await getBaseRecords(env.DB, tableId);
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/bases/[id]/records — 新建记录 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { table_id: string; data?: Record<string, unknown> };
    if (!body.table_id) return NextResponse.json({ success: false, error: "缺少 table_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const record = await createBaseRecord(env.DB, body.table_id, body.data || {}, userId);
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/bases/[id]/records — 更新记录 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { record_id: string; data: Record<string, unknown> };
    if (!body.record_id) return NextResponse.json({ success: false, error: "缺少 record_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    await updateBaseRecord(env.DB, body.record_id, body.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/bases/[id]/records — 删除记录（支持批量） */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { record_id?: string; record_ids?: string[] };

    const { env } = await getCloudflareContext();
    if (body.record_ids && body.record_ids.length > 0) {
      await deleteBaseRecords(env.DB, body.record_ids);
    } else if (body.record_id) {
      await deleteBaseRecord(env.DB, body.record_id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
