/**
 * Email verification API.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { setAuthCookie } from "@/lib/auth";
import { verifyEmailToken } from "@/lib/email-verification";
import { NextRequest, NextResponse } from "next/server";

interface VerifyEmailRequestBody {
  token?: string;
}

/** POST /api/auth/verify-email - 验证邮箱并登录 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyEmailRequestBody;
    const token = body.token ?? "";
    const { env } = await getCloudflareContext();
    const result = await verifyEmailToken(env.DB, token);

    if (!result.success || !result.user) {
      const message = result.error === "expired"
        ? "验证链接已过期，请重新发送验证邮件"
        : result.error === "used"
          ? "验证链接已失效，请使用最新验证邮件或直接登录"
          : "验证链接无效，请重新发送验证邮件";
      return NextResponse.json(
        { success: false, error: message, verification_error: result.error ?? "invalid" },
        { status: 400 }
      );
    }

    const res = NextResponse.json({ success: true, data: result.user });
    setAuthCookie(res, result.user.id);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
