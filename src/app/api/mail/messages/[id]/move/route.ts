/**
 * 邮件移动 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { getUserMailAccount, getUserMailAccounts, moveMailMessage } from "@/lib/mail";
import type { MailFolder } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const VALID_FOLDERS: MailFolder[] = ["inbox", "sent", "draft", "archive", "trash"];

/** POST /api/mail/messages/[id]/move - 移动邮件 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const body = (await request.json()) as { account_id?: string; folder?: MailFolder };
    if (!body.folder || !VALID_FOLDERS.includes(body.folder)) {
      return NextResponse.json({ success: false, error: "目标文件夹不合法" }, { status: 400 });
    }

    const { id } = await params;
    const { env } = await getCloudflareContext();
    const account = body.account_id
      ? await getUserMailAccount(env.DB, userId, body.account_id)
      : (await getUserMailAccounts(env.DB, userId))[0] || null;
    if (!account) return NextResponse.json({ success: false, error: "邮箱账号不存在" }, { status: 404 });

    await moveMailMessage(env.DB, account.id, id, body.folder);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
