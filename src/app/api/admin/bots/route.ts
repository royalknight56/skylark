/**
 * 管理后台 - 机器人管理
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getBots,
  getBot,
  createBot,
  updateBot,
  deleteBot,
  regenerateBotToken,
  createAdminLog,
} from "@/lib/db/queries";
import { getRequestUserId, requireOwner } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/admin/bots?org_id= — 列出企业所有机器人 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const bots = await getBots(env.DB, orgId);
    return NextResponse.json({ success: true, data: bots });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/bots — 创建机器人 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json() as { org_id: string; name: string; description?: string; webhook_url?: string };
    if (!body.org_id || !body.name) {
      return NextResponse.json({ success: false, error: "缺少必要参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const bot = await createBot(env.DB, {
      id: botId,
      org_id: body.org_id,
      name: body.name,
      description: body.description,
      webhook_url: body.webhook_url,
      created_by: userId,
    });

    await createAdminLog(env.DB, { id: `log-${Date.now().toString(36)}`, org_id: body.org_id, operator_id: userId, action: "create_bot", target_type: "bot", target_id: botId, detail: `创建机器人: ${body.name}` });

    return NextResponse.json({ success: true, data: bot });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/admin/bots — 更新机器人 / 重置 token */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = await request.json() as {
      org_id: string;
      bot_id: string;
      action?: "regenerate_token";
      name?: string;
      description?: string;
      avatar_url?: string;
      webhook_url?: string;
      status?: string;
    };
    if (!body.org_id || !body.bot_id) {
      return NextResponse.json({ success: false, error: "缺少必要参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, body.org_id, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    // 验证机器人归属
    const existing = await getBot(env.DB, body.bot_id);
    if (!existing || existing.org_id !== body.org_id) {
      return NextResponse.json({ success: false, error: "机器人不存在" }, { status: 404 });
    }

    // 重新生成 token
    if (body.action === "regenerate_token") {
      const newToken = await regenerateBotToken(env.DB, body.bot_id);
      await createAdminLog(env.DB, { id: `log-${Date.now().toString(36)}`, org_id: body.org_id, operator_id: userId, action: "regenerate_bot_token", target_type: "bot", target_id: body.bot_id, detail: `重置机器人 token: ${existing.name}` });
      return NextResponse.json({ success: true, data: { api_token: newToken } });
    }

    const updated = await updateBot(env.DB, body.bot_id, {
      name: body.name,
      description: body.description,
      avatar_url: body.avatar_url,
      webhook_url: body.webhook_url,
      status: body.status,
    });

    await createAdminLog(env.DB, { id: `log-${Date.now().toString(36)}`, org_id: body.org_id, operator_id: userId, action: "update_bot", target_type: "bot", target_id: body.bot_id, detail: `更新机器人: ${updated?.name}` });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/admin/bots?org_id=&bot_id= — 删除机器人 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    const botId = request.nextUrl.searchParams.get("bot_id");
    if (!orgId || !botId) {
      return NextResponse.json({ success: false, error: "缺少必要参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const role = await requireOwner(env.DB, orgId, userId);
    if (!role) return NextResponse.json({ success: false, error: "无管理权限" }, { status: 403 });

    const existing = await getBot(env.DB, botId);
    if (!existing || existing.org_id !== orgId) {
      return NextResponse.json({ success: false, error: "机器人不存在" }, { status: 404 });
    }

    await deleteBot(env.DB, botId);
    await createAdminLog(env.DB, { id: `log-${Date.now().toString(36)}`, org_id: orgId, operator_id: userId, action: "delete_bot", target_type: "bot", target_id: botId, detail: `删除机器人: ${existing.name}` });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
