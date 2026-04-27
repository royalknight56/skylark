/**
 * 邮件发送 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { sendMail, type MailSendPayload } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/mail/send - 发送邮件 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as MailSendPayload;
    if (!body.account_id) {
      return NextResponse.json({ success: false, error: "缺少发件邮箱" }, { status: 400 });
    }
    const { env } = await getCloudflareContext();
    const message = await sendMail(env, userId, body);
    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
