/**
 * Resend email verification API.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserByEmail, isValidEmail, normalizeEmail } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email-verification";
import { NextRequest, NextResponse } from "next/server";

interface ResendVerificationRequestBody {
  email?: string;
}

/** POST /api/auth/resend-verification - 重新发送邮箱验证邮件 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResendVerificationRequestBody;
    const email = normalizeEmail(body.email ?? "");

    if (!email) {
      return NextResponse.json({ success: false, error: "邮箱不能为空" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "邮箱格式不正确" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const user = await getUserByEmail(env.DB, email);
    if (!user) {
      return NextResponse.json({ success: false, error: "该邮箱尚未注册" }, { status: 404 });
    }
    if (user.email_verified_at) {
      return NextResponse.json({ success: false, error: "该邮箱已完成验证，请直接登录" }, { status: 409 });
    }

    await sendEmailVerification(env, user, request.nextUrl.origin);
    return NextResponse.json({ success: true, pending_verification: true, email: user.email });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
