/**
 * 管理后台 - 人员类型管理
 * CRUD + 启停用 + 设置默认 + 批量新增
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getEmployeeTypes, createEmployeeType, batchCreateEmployeeTypes,
  toggleEmployeeType, setDefaultEmployeeType, deleteEmployeeType,
  createAdminLog,
} from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/employee-types?org_id= — 获取全部人员类型 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const types = await getEmployeeTypes(env.DB, orgId);
    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/employee-types — 新增人员类型（支持批量） */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      names?: string[];
      name?: string;
    };
    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 检查名称重复
    const existing = await getEmployeeTypes(env.DB, body.org_id);
    const existingNames = new Set(existing.map((t) => t.name));

    if (body.names && body.names.length > 0) {
      const validNames = body.names
        .map((n) => n.trim())
        .filter((n) => n && !existingNames.has(n));
      if (validNames.length === 0) {
        return NextResponse.json({ success: false, error: "所有名称已存在" }, { status: 400 });
      }
      const created = await batchCreateEmployeeTypes(env.DB, body.org_id, validNames);
      await createAdminLog(env.DB, {
        id: `log-${Date.now().toString(36)}`,
        org_id: body.org_id,
        operator_id: userId,
        action: "create_employee_types",
        target_type: "employee_type",
        detail: `批量新增：${validNames.join(", ")}`,
      });
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "名称不能为空" }, { status: 400 });
    }
    if (existingNames.has(body.name.trim())) {
      return NextResponse.json({ success: false, error: "该名称已存在" }, { status: 400 });
    }

    const id = `et-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const created = await createEmployeeType(env.DB, id, body.org_id, body.name.trim());
    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "create_employee_type",
      target_type: "employee_type",
      target_id: id,
      detail: `新增：${body.name.trim()}`,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/employee-types — 启停用 / 设置默认 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      type_id: string;
      action: "toggle" | "set_default";
      is_active?: boolean;
    };
    if (!body.org_id || !body.type_id || !body.action) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    if (body.action === "toggle") {
      await toggleEmployeeType(env.DB, body.type_id, body.is_active ?? true);
      await createAdminLog(env.DB, {
        id: `log-${Date.now().toString(36)}`,
        org_id: body.org_id,
        operator_id: userId,
        action: body.is_active ? "enable_employee_type" : "disable_employee_type",
        target_type: "employee_type",
        target_id: body.type_id,
      });
    } else if (body.action === "set_default") {
      await setDefaultEmployeeType(env.DB, body.org_id, body.type_id);
      await createAdminLog(env.DB, {
        id: `log-${Date.now().toString(36)}`,
        org_id: body.org_id,
        operator_id: userId,
        action: "set_default_employee_type",
        target_type: "employee_type",
        target_id: body.type_id,
      });
    }

    const types = await getEmployeeTypes(env.DB, body.org_id);
    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/employee-types — 删除自定义人员类型 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; type_id: string };
    if (!body.org_id || !body.type_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const result = await deleteEmployeeType(env.DB, body.org_id, body.type_id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "delete_employee_type",
      target_type: "employee_type",
      target_id: body.type_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
