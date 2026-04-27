/**
 * 邮件详情 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { getMailMessage, getUserMailAccount, getUserMailAccounts, moveMailMessage } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

async function resolveAccount(request: NextRequest, userId: string) {
  const { env } = await getCloudflareContext();
  const accountId = request.nextUrl.searchParams.get("account_id");
  const account = accountId
    ? await getUserMailAccount(env.DB, userId, accountId)
    : (await getUserMailAccounts(env.DB, userId))[0] || null;
  return { env, account };
}

/** GET /api/mail/messages/[id] - 获取邮件详情 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { env, account } = await resolveAccount(request, userId);
    if (!account) return NextResponse.json({ success: false, error: "邮箱账号不存在" }, { status: 404 });

    const message = await getMailMessage(env.DB, account.id, id);
    if (!message) return NextResponse.json({ success: false, error: "邮件不存在" }, { status: 404 });
    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/mail/messages/[id] - 移入垃圾箱 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { env, account } = await resolveAccount(request, userId);
    if (!account) return NextResponse.json({ success: false, error: "邮箱账号不存在" }, { status: 404 });

    await moveMailMessage(env.DB, account.id, id, "trash");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
