/**
 * 忙闲查询 API
 * GET /api/calendar/busy?user_ids=a,b,c&start=...&end=...
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserBusySlots } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const userIds = request.nextUrl.searchParams.get("user_ids")?.split(",").filter(Boolean) || [];
    const start = request.nextUrl.searchParams.get("start") || new Date().toISOString();
    const end = request.nextUrl.searchParams.get("end") || new Date(Date.now() + 7 * 86400000).toISOString();

    if (userIds.length === 0) return NextResponse.json({ success: true, data: {} });

    const { env } = await getCloudflareContext();
    const result: Record<string, { start_time: string; end_time: string; title: string }[]> = {};

    for (const uid of userIds.slice(0, 20)) {
      result[uid] = await getUserBusySlots(env.DB, uid, start, end);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
