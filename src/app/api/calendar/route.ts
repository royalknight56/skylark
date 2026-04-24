/**
 * 日历 API - 事件管理（企业隔离）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCalendarEvents, createCalendarEvent, checkRoomConflict } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


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
      org_id: string; title: string; description?: string; location?: string;
      start_time: string; end_time: string;
      all_day?: boolean; color?: string; attendee_ids?: string[];
      room_id?: string;
      recurrence_rule?: string; recurrence_end?: string;
      reminder_minutes?: number; visibility?: string;
      optional_ids?: string[];
    };

    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    // 会议室冲突检测
    if (body.room_id) {
      const conflict = await checkRoomConflict(env.DB, body.room_id, body.start_time, body.end_time);
      if (conflict) {
        return NextResponse.json({
          success: false,
          error: "该会议室在此时段已被预订",
          conflict: { event_id: conflict.id, title: conflict.title, start_time: conflict.start_time, end_time: conflict.end_time },
        }, { status: 409 });
      }
    }

    const id = `evt-${Date.now().toString(36)}`;
    const event = await createCalendarEvent(env.DB, {
      id,
      org_id: body.org_id,
      title: body.title,
      description: body.description,
      location: body.location,
      start_time: body.start_time,
      end_time: body.end_time,
      all_day: body.all_day,
      color: body.color,
      creator_id: userId,
      attendee_ids: body.attendee_ids || [userId],
      room_id: body.room_id,
      recurrence_rule: body.recurrence_rule,
      recurrence_end: body.recurrence_end,
      reminder_minutes: body.reminder_minutes,
      visibility: body.visibility,
      optional_ids: body.optional_ids,
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
