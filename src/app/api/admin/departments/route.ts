/**
 * 管理后台 - 部门管理
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, createAdminLog } from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/admin/departments?org_id= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const departments = await getDepartments(env.DB, orgId);
    return NextResponse.json({ success: true, data: departments });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/departments — 创建部门 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; name: string; parent_id?: string; leader_id?: string };
    if (!body.org_id || !body.name) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const id = `dept-${Date.now().toString(36)}`;
    const dept = await createDepartment(env.DB, {
      id, org_id: body.org_id, name: body.name,
      parent_id: body.parent_id, leader_id: body.leader_id,
    });

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "create_department",
      target_type: "department",
      target_id: id,
      detail: `创建部门「${body.name}」`,
    });

    return NextResponse.json({ success: true, data: dept }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/departments — 编辑部门 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; dept_id: string; name: string; leader_id?: string | null };
    if (!body.org_id || !body.dept_id || !body.name) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    await updateDepartment(env.DB, body.dept_id, body.name, body.leader_id);

    const changes: string[] = [`部门更名为「${body.name}」`];
    if (body.leader_id !== undefined) {
      changes.push(body.leader_id ? '设置负责人' : '清除负责人');
    }

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "update_department",
      target_type: "department",
      target_id: body.dept_id,
      detail: changes.join('；'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/departments — 删除部门 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; dept_id: string };
    if (!body.org_id || !body.dept_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    await deleteDepartment(env.DB, body.dept_id);

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "delete_department",
      target_type: "department",
      target_id: body.dept_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
