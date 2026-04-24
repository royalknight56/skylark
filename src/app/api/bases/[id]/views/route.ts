/**
 * 多维表格 - 视图 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createBaseView, updateBaseView, deleteBaseView } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { BaseViewConfig } from "@/lib/types";

/** POST /api/bases/[id]/views — 新建视图 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      table_id: string;
      name: string;
      type: string;
      config?: BaseViewConfig;
    };
    if (!body.table_id || !body.name || !body.type) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const view = await createBaseView(env.DB, body.table_id, body.name, body.type, body.config);
    return NextResponse.json({ success: true, data: view }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/bases/[id]/views — 更新视图 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { view_id: string; name?: string; config?: BaseViewConfig };
    if (!body.view_id) return NextResponse.json({ success: false, error: "缺少 view_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    await updateBaseView(env.DB, body.view_id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/bases/[id]/views — 删除视图 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { view_id: string };
    if (!body.view_id) return NextResponse.json({ success: false, error: "缺少 view_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    await deleteBaseView(env.DB, body.view_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
