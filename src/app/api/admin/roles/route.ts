/**
 * 管理后台 - 管理员角色 CRUD + 成员管理
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getAdminRoles, getAdminRole, createAdminRole, updateAdminRole, deleteAdminRole,
  getAdminRoleMembers, addAdminRoleMember, removeAdminRoleMember,
  createAdminLog, getUserAdminPermissions,
} from "@/lib/db/queries";
import { getRequestUserId, requireAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/roles?org_id= 获取角色列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, orgId, userId, "roles");
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 查询单个角色详情（含成员列表）
    const roleId = request.nextUrl.searchParams.get("role_id");
    if (roleId) {
      const adminRole = await getAdminRole(env.DB, roleId);
      if (!adminRole || adminRole.org_id !== orgId) {
        return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
      }
      const members = await getAdminRoleMembers(env.DB, roleId);
      return NextResponse.json({ success: true, data: { ...adminRole, members } });
    }

    const roles = await getAdminRoles(env.DB, orgId);
    return NextResponse.json({ success: true, data: roles });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

/** POST /api/admin/roles — 创建角色 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json();
    const { org_id, name, description, parent_role_id, permissions, can_delegate } = body as {
      org_id: string;
      name: string;
      description?: string;
      parent_role_id?: string;
      permissions: string[];
      can_delegate?: boolean;
    };

    if (!org_id || !name?.trim()) {
      return NextResponse.json({ success: false, error: "缺少必填字段" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, org_id, userId, "roles");
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 如果指定了上级角色，确保子角色权限不超过上级
    if (parent_role_id) {
      const parent = await getAdminRole(env.DB, parent_role_id);
      if (!parent || parent.org_id !== org_id) {
        return NextResponse.json({ success: false, error: "上级角色不存在" }, { status: 400 });
      }
      const invalid = permissions.filter((p: string) => !parent.permissions.includes(p as never));
      if (invalid.length > 0) {
        return NextResponse.json({ success: false, error: `权限超出上级角色范围: ${invalid.join(', ')}` }, { status: 400 });
      }
    }

    // admin（非 owner）只能分配自己拥有的权限
    if (role === "admin") {
      const myPerms = await getUserAdminPermissions(env.DB, org_id, userId);
      const invalid = permissions.filter((p: string) => !myPerms.includes(p));
      if (invalid.length > 0) {
        return NextResponse.json({ success: false, error: `无法分配自己没有的权限: ${invalid.join(', ')}` }, { status: 400 });
      }
    }

    const newRole = await createAdminRole(env.DB, {
      id: `ar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      org_id,
      name: name.trim(),
      description: description?.trim(),
      parent_role_id,
      permissions,
      can_delegate,
    });

    await createAdminLog(env.DB, {
      id: crypto.randomUUID(), org_id, operator_id: userId,
      action: "create_admin_role",
      detail: `创建管理员角色「${name}」，权限: ${permissions.join(', ')}`,
    });

    return NextResponse.json({ success: true, data: newRole });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

/** PUT /api/admin/roles — 更新角色信息/权限 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json();
    const { org_id, role_id, name, description, permissions, can_delegate } = body as {
      org_id: string;
      role_id: string;
      name?: string;
      description?: string | null;
      permissions?: string[];
      can_delegate?: boolean;
    };

    if (!org_id || !role_id) {
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, org_id, userId, "roles");
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const existing = await getAdminRole(env.DB, role_id);
    if (!existing || existing.org_id !== org_id) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }

    const updated = await updateAdminRole(env.DB, role_id, {
      name: name?.trim(),
      description,
      permissions,
      can_delegate,
    });

    await createAdminLog(env.DB, {
      id: crypto.randomUUID(), org_id, operator_id: userId,
      action: "update_admin_role",
      detail: `修改管理员角色「${existing.name}」`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/admin/roles — 删除角色 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json();
    const { org_id, role_id } = body as { org_id: string; role_id: string };

    if (!org_id || !role_id) {
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, org_id, userId, "roles");
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const existing = await getAdminRole(env.DB, role_id);
    if (!existing || existing.org_id !== org_id) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }

    await deleteAdminRole(env.DB, role_id);

    await createAdminLog(env.DB, {
      id: crypto.randomUUID(), org_id, operator_id: userId,
      action: "delete_admin_role",
      detail: `删除管理员角色「${existing.name}」`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/roles — 管理角色成员
 * body: { org_id, role_id, action: 'add'|'remove', user_id }
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json();
    const { org_id, role_id, action, user_id: targetId } = body as {
      org_id: string;
      role_id: string;
      action: "add" | "remove";
      user_id: string;
    };

    if (!org_id || !role_id || !action || !targetId) {
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireAdmin(env.DB, org_id, userId, "roles");
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const existing = await getAdminRole(env.DB, role_id);
    if (!existing || existing.org_id !== org_id) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }

    if (action === "add") {
      await addAdminRoleMember(env.DB, role_id, targetId);
      await createAdminLog(env.DB, {
        id: crypto.randomUUID(), org_id, operator_id: userId,
        action: "add_admin_role_member",
        detail: `将成员 ${targetId} 添加到角色「${existing.name}」`,
      });
    } else {
      await removeAdminRoleMember(env.DB, role_id, targetId);
      await createAdminLog(env.DB, {
        id: crypto.randomUUID(), org_id, operator_id: userId,
        action: "remove_admin_role_member",
        detail: `将成员 ${targetId} 从角色「${existing.name}」移除`,
      });
    }

    const members = await getAdminRoleMembers(env.DB, role_id);
    return NextResponse.json({ success: true, data: members });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
