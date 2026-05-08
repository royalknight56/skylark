/**
 * 登录 API - 校验邮箱密码并设置登录 Cookie
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getPublicUserById,
  getUserByEmail,
  isValidEmail,
  normalizeEmail,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

/** POST /api/auth/login - 登录已有账号 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "邮箱和密码不能为空" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "邮箱格式不正确" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const userWithPassword = await getUserByEmail(env.DB, email);
    if (!userWithPassword) {
      return NextResponse.json({ success: false, error: "邮箱或密码错误" }, { status: 401 });
    }
    if (!userWithPassword.password_hash) {
      return NextResponse.json({ success: false, error: "该账号尚未设置密码，请重新注册或联系管理员" }, { status: 401 });
    }
    if (!userWithPassword.email_verified_at) {
      return NextResponse.json(
        {
          success: false,
          error: "请先完成邮箱验证",
          needs_verification: true,
          email: userWithPassword.email,
        },
        { status: 403 }
      );
    }

    const passwordMatched = await verifyPassword(password, userWithPassword.password_hash);
    if (!passwordMatched) {
      return NextResponse.json({ success: false, error: "邮箱或密码错误" }, { status: 401 });
    }

    await env.DB
      .prepare("UPDATE users SET status = ? WHERE id = ?")
      .bind("online", userWithPassword.id)
      .run();

    const user = await getPublicUserById(env.DB, userWithPassword.id);
    if (!user) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });
    }

    const res = NextResponse.json({ success: true, data: user });
    setAuthCookie(res, user.id);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
