/**
 * 消息已读用户列表 API — 查询谁已读了某条消息
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getMessageReaders, getMessageReadCount } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/conversations/[id]/messages/[msgId]/readers
 * 返回 { readers: MessageReadInfo[], read_count: number }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { msgId } = await params;
    const { env } = await getCloudflareContext();

    const [readers, readCount] = await Promise.all([
      getMessageReaders(env.DB, msgId),
      getMessageReadCount(env.DB, msgId),
    ]);

    return NextResponse.json({
      success: true,
      data: { readers, read_count: readCount },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
