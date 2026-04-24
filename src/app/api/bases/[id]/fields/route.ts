/**
 * 多维表格 - 字段 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createBaseField, updateBaseField, deleteBaseField } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { BaseFieldOptions } from "@/lib/types";

/** POST /api/bases/[id]/fields — 新建字段 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      table_id: string;
      name: string;
      type: string;
      options?: BaseFieldOptions;
    };
    if (!body.table_id || !body.name || !body.type) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const field = await createBaseField(env.DB, body.table_id, body.name, body.type, body.options);
    return NextResponse.json({ success: true, data: field }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/bases/[id]/fields — 更新字段 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      field_id: string;
      name?: string;
      type?: string;
      options?: BaseFieldOptions;
    };
    if (!body.field_id) return NextResponse.json({ success: false, error: "缺少 field_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    await updateBaseField(env.DB, body.field_id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/bases/[id]/fields — 删除字段 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { field_id: string; table_id: string };
    if (!body.field_id || !body.table_id) {
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    await deleteBaseField(env.DB, body.field_id, body.table_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
