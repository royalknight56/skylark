/**
 * 会议室公开 API - 企业成员查看可用会议室 + 查询空闲
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAvailableRooms, getRoomBookings } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/rooms?org_id=xxx&start=&end= — 获取可用会议室列表（可选查询时段占用情况） */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    const { env } = await getCloudflareContext();
    const rooms = await getAvailableRooms(env.DB, orgId);

    // 如果提供了时间范围，返回每个会议室在该时段的预订情况
    if (start && end) {
      const roomsWithBookings = await Promise.all(
        rooms.map(async (room) => {
          const bookings = await getRoomBookings(env.DB, room.id, start, end);
          return { ...room, bookings };
        })
      );
      return NextResponse.json({ success: true, data: roomsWithBookings });
    }

    return NextResponse.json({ success: true, data: rooms });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
