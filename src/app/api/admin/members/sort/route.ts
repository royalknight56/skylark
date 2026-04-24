/**
 * 管理后台 - 成员排序（置顶 / 取消置顶 / 批量排序）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { pinMember, unpinMember, batchUpdateSortOrder, createAdminLog } from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/admin/members/sort
 * body: { org_id, action, user_id?, orders? }
 *   action = 'pin'   → 置顶 user_id
 *   action = 'unpin' → 取消置顶 user_id
 *   action = 'batch' → 批量设置排序 orders: {user_id, sort_order}[]
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json();
    const { org_id, action, user_id: targetId, orders } = body as {
      org_id: string;
      action: "pin" | "unpin" | "batch";
      user_id?: string;
      orders?: { user_id: string; sort_order: number }[];
    };

    if (!org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    if (action === "pin") {
      if (!targetId) return NextResponse.json({ success: false, error: "缺少 user_id" }, { status: 400 });
      const newOrder = await pinMember(env.DB, org_id, targetId);
      await createAdminLog(env.DB, {
        id: crypto.randomUUID(), org_id, operator_id: userId,
        action: "pin_member", detail: `置顶成员 ${targetId}，排序值 ${newOrder}`,
      });
      return NextResponse.json({ success: true, sort_order: newOrder });
    }

    if (action === "unpin") {
      if (!targetId) return NextResponse.json({ success: false, error: "缺少 user_id" }, { status: 400 });
      await unpinMember(env.DB, org_id, targetId);
      await createAdminLog(env.DB, {
        id: crypto.randomUUID(), org_id, operator_id: userId,
        action: "unpin_member", detail: `取消置顶成员 ${targetId}`,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "batch") {
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return NextResponse.json({ success: false, error: "缺少 orders" }, { status: 400 });
      }
      await batchUpdateSortOrder(env.DB, org_id, orders);
      await createAdminLog(env.DB, {
        id: crypto.randomUUID(), org_id, operator_id: userId,
        action: "reorder_members", detail: `批量调整 ${orders.length} 位成员排序`,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "无效的 action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
