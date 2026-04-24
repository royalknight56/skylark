/**
 * 日历事件详情 API
 * GET: 获取事件详情（含参与者）
 * PUT: 更新事件信息
 * DELETE: 删除事件
 * PATCH: 事件操作（回复邀请/签到/转让）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getCalendarEventDetail, updateCalendarEvent, deleteCalendarEvent,
  respondToEvent, checkInEvent, transferEvent, checkRoomConflict,
} from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/calendar/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const event = await getCalendarEventDetail(env.DB, id);

    if (!event) return NextResponse.json({ success: false, error: "日程不存在" }, { status: 404 });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/calendar/[id] — 更新日程 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();

    const event = await getCalendarEventDetail(env.DB, id);
    if (!event) return NextResponse.json({ success: false, error: "日程不存在" }, { status: 404 });
    if (event.creator_id !== userId) {
      return NextResponse.json({ success: false, error: "仅组织者可编辑日程" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // 会议室变更时检查冲突
    if (body.room_id && body.room_id !== event.room_id) {
      const startTime = (body.start_time as string) || event.start_time;
      const endTime = (body.end_time as string) || event.end_time;
      const conflict = await checkRoomConflict(env.DB, body.room_id as string, startTime, endTime, id);
      if (conflict) {
        return NextResponse.json({ success: false, error: "该会议室在此时段已被预订" }, { status: 409 });
      }
    }

    await updateCalendarEvent(env.DB, id, body as Parameters<typeof updateCalendarEvent>[2]);

    // 更新参与者列表（如果提供）
    if (Array.isArray(body.attendee_ids)) {
      const attendeeIds = body.attendee_ids as string[];
      const optionalIds = new Set((body.optional_ids as string[]) || []);
      // 删除旧的参与者
      await env.DB.prepare('DELETE FROM calendar_attendees WHERE event_id = ?').bind(id).run();
      // 插入新的参与者
      const stmts = attendeeIds.map((uid) =>
        env.DB.prepare('INSERT INTO calendar_attendees (event_id, user_id, status, is_optional) VALUES (?, ?, ?, ?)')
          .bind(id, uid, uid === event.creator_id ? 'accepted' : 'pending', optionalIds.has(uid) ? 1 : 0)
      );
      if (stmts.length > 0) await env.DB.batch(stmts);
    }

    const updated = await getCalendarEventDetail(env.DB, id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/calendar/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();

    const event = await getCalendarEventDetail(env.DB, id);
    if (!event) return NextResponse.json({ success: false, error: "日程不存在" }, { status: 404 });
    if (event.creator_id !== userId) {
      return NextResponse.json({ success: false, error: "仅组织者可删除日程" }, { status: 403 });
    }

    await deleteCalendarEvent(env.DB, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PATCH /api/calendar/[id] — 事件操作 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const body = (await request.json()) as { action: string; [key: string]: unknown };

    switch (body.action) {
      case "respond": {
        const status = body.status as string;
        if (!["accepted", "declined", "tentative"].includes(status)) {
          return NextResponse.json({ success: false, error: "无效的回复状态" }, { status: 400 });
        }
        await respondToEvent(env.DB, id, userId, status as 'accepted' | 'declined' | 'tentative');
        return NextResponse.json({ success: true });
      }

      case "check_in": {
        await checkInEvent(env.DB, id, userId);
        return NextResponse.json({ success: true });
      }

      case "transfer": {
        const event = await getCalendarEventDetail(env.DB, id);
        if (!event) return NextResponse.json({ success: false, error: "日程不存在" }, { status: 404 });
        if (event.creator_id !== userId) {
          return NextResponse.json({ success: false, error: "仅组织者可转让日程" }, { status: 403 });
        }
        const newCreatorId = body.new_creator_id as string;
        if (!newCreatorId) return NextResponse.json({ success: false, error: "缺少 new_creator_id" }, { status: 400 });
        await transferEvent(env.DB, id, newCreatorId);
        return NextResponse.json({ success: true });
      }

      case "leave": {
        const event = await getCalendarEventDetail(env.DB, id);
        if (!event) return NextResponse.json({ success: false, error: "日程不存在" }, { status: 404 });
        if (event.creator_id === userId) {
          return NextResponse.json({ success: false, error: "组织者不能退出，请先转让日程" }, { status: 400 });
        }
        await env.DB.prepare('DELETE FROM calendar_attendees WHERE event_id = ? AND user_id = ?').bind(id, userId).run();
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
