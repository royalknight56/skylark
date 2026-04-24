/**
 * 管理后台 - 会议室管理 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getMeetingRooms, getMeetingRoom,
  createMeetingRoom, updateMeetingRoom, deleteMeetingRoom,
  createAdminLog,
} from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/rooms?org_id= — 列出企业所有会议室 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const rooms = await getMeetingRooms(env.DB, orgId);
    return NextResponse.json({ success: true, data: rooms });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/rooms — 创建会议室 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string; name: string; building: string; floor?: string;
      room_number: string; capacity?: number; facilities?: string[];
    };
    if (!body.org_id || !body.name || !body.building || !body.room_number) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const room = await createMeetingRoom(env.DB, body);

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`, org_id: body.org_id,
      operator_id: userId, action: "create_room",
      target_type: "room", target_id: room.id,
      detail: `创建会议室: ${body.building} ${body.room_number} ${body.name}`,
    });

    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/rooms — 更新会议室 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as {
      org_id: string; room_id: string;
      name?: string; building?: string; floor?: string;
      room_number?: string; capacity?: number;
      facilities?: string[]; status?: string;
    };
    if (!body.org_id || !body.room_id) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const existing = await getMeetingRoom(env.DB, body.room_id);
    if (!existing || existing.org_id !== body.org_id) {
      return NextResponse.json({ success: false, error: "会议室不存在" }, { status: 404 });
    }

    await updateMeetingRoom(env.DB, body.room_id, body);

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`, org_id: body.org_id,
      operator_id: userId, action: "update_room",
      target_type: "room", target_id: body.room_id,
      detail: `更新会议室: ${existing.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/rooms?org_id=&room_id= — 删除会议室 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    const roomId = request.nextUrl.searchParams.get("room_id");
    if (!orgId || !roomId) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const existing = await getMeetingRoom(env.DB, roomId);
    if (!existing || existing.org_id !== orgId) {
      return NextResponse.json({ success: false, error: "会议室不存在" }, { status: 404 });
    }

    await deleteMeetingRoom(env.DB, roomId);

    await createAdminLog(env.DB, {
      id: `log-${Date.now().toString(36)}`, org_id: orgId,
      operator_id: userId, action: "delete_room",
      target_type: "room", target_id: roomId,
      detail: `删除会议室: ${existing.building} ${existing.room_number} ${existing.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
