/**
 * 会话消息 API - 获取消息列表 / 发送消息
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getMessages, createMessage } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/conversations/[id]/messages */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before") || undefined;

    const messages = await getMessages(env.DB, id, limit, before);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/conversations/[id]/messages */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      content: string; type?: string; reply_to?: string;
      file_name?: string; file_size?: number; file_mime?: string; file_r2_key?: string;
    };

    const msgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const message = await createMessage(env.DB, {
      id: msgId,
      conversation_id: id,
      sender_id: userId,
      content: body.content,
      type: body.type || "text",
      reply_to: body.reply_to,
      file_name: body.file_name,
      file_size: body.file_size,
      file_mime: body.file_mime,
      file_r2_key: body.file_r2_key,
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
