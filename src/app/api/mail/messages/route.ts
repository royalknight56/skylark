/**
 * 邮件列表 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { getUserMailAccount, getUserMailAccounts, listMailMessages } from "@/lib/mail";
import type { MailFolder } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const VALID_FOLDERS: MailFolder[] = ["inbox", "sent", "draft", "archive", "trash"];

/** GET /api/mail/messages - 获取邮件列表 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const folder = (request.nextUrl.searchParams.get("folder") || "inbox") as MailFolder;
    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json({ success: false, error: "邮件文件夹不合法" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const accountId = request.nextUrl.searchParams.get("account_id");
    const account = accountId
      ? await getUserMailAccount(env.DB, userId, accountId)
      : (await getUserMailAccounts(env.DB, userId))[0] || null;
    if (!account) {
      return NextResponse.json({ success: false, error: "邮箱账号不存在" }, { status: 404 });
    }

    const page = Number(request.nextUrl.searchParams.get("page") || "1");
    const messages = await listMailMessages(env.DB, account.id, folder, page);
    return NextResponse.json({ success: true, data: messages, account });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
