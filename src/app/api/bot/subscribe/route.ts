/**
 * Bot 开放 API - 订阅/退订会话
 * 通过 Authorization: Bearer <api_token> 鉴权
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getBotByToken,
  getBotSubscriptions,
  subscribeBotToConversation,
  unsubscribeBotFromConversation,
} from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function extractBotToken(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

/** GET /api/bot/subscribe — 获取当前订阅列表 */
export async function GET(request: NextRequest) {
  try {
    const token = extractBotToken(request);
    if (!token) return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const bot = await getBotByToken(env.DB, token);
    if (!bot) return NextResponse.json({ success: false, error: "无效 token" }, { status: 403 });

    const subs = await getBotSubscriptions(env.DB, bot.id);
    return NextResponse.json({ success: true, data: subs });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/bot/subscribe — 订阅会话 { conversation_id } */
export async function POST(request: NextRequest) {
  try {
    const token = extractBotToken(request);
    if (!token) return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const bot = await getBotByToken(env.DB, token);
    if (!bot) return NextResponse.json({ success: false, error: "无效 token" }, { status: 403 });

    const body = (await request.json()) as { conversation_id: string };
    if (!body.conversation_id) {
      return NextResponse.json({ success: false, error: "缺少 conversation_id" }, { status: 400 });
    }

    // 验证会话属于同一企业
    const conv = await env.DB
      .prepare("SELECT id, org_id FROM conversations WHERE id = ?")
      .bind(body.conversation_id)
      .first<{ id: string; org_id: string }>();
    if (!conv || conv.org_id !== bot.org_id) {
      return NextResponse.json({ success: false, error: "会话不存在或不属于该企业" }, { status: 404 });
    }

    await subscribeBotToConversation(env.DB, bot.id, body.conversation_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/bot/subscribe?conversation_id= — 取消订阅 */
export async function DELETE(request: NextRequest) {
  try {
    const token = extractBotToken(request);
    if (!token) return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const bot = await getBotByToken(env.DB, token);
    if (!bot) return NextResponse.json({ success: false, error: "无效 token" }, { status: 403 });

    const convId = request.nextUrl.searchParams.get("conversation_id");
    if (!convId) {
      return NextResponse.json({ success: false, error: "缺少 conversation_id" }, { status: 400 });
    }

    await unsubscribeBotFromConversation(env.DB, bot.id, convId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
