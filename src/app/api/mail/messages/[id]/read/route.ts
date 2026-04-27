/**
 * 邮件已读 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { getUserMailAccount, getUserMailAccounts, markMailMessageRead } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/mail/messages/[id]/read - 标记邮件已读 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const accountId = request.nextUrl.searchParams.get("account_id");
    const account = accountId
      ? await getUserMailAccount(env.DB, userId, accountId)
      : (await getUserMailAccounts(env.DB, userId))[0] || null;
    if (!account) return NextResponse.json({ success: false, error: "邮箱账号不存在" }, { status: 404 });

    await markMailMessageRead(env.DB, account.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
