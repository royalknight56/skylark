/**
 * 管理后台 - 成员管理
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getOrgMembers, getMemberDetail, updateMemberRole,
  updateMemberInfo, updateUserName, removeMember, createAdminLog,
} from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { OrgMemberRole } from "@/lib/types";


/** GET /api/admin/members?org_id= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const members = await getOrgMembers(env.DB, orgId);
    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/members — 综合编辑成员信息（角色/部门/职位/工号/手机等） */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string;
      target_user_id: string;
      role?: OrgMemberRole;
      name?: string;
      department?: string | null;
      title?: string | null;
      employee_id?: string | null;
      phone?: string | null;
      work_city?: string | null;
      gender?: string | null;
    };

    if (!body.org_id || !body.target_user_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const ownerRole = await requireOwner(env.DB, body.org_id, userId);
    if (!ownerRole) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 不能修改自己（owner）的角色
    if (body.role && body.target_user_id === userId) {
      return NextResponse.json({ success: false, error: "不能修改自己的角色" }, { status: 400 });
    }

    const changes: string[] = [];

    // 角色变更
    if (body.role) {
      await updateMemberRole(env.DB, body.org_id, body.target_user_id, body.role);
      changes.push(`角色→${body.role}`);
    }

    // 姓名变更（写入 users 表）
    if (body.name !== undefined && body.name.trim()) {
      await updateUserName(env.DB, body.target_user_id, body.name.trim());
      changes.push(`姓名→${body.name.trim()}`);
    }

    // org_members 工作信息变更
    const memberFields: Parameters<typeof updateMemberInfo>[3] = {};
    if (body.department !== undefined) memberFields.department = body.department;
    if (body.title !== undefined) memberFields.title = body.title;
    if (body.employee_id !== undefined) memberFields.employee_id = body.employee_id;
    if (body.phone !== undefined) memberFields.phone = body.phone;
    if (body.work_city !== undefined) memberFields.work_city = body.work_city;
    if (body.gender !== undefined) memberFields.gender = body.gender;

    if (Object.keys(memberFields).length > 0) {
      await updateMemberInfo(env.DB, body.org_id, body.target_user_id, memberFields);
      changes.push(`工作信息更新`);
    }

    if (changes.length > 0) {
      await createAdminLog(env.DB, {
        id: `log-${Date.now().toString(36)}`,
        org_id: body.org_id,
        operator_id: userId,
        action: "update_member",
        target_type: "member",
        target_id: body.target_user_id,
        detail: changes.join("; "),
      });
    }

    // 返回更新后的成员详情
    const updated = await getMemberDetail(env.DB, body.org_id, body.target_user_id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/members — 移除成员 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; target_user_id: string };
    if (!body.org_id || !body.target_user_id) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    // 不能移除自己
    if (body.target_user_id === userId) {
      return NextResponse.json({ success: false, error: "不能移除自己" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const ownerRole = await requireOwner(env.DB, body.org_id, userId);
    if (!ownerRole) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    await removeMember(env.DB, body.org_id, body.target_user_id);
    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`,
      org_id: body.org_id,
      operator_id: userId,
      action: "remove_member",
      target_type: "member",
      target_id: body.target_user_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
