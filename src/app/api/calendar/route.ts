/**
 * 日历 API - 事件管理（企业隔离）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCalendarEvents, createCalendarEvent } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/calendar?org_id=xxx&start=&end= */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const start = searchParams.get("start") || "2026-01-01";
    const end = searchParams.get("end") || "2026-12-31";

    const { env } = await getCloudflareContext();
    const events = await getCalendarEvents(env.DB, orgId, userId, start, end);
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/calendar */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      org_id: string; title: string; description?: string;
      start_time: string; end_time: string;
      all_day?: boolean; color?: string; attendee_ids?: string[];
    };

    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const id = `evt-${Date.now().toString(36)}`;
    const event = await createCalendarEvent(env.DB, {
      id,
      org_id: body.org_id,
      title: body.title,
      description: body.description,
      start_time: body.start_time,
      end_time: body.end_time,
      all_day: body.all_day,
      color: body.color,
      creator_id: userId,
      attendee_ids: body.attendee_ids || [userId],
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
