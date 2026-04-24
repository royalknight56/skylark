/**
 * 机器人会话 API
 * POST: 创建或获取与机器人的对话（get-or-create）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { findBotConversation, createBotConversation, getBot } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/conversations/bot — 创建/获取与机器人的会话 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string; bot_id: string };
    if (!body.org_id || !body.bot_id) {
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();

    // 验证机器人存在且活跃
    const bot = await getBot(env.DB, body.bot_id);
    if (!bot || bot.org_id !== body.org_id || bot.status !== "active") {
      return NextResponse.json({ success: false, error: "机器人不存在或已停用" }, { status: 404 });
    }

    // 查找已有会话
    const existingId = await findBotConversation(env.DB, body.org_id, userId, body.bot_id);
    if (existingId) {
      return NextResponse.json({ success: true, data: { id: existingId, created: false } });
    }

    // 创建新会话
    const conversation = await createBotConversation(env.DB, body.org_id, userId, {
      id: bot.id,
      name: bot.name,
      avatar_url: bot.avatar_url,
    });

    return NextResponse.json({
      success: true,
      data: { id: conversation.id, created: true },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
